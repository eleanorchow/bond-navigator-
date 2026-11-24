// Demo data for the Bond Navigator prototype.
// Every company, project, tender, clause and amount here is FICTIONAL.
// In a real pilot: guarantees come from the client's DBS IDEAL trade records,
// progress payments and remittance advices from IDEAL collections, contract
// clauses from documents uploaded at issuance, and tender results from GeBIZ.

window.BN_DATA = {
  asOf: "2026-11-24",
  company: "Tan & Lim Engineering Pte Ltd",
  segment: "SME contractor, 60 staff",
  signedIn: { name: "Tan Boon Hock", role: "Director, approver" },

  // Banker's guarantee line approved by a DBS credit officer.
  line: { limit: 2000000, label: "Banker's guarantee line" },

  // Assumptions for the value and cost panels. Label them as assumptions.
  assumptions: {
    commissionPctPerYear: 1.0,     // guarantee fee as % of amount per year
    contractsReadPerMonth: 2,
    tokensPerContract: 6000,       // language model reads each new contract once
    cardsPerMonth: 6,
    tokensPerCard: 1500,
    costPer1kTokensSGD: 0.02,
    monthlyPlanSGD: 20,
  },

  guarantees: [
    {
      ref: "PB-0231", type: "performance", amount: 480000,
      issued: "2025-12-15", expiry: "2026-12-15",
      beneficiary: "Northvale Town Council", project: "Block 12 lift upgrading works",
      contractSum: 4800000, start: "2025-12-01", plannedEnd: "2026-12-31",
      dlpMonths: 12, afterDlpMonths: 3,
      clause: { ref: "Clause 6.2", text: "The Contractor shall keep the performance bond valid until three (3) months after the expiry of the Defects Liability Period of twelve (12) months.", confidence: 0.96 },
      payments: [
        ["2026-01-08", 5], ["2026-02-12", 11], ["2026-03-20", 17], ["2026-04-28", 23],
        ["2026-06-03", 29], ["2026-07-10", 34], ["2026-08-19", 39], ["2026-09-25", 45],
        ["2026-10-30", 50], ["2026-11-20", 56],
      ],
    },
    {
      ref: "AP-0117", type: "advance", amount: 300000,
      issued: "2026-02-01", expiry: "2027-08-31",
      beneficiary: "Marina Coast Developments Pte Ltd", project: "Industrial building M&E fit-out",
      contractSum: 3000000, advancePaid: 300000, advanceRecovered: 210000,
      clause: { ref: "Clause 3.4", text: "The advance payment bond shall be reduced progressively by the amount of the advance recovered through deductions from interim payments.", confidence: 0.93 },
      recoveryNote: "Remittance advices on 8 progress payments show 10% advance recovery deductions, totalling S$210,000.",
    },
    {
      ref: "PB-0198", type: "performance", amount: 250000,
      issued: "2024-08-01", expiry: "2027-01-31",
      beneficiary: "Eastridge Primary School (fictional)", project: "School canteen renovation",
      contractSum: 2500000, start: "2024-08-15", plannedEnd: "2025-10-15",
      dlpMonths: 12, afterDlpMonths: 0, completed: true,
      clause: { ref: "Clause 7.1", text: "The performance bond shall be released upon the issue of the Final Completion Certificate.", confidence: 0.95 },
      retentionRelease: { date: "2026-11-03", amount: 125000, note: "Remittance advice: 'Release of retention monies, final account'" },
    },
    {
      ref: "TB-1104", type: "tender", amount: 50000,
      issued: "2026-08-20", expiry: "2027-02-28",
      beneficiary: "Northvale Town Council", project: "Park connector upgrading (Tender NTC-2026-118)",
      tender: { status: "lost", notice: "GeBIZ award notice, 2 Nov 2026: awarded to another company for S$3.9m." },
      clause: { ref: "Tender conditions 12", text: "Tender security shall be returned to unsuccessful tenderers after the award of the contract.", confidence: 0.97 },
    },
    {
      ref: "TB-1107", type: "tender", amount: 30000,
      issued: "2026-11-02", expiry: "2027-03-31",
      beneficiary: "Westbay Community Club Management Committee", project: "Community club M&E replacement (Tender WCC-2026-077)",
      tender: { status: "open", notice: "Tender closes 30 Nov 2026. No award notice yet." },
      clause: { ref: "Tender conditions 9", text: "Tender security shall remain valid for 120 days after the tender closing date.", confidence: 0.94 },
    },
    {
      ref: "PB-0240", type: "performance", amount: 180000,
      issued: "2026-06-01", expiry: "2027-06-30",
      beneficiary: "Pioneer Foods Manufacturing Pte Ltd", project: "Factory roof replacement",
      contractSum: 1800000, start: "2026-06-01", plannedEnd: "2027-03-31",
      dlpMonths: 12, afterDlpMonths: 3,
      clause: { ref: "Clause 5.3", text: "The performance bond shall remain valid until 90 days after the end of the twelve-month defects liability period.", confidence: 0.91 },
      payments: [
        ["2026-07-02", 8], ["2026-08-01", 19], ["2026-09-01", 30], ["2026-10-01", 41], ["2026-11-02", 52],
      ],
    },
  ],

  // Phase 2 preview only (not scored in this prototype).
  momBonds: { count: 18, note: "Migrant worker security bonds. Phase 2: Bond Navigator will spot workers who have left payroll and prompt a discharge." },
};
