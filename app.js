// Bond Navigator prototype UI. Plain JavaScript, no build step.
// Works on GitHub Pages or by double-clicking index.html.

(function () {
  const D = window.BN_DATA;
  const M = window.BOND_MODEL;
  const B = window.Bond;
  const { fmt, fmtDate, fmtMonth, d } = B;

  const state = {
    view: "bonds",
    aiEnabled: true,
    selected: null,
    type: "all",
    panel: false,      // request form open in the card
    status: {},        // ref -> { kind, tone, text, freeing }
    audit: [],
  };

  const ORDER = { urgent: 0, save: 1, ok: 2 };
  const TYPES = {
    all: { label: "All guarantees" },
    tender: { label: "Tender bonds", watch: "public tender award results on GeBIZ", outcome: "release the bond within days of losing a tender, so your line is free for the next bid" },
    performance: { label: "Performance bonds", watch: "progress payments from the client in IDEAL and the bond clause in your contract", outcome: "extend months before expiry if the project is late, and release when the project is finished" },
    advance: { label: "Advance payment bonds", watch: "advance recovery deductions shown on remittance advices", outcome: "shrink the bond as the advance is repaid, so you pay lower fees" },
    mom: { label: "MOM security bonds", tag: "phase 2", watch: "workers leaving your IDEAL payroll", outcome: "prompt a discharge so bonds are not left open for staff who have left" },
  };
  const NAV = [
    { sec: "Banking" },
    { id: "home", label: "Home", off: true },
    { id: "accounts", label: "Accounts", off: true },
    { id: "pay", label: "Pay and Transfer", off: true },
    { id: "approvals", label: "Approvals", off: true },
    { sec: "Trade finance" },
    { id: "bonds", label: "Bond Navigator", isNew: true, badge: () => actionsDue() },
    { id: "issue", label: "Issue new guarantee", off: true },
    { id: "results", label: "Pilot results" },
    { id: "governance", label: "Governance" },
  ];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clock = () => new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const byRef = (ref) => D.guarantees.find((g) => g.ref === ref);

  let A = {};
  const assessAll = () => { A = {}; D.guarantees.forEach((g) => { A[g.ref] = B.assess(g, state.aiEnabled); }); };
  const actionsDue = () => D.guarantees.filter((g) => A[g.ref] && A[g.ref].level !== "ok" && !state.status[g.ref]).length;
  const log = (action, ref, who) => state.audit.unshift({ time: clock(), who: who || D.signedIn.name, ref: ref || "", action });
  const total = () => D.guarantees.reduce((t, g) => t + g.amount, 0);

  // ---------- Frame ----------
  function renderFrame() {
    $("#who").innerHTML = `<strong>${esc(D.company)}</strong>${esc(D.signedIn.name)} · ${esc(D.signedIn.role)}`;
    $("#sidenav").innerHTML = NAV.map((n) => {
      if (n.sec) return `<div class="sec">${esc(n.sec)}</div>`;
      const badge = n.badge ? n.badge() : 0;
      return `<button class="nav-btn ${state.view === n.id ? "active" : ""}" data-nav="${n.id}" ${n.off ? 'disabled title="Not part of this prototype"' : ""} ${state.view === n.id ? 'aria-current="page"' : ""}>
          <span>${esc(n.label)}</span><span>${n.isNew ? '<span class="new">NEW</span> ' : ""}${badge ? `<span class="badge">${badge}</span>` : ""}</span>
        </button>`;
    }).join("");
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== "view-" + state.view; });
  }

  // ---------- Credit line ----------
  function renderLine() {
    const L = D.line.limit;
    const used = total();
    const freeing = Object.entries(state.status).reduce((t, [, s]) => t + (s.freeing || 0), 0);
    const canFree = D.guarantees.reduce((t, g) => t + (state.status[g.ref] ? 0 : A[g.ref].freed), 0);
    const needed = used - freeing - canFree;
    const avail = L - used;
    const pct = (v) => (v / L) * 100;
    const potential = freeing + canFree;
    $("#lineCard").innerHTML = `
      <h2>${esc(D.line.label)}: ${fmt(L)}</h2>
      <div class="linebar" role="img" aria-label="Line used ${fmt(used)} of ${fmt(L)}. ${fmt(potential)} can be freed.">
        <span class="seg-used" style="width:${pct(needed)}%"></span>
        <span class="seg-freeing" style="width:${pct(freeing)}%"></span>
        <span class="seg-free" style="width:${pct(canFree)}%"></span>
      </div>
      <div class="legend">
        <span><i class="seg-used"></i>Still needed ${fmt(needed)}</span>
        ${freeing ? `<span><i class="seg-freeing"></i>Being freed ${fmt(freeing)}</span>` : ""}
        ${canFree ? `<span><i class="seg-free"></i>Can be freed ${fmt(canFree)}</span>` : ""}
        <span><i style="background:var(--grey-soft);border:1px solid var(--line)"></i>Available now ${fmt(avail)}</span>
      </div>
      ${state.aiEnabled && potential ? `<div class="so">Freeing <b>${fmt(potential)}</b> lets you back roughly <b>${fmt(potential * 10)} to ${fmt(potential * 20)}</b> of new contracts, because bonds are usually 5 to 10% of the contract sum.</div>` : ""}`;
  }

  // ---------- Visuals ----------
  function timelineSvg(g, a) {
    const W = 560, H = 150, L = 104, R = 12;
    const start = d(g.issued < g.start ? g.issued : g.start);
    const endAll = new Date(Math.max(a.mustLast, d(g.expiry), a.forecast.finish) + 75 * B.DAY);
    const x = (date) => L + (W - L - R) * ((date - start) / (endAll - start));
    const rows = [["Project", 30], ["Bond valid", 70], ["Bond must last", 110]];
    let s = "";
    for (let y = start.getFullYear(); y <= endAll.getFullYear() + 1; y++) {
      const jan = new Date(y, 0, 1);
      if (jan > start && jan < endAll) s += `<line x1="${x(jan)}" x2="${x(jan)}" y1="14" y2="${H - 18}" stroke="#e1e5ea"/><text x="${x(jan)}" y="${H - 4}" font-size="11" text-anchor="middle" fill="#5f6b76">${y}</text>`;
    }
    rows.forEach(([label, y]) => { s += `<text x="0" y="${y + 4}" font-size="11.5" font-weight="700" fill="#1f2328">${label}</text>`; });
    // Project: planned (grey) + forecast delay (amber)
    s += `<rect x="${x(d(g.start))}" y="22" width="${x(a.planned) - x(d(g.start))}" height="16" rx="3" fill="#9aa3ad"><title>Planned ${fmtDate(d(g.start))} to ${fmtDate(a.planned)}</title></rect>`;
    if (a.forecast.delay >= 0.5) s += `<rect x="${x(a.planned)}" y="22" width="${x(a.forecast.finish) - x(a.planned)}" height="16" rx="3" fill="#e3a33b"><title>Forecast delay to ${fmtMonth(a.forecast.finish)}</title></rect>`;
    // Bond valid
    s += `<rect x="${x(d(g.issued))}" y="62" width="${x(d(g.expiry)) - x(d(g.issued))}" height="16" rx="3" fill="#1f7a4d"><title>Bond valid until ${fmtDate(d(g.expiry))}</title></rect>`;
    // Bond must last: outline + red gap
    s += `<rect x="${x(d(g.issued))}" y="102" width="${x(a.mustLast) - x(d(g.issued))}" height="16" rx="3" fill="none" stroke="#5f6b76" stroke-dasharray="4 3"/>`;
    if (d(g.expiry) < a.mustLast) {
      const tone = a.level === "urgent" ? "#c4141f" : "#8cc0de";
      s += `<rect x="${x(d(g.expiry))}" y="102" width="${x(a.mustLast) - x(d(g.expiry))}" height="16" rx="3" fill="${tone}" opacity="0.85"><title>Not covered: ${fmtDate(d(g.expiry))} to ${fmtDate(a.mustLast)}</title></rect>`;
      s += `<text x="${Math.min(x(d(g.expiry)) + 6, W - 120)}" y="${a.level === "urgent" ? 98 : 98}" font-size="11" font-weight="700" fill="${a.level === "urgent" ? "#c4141f" : "#0f5c8a"}">${a.level === "urgent" ? "Gap: extend now" : "Renew later"}</text>`;
    }
    // Today
    s += `<line x1="${x(B.AS_OF)}" x2="${x(B.AS_OF)}" y1="10" y2="${H - 18}" stroke="#1f2328" stroke-width="1.5"/><text x="${x(B.AS_OF) + 4}" y="12" font-size="11" font-weight="700" fill="#1f2328">Today</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline: project ${a.forecast.delay >= 0.5 ? "forecast to finish " + fmtMonth(a.forecast.finish) : "on schedule"}, bond expires ${fmtDate(d(g.expiry))}, bond must last until ${fmtDate(a.mustLast)}">${s}</svg>`;
  }

  function progressSvg(g) {
    const W = 440, H = 170, L = 38, R = 10, T = 14, Bm = 26;
    const s0 = d(g.start), e0 = d(g.plannedEnd);
    const end = new Date(Math.max(e0, B.AS_OF) + 20 * B.DAY);
    const x = (date) => L + (W - L - R) * ((date - s0) / (end - s0));
    const y = (p) => T + (H - T - Bm) * (1 - p / 100);
    let s = "";
    [0, 50, 100].forEach((p) => { s += `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="#e1e5ea"/><text x="${L - 6}" y="${y(p) + 4}" font-size="11" text-anchor="end" fill="#5f6b76">${p}%</text>`; });
    s += `<line x1="${x(s0)}" y1="${y(0)}" x2="${x(e0)}" y2="${y(100)}" stroke="#9aa3ad" stroke-width="2" stroke-dasharray="5 4"/>`;
    s += `<text x="${x(s0) + 0.45 * (x(e0) - x(s0))}" y="${y(45) - 10}" font-size="11" text-anchor="end" fill="#5f6b76">Plan</text>`;
    const pts = [[s0, 0], ...g.payments.map(([dt, p]) => [d(dt), p])];
    s += `<polyline fill="none" stroke="#c4141f" stroke-width="2.5" points="${pts.map(([dt, p]) => `${x(dt)},${y(p)}`).join(" ")}"/>`;
    pts.slice(1).forEach(([dt, p]) => { s += `<circle cx="${x(dt)}" cy="${y(p)}" r="3.5" fill="#c4141f"><title>${fmtDate(dt)}: ${p}% paid</title></circle>`; });
    const last = pts[pts.length - 1];
    s += `<text x="${x(last[0]) - 6}" y="${y(last[1]) - 8}" font-size="11" font-weight="700" text-anchor="end" fill="#c4141f">Paid ${last[1]}%</text>`;
    s += `<line x1="${x(B.AS_OF)}" x2="${x(B.AS_OF)}" y1="${T}" y2="${H - Bm}" stroke="#1f2328"/><text x="${x(B.AS_OF) - 4}" y="${H - 8}" font-size="11" text-anchor="end" fill="#1f2328">Today</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of contract paid compared with plan">${s}</svg>`;
  }

  function recoveryHtml(g) {
    const rec = g.advanceRecovered, out = g.advancePaid - rec;
    return `<div class="linebar" role="img" aria-label="Advance recovered ${fmt(rec)}, outstanding ${fmt(out)}">
        <span style="width:${(rec / g.amount) * 100}%;background:#8cc0de"></span>
        <span style="width:${(out / g.amount) * 100}%;background:#7d8691"></span>
      </div>
      <div class="legend"><span><i style="background:#8cc0de"></i>Advance already recovered ${fmt(rec)}</span><span><i style="background:#7d8691"></i>Still outstanding ${fmt(out)}</span></div>`;
  }

  // ---------- List + card ----------
  function renderBonds() {
    $("#killSlot").innerHTML = state.aiEnabled ? "" : `<div class="killbar">AI paused (kill switch on). Bond Navigator is showing plain expiry reminders only.</div>`;
    renderLine();
    $("#typeChips").innerHTML = Object.entries(TYPES).map(([k, t]) =>
      `<button class="chip ${state.type === k ? "active" : ""}" data-type="${k}">${esc(t.label)}${t.tag ? `<small>${esc(t.tag)}</small>` : ""}</button>`).join("");
    const t = TYPES[state.type];
    $("#typeNote").innerHTML = state.type === "all"
      ? `${D.guarantees.length} active guarantees totalling <b>${fmt(total())}</b>. Pick a bond type to see what Bond Navigator watches for it.`
      : `<b>${esc(t.label)}${t.tag ? " (" + esc(t.tag) + ")" : ""}:</b> Bond Navigator watches ${esc(t.watch)}. <b>Outcome:</b> ${esc(t.outcome)}.`;

    const split = document.querySelector("#view-bonds .split");
    if (state.type === "mom") {
      split.hidden = true;
      $("#typeNote").innerHTML += `<br>${D.momBonds.count} bonds on file. ${esc(D.momBonds.note)} Not live in this prototype.`;
      return;
    }
    split.hidden = false;

    const list = D.guarantees.filter((g) => state.type === "all" || g.type === state.type)
      .sort((x, y) => (ORDER[A[x.ref].level] - ORDER[A[y.ref].level]) || (A[x.ref].left - A[y.ref].left));
    $("#bondList").innerHTML = `<h2>Your guarantees (${list.length})</h2>` + list.map((g) => {
      const a = A[g.ref];
      const st = state.status[g.ref];
      return `<button class="row ${state.selected === g.ref ? "selected" : ""}" data-ref="${g.ref}">
          <span class="t">${esc(g.ref)} · ${esc(a.typeLabel)}</span><span class="amt">${fmt(g.amount)}</span>
          <span class="m">${esc(g.project)}<br>Expires ${fmtDate(d(g.expiry))} (${a.left} days)</span>
          <span class="r">${st ? `<span class="status">${esc(st.kind)}</span>` : `<span class="pill ${a.level}">${esc(a.title)}</span>`}</span>
        </button>`;
    }).join("");

    if (!list.find((g) => g.ref === state.selected)) state.selected = list[0] ? list[0].ref : null;
    const g = byRef(state.selected);
    $("#bondCard").innerHTML = g ? `<h2>Guarantee card</h2><div class="body">${card(g)}</div>` : `<h2>Guarantee card</h2><div class="empty">Select a guarantee.</div>`;
  }

  function card(g) {
    const a = A[g.ref];
    const st = state.status[g.ref];
    let h = `<div class="head"><div><h3>${esc(g.ref)} · ${esc(a.typeLabel)}</h3><div class="sub">${esc(g.project)}<br>For ${esc(g.beneficiary)}</div></div><div class="big">${fmt(g.amount)}</div></div>`;
    h += `<div class="verdict ${a.level}"><div class="ttl">${esc(a.title)}</div><div class="s">${esc(a.summary)}</div></div>`;
    if (st) h += `<div class="msg ${st.tone}">${esc(st.text)}</div>`;

    if (state.aiEnabled) {
      if (g.type === "performance" && a.forecast) {
        h += `<div><div class="label">Will the bond last long enough?</div><div class="figure">${timelineSvg(g, a)}
          <div class="cap">Grey: planned project. Amber: forecast delay. Green: bond as issued. Dashed: how long the contract says the bond must last.</div></div></div>`;
        h += `<div><div class="label">Progress payments vs plan</div><div class="figure">${progressSvg(g)}
          <div class="cap">Red: share of the contract the client has paid, from IDEAL. Dashed: where payments should be if the project were on schedule.</div></div></div>`;
      }
      if (g.type === "advance") h += `<div><div class="label">How much of the advance is left?</div><div class="figure">${recoveryHtml(g)}</div></div>`;

      const icon = { concern: "!", save: "$", ok: "✓", info: "•" };
      h += `<div><div class="label">What Bond Navigator found</div><ul class="find">${a.findings.map((f) =>
        `<li class="${f.type}"><span class="ic" aria-hidden="true">${icon[f.type]}</span><span><span class="src">${esc(f.source)}</span>${esc(f.text)}</span></li>`).join("")}</ul></div>`;

      h += `<div class="clause"><div class="label" style="margin:0">Read from your contract</div><div><b>${esc(g.clause.ref)}:</b> <q>${esc(g.clause.text)}</q></div>
        <div class="note">Read by AI with ${Math.round(g.clause.confidence * 100)}% confidence. Please confirm this matches your signed contract. This is not legal advice.</div></div>`;

      if (a.forecast) {
        const max = Math.max(...a.forecast.contributions.map((c) => Math.abs(c.contribution)), 1);
        const rows = a.forecast.contributions.map((c) =>
          `<div class="contrib"><span>${esc(c.label)}</span><span class="bar"><span class="${c.contribution < 0 ? "down" : ""}" style="width:${Math.round((Math.abs(c.contribution) / max) * 100)}%"></span></span><span class="n">${c.contribution >= 0 ? "+" : ""}${c.contribution.toFixed(1)}</span></div>`).join("");
        h += `<details class="why"><summary>Why this forecast (AI reasoning)</summary>${rows}
          <div class="contrib"><span><b>Forecast delay</b> (starting point ${M.intercept.toFixed(1)}, never below 0)</span><span></span><span class="n"><b>${a.forecast.delay.toFixed(1)}</b></span></div>
          <p class="note">Values are in months. Red bars push the finish later, green bars pull it earlier. Falling behind early in a project tends to snowball, so being far into the schedule lowers the forecast for the same gap. Weights come from model/train_model.py.</p></details>`;
      }
    }

    h += `<div><div class="label">Guarantee details</div><dl class="facts">
        <dt>Beneficiary</dt><dd>${esc(g.beneficiary)}</dd>
        <dt>Issued</dt><dd>${fmtDate(d(g.issued))}</dd>
        <dt>Expires</dt><dd>${fmtDate(d(g.expiry))} (${a.left} days)</dd>
        ${g.contractSum ? `<dt>Contract sum</dt><dd>${fmt(g.contractSum)} (bond is ${Math.round((g.amount / g.contractSum) * 100)}%)</dd>` : ""}
        <dt>Fee while open</dt><dd>About ${fmt(g.amount * D.assumptions.commissionPctPerYear / 100)} a year (assumed ${D.assumptions.commissionPctPerYear}%)</dd>
      </dl></div>`;

    if (!st) h += actions(g, a);
    h += `<p class="note">Bond Navigator never changes a guarantee by itself. You approve every request, the client must accept any reduction or release, and DBS trade staff check every amendment before it is issued.</p>`;
    return h;
  }

  function letter(g, a, kind) {
    const what = kind === "release"
      ? `As ${g.type === "tender" ? "the tender has been awarded to another party" : "the project has reached final completion and the retention has been released"}, we request your consent to the early discharge of ${g.ref} (${fmt(g.amount)}).`
      : `As ${fmt(g.advanceRecovered)} of the advance has been recovered through interim payments, we request your consent to reduce ${g.ref} from ${fmt(g.amount)} to ${fmt(a.newAmount)}, in line with ${g.clause.ref}.`;
    return `To: ${g.beneficiary}\nRe: ${g.project}\n\nDear Sir or Madam,\n\n${what} Kindly confirm through the eGuarantee platform or reply to DBS Bank.\n\nYours faithfully,\n${D.signedIn.name}, ${D.company}`;
  }

  function actions(g, a) {
    let h = "";
    if (a.action === "extend" && state.aiEnabled) {
      h += `<div class="actions"><button class="btn primary" data-act="open">Prepare extension request</button><button class="btn" data-act="dismiss">Not now</button></div>`;
      if (state.panel) {
        h += `<div class="box"><h4>Extension request (pre-filled)</h4><dl class="form-row">
            <dt>Guarantee</dt><dd>${esc(g.ref)}, ${fmt(g.amount)}</dd>
            <dt>Current expiry</dt><dd>${fmtDate(d(g.expiry))}</dd>
            <dt>New expiry</dt><dd>${fmtDate(a.newExpiry)}</dd>
            <dt>Reason</dt><dd>Project forecast to finish ${fmtMonth(a.forecast.finish)}. ${esc(g.clause.ref)} requires the bond until ${g.afterDlpMonths} months after the ${g.dlpMonths}-month defects period.</dd>
            <dt>Fee</dt><dd>As per your facility terms</dd>
          </dl><div class="actions"><button class="btn primary" data-act="submit">Submit to DBS</button><button class="btn" data-act="close">Cancel</button></div></div>`;
      }
    } else if (a.action === "reduce" || a.action === "release") {
      h += `<div class="actions"><button class="btn primary" data-act="open">Prepare ${a.action === "reduce" ? "reduction" : "release"} request</button><button class="btn" data-act="dismiss">Not now</button></div>`;
      if (state.panel) {
        h += `<div class="box"><h4>${a.action === "reduce" ? "Reduction" : "Early release"} request (pre-filled)</h4>
            <div class="draft">${esc(letter(g, a, a.action))}</div>
            <div class="note">Frees ${fmt(a.freed)} of your guarantee line and saves about ${fmt(a.saving)} in fees${a.action === "reduce" ? " a year" : ""} (assumed ${D.assumptions.commissionPctPerYear}% a year).</div>
            <div class="actions"><button class="btn primary" data-act="submit">Send to client and DBS</button><button class="btn" data-act="close">Cancel</button></div></div>`;
      }
    } else {
      h += `<div class="actions"><button class="btn" data-act="remind">Remind me in 30 days</button></div>`;
    }
    return h;
  }

  // ---------- Results ----------
  function cbar(label, v, max, ai, unit) {
    return `<div class="cbar"><span>${esc(label)}</span><span class="track"><span class="fill ${ai ? "ai" : ""}" style="width:${Math.max((v / max) * 100, v ? 2 : 0)}%"></span></span><span class="v">${v}${unit}</span></div>`;
  }
  function renderResults() {
    const ev = M.evaluation;
    const a = D.assumptions;
    const tokens = a.contractsReadPerMonth * a.tokensPerContract + a.cardsPerMonth * a.tokensPerCard;
    const cost = (tokens / 1000) * a.costPer1kTokensSGD;
    const freed = D.guarantees.reduce((t, g) => t + B.assess(g, true).freed, 0);
    const saving = D.guarantees.reduce((t, g) => t + B.assess(g, true).saving, 0);
    $("#results").innerHTML = `<div class="grid2">
      <div class="panel pad">
        <h2>Bond Navigator vs a simple expiry reminder</h2>
        <p class="lead">Synthetic test on ${ev.test_projects.toLocaleString()} projects, of which ${ev.needing_extension.toLocaleString()} ran at least 1 month late and needed their bond extended.</p>
        <div class="kpis">
          <div class="kpi"><b>${Math.round(ev.extensions_spotted_share * 100)}%</b><span>of needed extensions spotted early</span></div>
          <div class="kpi"><b>${ev.median_notice_months_ai} months</b><span>typical notice, vs ${ev.notice_months_date_reminder} month from a reminder</span></div>
          <div class="kpi"><b>${ev.mae_months_ai} months</b><span>forecast error, vs ${ev.mae_months_on_schedule} if you assume "on time"</span></div>
        </div>
        <div class="cmp">
          <div><div class="t">Notice before the bond runs out</div>${cbar("Expiry reminder", ev.notice_months_date_reminder, ev.median_notice_months_ai, false, " mo")}${cbar("Bond Navigator", ev.median_notice_months_ai, ev.median_notice_months_ai, true, " mo")}</div>
          <div><div class="t">Error in forecast finish date</div>${cbar("Assume on time", ev.mae_months_on_schedule, ev.mae_months_on_schedule, false, " mo")}${cbar("Bond Navigator", ev.mae_months_ai, ev.mae_months_on_schedule, true, " mo")}</div>
        </div>
        <p class="note">Honest limit: ${ev.false_alarms} on-time projects were flagged as late in this test. A false alarm only means an early renewal request, which the director can decline.</p>
        <h2>Value for this demo client</h2>
        <ul class="plain">
          <li><b>${fmt(freed)}</b> of guarantee line freed, enough to back roughly ${fmt(freed * 10)} to ${fmt(freed * 20)} of new contracts.</li>
          <li>About <b>${fmt(saving)}</b> a year in fees saved (assumed ${a.commissionPctPerYear}% a year).</li>
          <li>An "extend or pay" demand avoided on a <b>S$480,000</b> performance bond.</li>
        </ul>
      </div>
      <div class="panel pad">
        <h2>Who pays for the AI (tokens)</h2>
        <p class="lead">One SME contractor, one month. All figures are assumptions.</p>
        <div class="tw"><table>
          <tr><td>New contracts read by the language model (once each)</td><td class="n">${a.contractsReadPerMonth} × ${a.tokensPerContract.toLocaleString()} tokens</td></tr>
          <tr><td>Guarantee cards written</td><td class="n">${a.cardsPerMonth} × ${a.tokensPerCard.toLocaleString()} tokens</td></tr>
          <tr><td>Weekly delay forecasts (small model)</td><td class="n">Near zero</td></tr>
          <tr><td>AI cost to DBS (S$${a.costPer1kTokensSGD} per 1,000 tokens)</td><td class="n">S$${cost.toFixed(2)}</td></tr>
          <tr><td>Bond Navigator add-on fee paid by client</td><td class="n">S$${a.monthlyPlanSGD.toFixed(2)}</td></tr>
          <tr><td><b>DBS margin on the add-on</b></td><td class="n"><b>S$${(a.monthlyPlanSGD - cost).toFixed(2)}</b></td></tr>
        </table></div>
        <h2>Value for DBS</h2>
        <ul class="plain">
          <li><b>More guarantees issued:</b> freed lines get reused for new tenders and projects.</li>
          <li><b>Extension fees</b> earned on time, instead of rushed or lapsed bonds.</li>
          <li><b>Lower credit risk:</b> fewer bonds called, so DBS pays out less on the client's behalf.</li>
          <li><b>No pricing cut:</b> guarantee commission rates are unchanged, so margins are protected.</li>
        </ul>
      </div>
    </div>`;
  }

  // ---------- Governance ----------
  function renderGovernance() {
    const audit = state.audit.length
      ? `<div class="tw"><table><tr><th>Time</th><th>Who</th><th>Guarantee</th><th>Action</th></tr>${state.audit.map((e) =>
          `<tr><td>${esc(e.time)}</td><td>${esc(e.who)}</td><td>${esc(e.ref)}</td><td>${esc(e.action)}</td></tr>`).join("")}</table></div>`
      : `<p class="note">No actions yet. Prepare a request on a guarantee card to see it logged here.</p>`;
    $("#governance").innerHTML = `<div class="grid2">
      <div class="panel pad">
        <h2>Kill switch</h2>
        <label class="switch"><input type="checkbox" id="aiToggle" ${state.aiEnabled ? "checked" : ""}> AI checks ${state.aiEnabled ? "on" : "off"}</label>
        <p class="note">Turning AI off falls back to plain expiry reminders, so clients are never left with nothing. DBS can use this if forecasts misbehave.</p>
        <h2>Safety nets</h2>
        <ul class="plain">
          <li><b>Humans decide.</b> Bond Navigator only prepares requests. The director submits them.</li>
          <li><b>Two more checks:</b> the client must accept any reduction or early release, and DBS trade staff check every amendment.</li>
          <li><b>Contract readings are confirmed.</b> Every AI-read clause shows its confidence and asks the client to confirm. Not legal advice.</li>
          <li><b>Shadow pilot first.</b> 3 months of silent forecasts compared with real project outcomes before clients see them.</li>
          <li><b>Safe failure.</b> A wrong "late" forecast only causes an early renewal request. A wrong "on time" forecast still leaves the normal 60-day renewal reminder.</li>
          <li><b>Privacy.</b> Uses only the client's own IDEAL trade and collection data, uploaded contracts, and public GeBIZ results (PDPA).</li>
        </ul>
      </div>
      <div class="panel pad">
        <h2>Model card</h2>
        <dl class="facts">
          <dt>Forecast model</dt><dd>${esc(M.model)}</dd>
          <dt>Training data</dt><dd>${esc(M.trained_on)} (${M.n_projects.toLocaleString()} projects)</dd>
          <dt>Trained</dt><dd>${esc(M.trained_date)}</dd>
          <dt>Late means</dt><dd>${M.late_from_months} month or more after the planned finish</dd>
          <dt>Contract reader</dt><dd>Language model extracts the bond clause once, when the guarantee is issued</dd>
        </dl>
        <div class="tw"><table><tr><th>Signal</th><th>Source</th><th class="n">Weight</th></tr>
          ${M.features.map((f) => `<tr><td>${esc(f.label)}</td><td>IDEAL collections</td><td class="n">${f.weight.toFixed(2)}</td></tr>`).join("")}
        </table></div>
        <p class="note">Weights are in months of delay per unit of each signal. Tender results come from public GeBIZ notices. Advance recovery comes from remittance advices.</p>
      </div>
    </div>
    <div class="panel pad" style="margin-top:16px"><h2>Audit trail</h2>${audit}</div>`;
  }

  // ---------- Actions ----------
  function act(kind) {
    const g = byRef(state.selected);
    if (!g) return;
    const a = A[g.ref];
    if (kind === "open") state.panel = true;
    if (kind === "close") state.panel = false;
    if (kind === "submit") {
      state.panel = false;
      if (a.action === "extend") {
        state.status[g.ref] = { kind: "Extension submitted", tone: "info", text: `Extension to ${fmtDate(a.newExpiry)} submitted. DBS trade staff will check it and issue the amendment electronically to ${g.beneficiary}. Fee as per your facility terms.` };
        log(`Extension to ${fmtDate(a.newExpiry)} submitted to DBS`, g.ref);
        log("Amendment queued for trade operations check", g.ref, "DBS trade operations");
      } else {
        state.status[g.ref] = { kind: a.action === "reduce" ? "Reduction requested" : "Release requested", tone: "info", freeing: a.freed,
          text: `Request sent to ${g.beneficiary} and DBS. Once they accept, ${fmt(a.freed)} of your guarantee line is freed.` };
        log(`${a.action === "reduce" ? "Reduction to " + fmt(a.newAmount) : "Early release"} requested from beneficiary`, g.ref);
      }
    }
    if (kind === "dismiss") {
      state.status[g.ref] = { kind: "Dismissed", tone: "grey", text: "Dismissed by you. Your feedback helps improve future recommendations. Bond Navigator will keep watching this guarantee." };
      log(`Dismissed recommendation: ${a.title}`, g.ref);
    }
    if (kind === "remind") {
      state.status[g.ref] = { kind: "Reminder set", tone: "grey", text: "Bond Navigator will check this guarantee again in 30 days, and sooner if anything changes." };
      log("Reminder set for 30 days", g.ref);
    }
    render();
  }

  // ---------- Render + events ----------
  function render() {
    assessAll();
    renderFrame();
    if (state.view === "bonds") renderBonds();
    if (state.view === "results") renderResults();
    if (state.view === "governance") renderGovernance();
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav && !nav.disabled) { state.view = nav.dataset.nav; state.panel = false; render(); window.scrollTo(0, 0); return; }
    const row = e.target.closest("[data-ref]");
    if (row) {
      state.selected = row.dataset.ref; state.panel = false; render();
      if (window.innerWidth <= 1000) $("#bondCard").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const chip = e.target.closest("[data-type]");
    if (chip) { state.type = chip.dataset.type; state.panel = false; render(); return; }
    const btn = e.target.closest("button[data-act]");
    if (btn && !btn.disabled) act(btn.dataset.act);
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "aiToggle") {
      state.aiEnabled = e.target.checked;
      log(state.aiEnabled ? "Kill switch off, AI checks resumed" : "Kill switch on, expiry reminders only", "All", "DBS model owner");
      render();
    }
  });

  // Open on the most urgent guarantee.
  assessAll();
  state.selected = [...D.guarantees].sort((x, y) => (ORDER[A[x.ref].level] - ORDER[A[y.ref].level]) || (A[x.ref].left - A[y.ref].left))[0].ref;
  render();
})();
