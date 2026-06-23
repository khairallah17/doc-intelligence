import type { Citation, DocRecord, Message } from "./types";

export const INITIAL_DOCS: DocRecord[] = [
  {
    id: "d1",
    name: "TAQA_Annual_Report_2024.pdf",
    pages: 84,
    uploadedAt: "Mar 12, 2026",
    sizeMB: 4.2,
    status: "ready",
    tag: "Finance",
    excerpt:
      "Consolidated performance across utilities, oil & gas, and renewables segments…",
    collectionId: null,
  },
  {
    id: "d2",
    name: "NDA_Template_v3.pdf",
    pages: 12,
    uploadedAt: "Apr 03, 2026",
    sizeMB: 0.3,
    status: "ready",
    tag: "Legal",
    excerpt:
      "Standard mutual non-disclosure agreement with carve-outs for residuals…",
    collectionId: null,
  },
  {
    id: "d3",
    name: "ML_Research_Compendium.pdf",
    pages: 210,
    uploadedAt: "Apr 28, 2026",
    sizeMB: 18.7,
    status: "processing",
    progress: 62,
    tag: "Research",
    excerpt:
      "Survey of retrieval-augmented generation methods, evaluation, and tooling…",
    collectionId: null,
  },
];

export const MOCK_PASSAGES: Record<string, Citation> = {
  c1: {
    page: 12,
    doc: "TAQA_Annual_Report_2024.pdf",
    section: "§ 2.1 — Operating Performance",
    text: "Group revenue for FY2024 reached AED 56.8 billion, an increase of 11.3% year-over-year, driven primarily by higher generation volumes in the Transmission & Distribution segment and the consolidation of newly commissioned solar capacity in Uzbekistan and Morocco.",
    highlight: "AED 56.8 billion, an increase of 11.3% year-over-year",
  },
  c2: {
    page: 47,
    doc: "TAQA_Annual_Report_2024.pdf",
    section: "§ 4.3 — Renewable Capacity Pipeline",
    text: "The Group's contracted renewables pipeline stood at 30.2 GW as of 31 December 2024, with 12.4 GW operational and 17.8 GW under construction or development across the GCC, Central Asia, and Sub-Saharan Africa.",
    highlight:
      "30.2 GW as of 31 December 2024, with 12.4 GW operational and 17.8 GW under construction",
  },
  c3: {
    page: 63,
    doc: "TAQA_Annual_Report_2024.pdf",
    section: "§ 6.2 — Liquidity & Capital Structure",
    text: "Total available liquidity at year-end amounted to AED 24.1 billion, comprising AED 9.6 billion in cash and short-term deposits and AED 14.5 billion of undrawn committed credit facilities, of which the weighted average tenor is 4.7 years.",
    highlight:
      "AED 24.1 billion … AED 9.6 billion in cash … AED 14.5 billion of undrawn committed credit facilities",
  },
  c4: {
    page: 71,
    doc: "TAQA_Annual_Report_2024.pdf",
    section: "§ 7.1 — Capital Expenditure",
    text: "Capital expenditure for the year totalled AED 11.9 billion, with approximately 64% deployed against the renewables build-out, 21% on transmission network reinforcement, and the residual 15% across maintenance capex in legacy thermal generation.",
    highlight:
      "AED 11.9 billion, with approximately 64% deployed against the renewables build-out",
  },
  c5: {
    page: 22,
    doc: "TAQA_Annual_Report_2024.pdf",
    section: "§ 3.1 — Strategic Pillars",
    text: "Management reaffirmed the four-pillar strategy: (i) Low-carbon Power & Water, (ii) Transmission & Distribution, (iii) Sustainable Fuels, and (iv) Customer Solutions, with explicit 2030 targets tied to a 150 GW global generation ambition.",
    highlight: "150 GW global generation ambition",
  },
};

export const INITIAL_THREAD: Message[] = [
  {
    id: "m1",
    role: "user",
    text: "What were the headline financial results for 2024, and how did renewables contribute?",
    time: "10:42",
  },
  {
    id: "m2",
    role: "assistant",
    text: "FY2024 was a record year for the Group on a reported basis. Revenue reached AED 56.8 billion, an 11.3 % increase year-over-year, largely driven by higher generation volumes and newly commissioned solar capacity in Uzbekistan and Morocco. The renewables segment is now the dominant growth engine — the contracted pipeline stood at 30.2 GW at year-end, with 12.4 GW already operational.",
    time: "10:42",
    citations: ["c1", "c2"],
  },
  {
    id: "m3",
    role: "user",
    text: "How is the balance sheet positioned to fund the build-out?",
    time: "10:44",
  },
  {
    id: "m4",
    role: "assistant",
    text: "Liquidity is comfortable for the scale of the capex programme. Available liquidity at year-end was AED 24.1 billion — AED 9.6 billion in cash and short-term deposits plus AED 14.5 billion of undrawn committed facilities. Against that, the Group deployed AED 11.9 billion of capex in FY2024, with roughly two-thirds going directly to renewables.",
    time: "10:44",
    citations: ["c3", "c4"],
  },
];

export const STREAMING_REPLY = {
  text: "Management reaffirmed the four-pillar strategy: Low-carbon Power & Water, Transmission & Distribution, Sustainable Fuels, and Customer Solutions. The headline 2030 ambition tied to those pillars is a 150 GW global generation footprint, which is materially above the current 12.4 GW operational base and implies the contracted pipeline must keep compounding.",
  citations: ["c5", "c2"],
};
