// Bond Navigator engine.
//
// For each guarantee it decides the next action: Extend, Reduce, Release or Keep.
//   Performance bonds: forecast the project's finish date from IDEAL progress
//     payments (model trained in model/train_model.py), add the defects period
//     from the contract clause, and check the bond lasts long enough.
//   Advance payment bonds: compare the bond with the advance still unrecovered.
//   Tender bonds: check the public award result.
// Contract clauses are read by a language model in production (shown here as
// pre-extracted text with a confidence score that the contractor confirms).
// Kill switch: if AI is off, only plain expiry-date reminders remain.

(function () {
  const D = window.BN_DATA;
  const M = window.BOND_MODEL;
  const DAY = 86400000;
  const AS_OF = new Date(D.asOf + "T00:00:00");

  const d = (s) => new Date(s + "T00:00:00");
  const months = (a, b) => (b - a) / (DAY * 30.44);
  const addMonths = (date, m) => new Date(date.getTime() + m * 30.44 * DAY);
  const monthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const fmtDate = (date) => date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  const fmtMonth = (date) => date.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
  const fmt = (n) => "S$" + Math.round(n).toLocaleString("en-SG");
  const daysLeft = (g) => Math.round((d(g.expiry) - AS_OF) / DAY);
  const fee = (amount) => amount * D.assumptions.commissionPctPerYear / 100;
  const TYPE = { performance: "Performance bond", advance: "Advance payment bond", tender: "Tender bond" };

  // ---------- Delay forecast (same signals as train_model.py) ----------
  function forecastSignals(g) {
    const start = d(g.start), end = d(g.plannedEnd);
    const duration = months(start, end);
    const elapsed = Math.min(months(start, AS_OF) / duration, 1.2);
    const last = g.payments[g.payments.length - 1];
    const certified = last[1] / 100;
    const gaps = g.payments.slice(1).map((p, i) => (d(p[0]) - d(g.payments[i][0])) / DAY);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 30;
    return {
      duration, certified, avgGap,
      x: {
        gap_months: Math.max(elapsed - certified, 0) * duration,
        payment_delay: Math.min(Math.max((avgGap - 30) / 30, 0), 2),
        elapsed_share: elapsed,
      },
    };
  }

  function forecast(g) {
    const sig = forecastSignals(g);
    let z = M.intercept;
    const contributions = M.features.map((f) => {
      const c = f.weight * sig.x[f.key];
      z += c;
      return { key: f.key, label: f.label, value: sig.x[f.key], contribution: c };
    });
    const delay = Math.max(z, 0);
    const finish = addMonths(d(g.plannedEnd), delay);
    return { ...sig, delay, finish, contributions };
  }

  // ---------- Per-guarantee assessment ----------
  function assess(g, aiEnabled) {
    const left = daysLeft(g);
    const base = { ref: g.ref, left, typeLabel: TYPE[g.type], freed: 0, saving: 0, findings: [] };

    if (!aiEnabled) {
      return left <= 30
        ? { ...base, action: "extend", level: "urgent", title: `Expires in ${left} days`, summary: "Date reminder only. AI is paused, so Bond Navigator cannot tell whether the project is late or whether this bond could be released." }
        : { ...base, action: "keep", level: "ok", title: "No reminder due", summary: "Date reminder only. AI is paused, so release and reduction opportunities are not checked." };
    }
    const add = (type, source, text) => base.findings.push({ type, source, text });

    if (g.type === "performance" && g.completed && g.retentionRelease) {
      add("save", "IDEAL collections", `${fmt(g.retentionRelease.amount)} received on ${fmtDate(d(g.retentionRelease.date))}. ${g.retentionRelease.note}.`);
      add("info", "Contract (AI-read)", `${g.clause.ref}: bond is released when the Final Completion Certificate is issued.`);
      add("save", "Bond Navigator", `Retention is only released at final completion, so this bond is very likely no longer needed. It still has ${left} days to run.`);
      return {
        ...base, action: "release", level: "save", title: "Release now",
        summary: `The project is finished and the retention has been paid out. Ask ${g.beneficiary} to discharge this bond early.`,
        freed: g.amount, saving: fee(g.amount) * Math.max(left, 0) / 365,
      };
    }

    if (g.type === "performance") {
      const f = forecast(g);
      const mustLast = monthEnd(addMonths(f.finish, g.dlpMonths + g.afterDlpMonths));
      const short = d(g.expiry) < mustLast;
      const planned = d(g.plannedEnd);
      add(f.delay >= M.late_from_months ? "concern" : "ok", "IDEAL collections",
        `${Math.round(f.certified * 100)}% of the contract has been paid, but ${Math.round(Math.min(f.x.elapsed_share, 1) * 100)}% of the planned schedule has passed.`);
      if (f.avgGap > 33) add("concern", "IDEAL collections", `Progress payments arrive every ${Math.round(f.avgGap)} days on average, slower than monthly.`);
      add(f.delay >= M.late_from_months ? "concern" : "ok", "Bond Navigator forecast",
        f.delay >= M.late_from_months
          ? `Forecast finish: ${fmtMonth(f.finish)}, about ${Math.round(f.delay)} months after the planned ${fmtMonth(planned)}.`
          : `Forecast finish: on time (${fmtMonth(planned)}).`);
      add("info", "Contract (AI-read)", `${g.clause.ref}: bond must last until ${g.afterDlpMonths} months after the ${g.dlpMonths}-month defects period. So it must last until ${fmtMonth(mustLast)}.`);
      const common = { ...base, forecast: f, mustLast, planned };
      if (short && left <= 90) {
        add("concern", "Bond Navigator", `Bond expires on ${fmtDate(d(g.expiry))}, in ${left} days. If it lapses, the client can demand "extend or pay".`);
        return {
          ...common, action: "extend", level: "urgent", title: `Extend now (${left} days left)`,
          summary: `The project is running late, so this bond must be extended to ${fmtDate(mustLast)} before ${fmtDate(d(g.expiry))}.`,
          newExpiry: mustLast,
        };
      }
      if (short) {
        const planBy = new Date(d(g.expiry).getTime() - 60 * DAY);
        add("ok", "Bond Navigator", `Renewal needed eventually. Bond Navigator will prepare it by ${fmtDate(planBy)}, 60 days before expiry.`);
        return { ...common, action: "keep", level: "ok", title: "On track", summary: `No action now. Renewal to ${fmtMonth(mustLast)} will be prepared by ${fmtDate(planBy)}.`, planBy };
      }
      return { ...common, action: "keep", level: "ok", title: "On track", summary: "Bond already lasts long enough." };
    }

    if (g.type === "advance") {
      const outstanding = g.advancePaid - g.advanceRecovered;
      add("save", "Remittance advices", g.recoveryNote);
      add("info", "Contract (AI-read)", `${g.clause.ref}: the bond can be reduced by the amount of advance recovered.`);
      add("save", "Bond Navigator", `Only ${fmt(outstanding)} of the advance is still unrecovered, but the bond is still ${fmt(g.amount)}.`);
      return {
        ...base, action: "reduce", level: "save", title: `Reduce to ${fmt(outstanding)}`,
        summary: `Ask ${g.beneficiary} to accept a reduction to ${fmt(outstanding)}, the advance still outstanding.`,
        newAmount: outstanding, freed: g.amount - outstanding, saving: fee(g.amount - outstanding),
      };
    }

    if (g.type === "tender") {
      add(g.tender.status === "lost" ? "save" : "info", "GeBIZ (public)", g.tender.notice);
      add("info", "Contract (AI-read)", `${g.clause.ref}: ${g.clause.text}`);
      if (g.tender.status === "lost") {
        add("save", "Bond Navigator", `The tender went to another company, but this bond still has ${left} days to run.`);
        return {
          ...base, action: "release", level: "save", title: "Release now",
          summary: `You did not win this tender. Ask ${g.beneficiary} to return the tender bond.`,
          freed: g.amount, saving: fee(g.amount) * Math.max(left, 0) / 365,
        };
      }
      add("ok", "Bond Navigator", "Tender still open. Bond Navigator checks GeBIZ award notices every week.");
      return { ...base, action: "keep", level: "ok", title: "Tender open", summary: "No action. Bond Navigator will tell you as soon as the tender is awarded." };
    }
    return { ...base, action: "keep", level: "ok", title: "No action", summary: "" };
  }

  window.Bond = { assess, forecast, fmt, fmtDate, fmtMonth, d, AS_OF, daysLeft, TYPE, DAY, addMonths };
})();
