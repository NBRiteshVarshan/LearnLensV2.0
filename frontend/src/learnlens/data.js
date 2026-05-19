
// Mock data — populates the entire LearnLens academic OS.

const SUBJECTS = [
  {
    id: "math", key: "math", name: "Mathematics", code: "MATH 241",
    title: "Real Analysis & Linear Algebra", instructor: "Prof. A. Kowalski",
    progress: 64, streak: 12, hours: 38, tag: "Core", session: "Tue · Thu · 09:00",
    flavor: "formula",
    next: { kind: "Problem set", title: "Cauchy sequences, problems 4.1–4.8", due: "Tomorrow, 23:59", urgency: "warn" },
    units: 12, unitDone: 8, resourceCount: 142,
    pinned: ["Spivak — Calculus, Ch. 7", "Lecture 14 — Compactness", "Theorem cheat-sheet"],
  },
  {
    id: "prog", key: "prog", name: "Programming", code: "CS 168",
    title: "Algorithms & Data Structures", instructor: "Dr. M. Tanaka",
    progress: 78, streak: 21, hours: 52, tag: "Core", session: "Mon · Wed · 14:00",
    flavor: "code",
    next: { kind: "Lab", title: "Implement persistent red-black tree", due: "In 3 days", urgency: "ok" },
    units: 10, unitDone: 7, resourceCount: 96,
    pinned: ["CLRS Ch. 13", "Lecture 11 — Amortized analysis", "Lab template (rust)"],
  },
  {
    id: "bio", key: "bio", name: "Biology", code: "BIO 220",
    title: "Cellular & Molecular Biology", instructor: "Prof. R. Singh",
    progress: 41, streak: 5, hours: 22, tag: "Core", session: "Tue · Fri · 11:00",
    flavor: "diagram",
    next: { kind: "Reading", title: "Membrane transport — Alberts Ch. 12", due: "Thursday", urgency: "ok" },
    units: 14, unitDone: 6, resourceCount: 211,
    pinned: ["Krebs cycle diagram", "Cell membrane (annotated)", "Glossary"],
  },
  {
    id: "lit", key: "lit", name: "Literature", code: "ENG 340",
    title: "20th-c. European Modernism", instructor: "Dr. E. Vasquez",
    progress: 52, streak: 8, hours: 31, tag: "Elective", session: "Wed · 16:00",
    flavor: "reading",
    next: { kind: "Essay", title: "The fragmented self in Woolf — 1500w", due: "Mon 19 May", urgency: "due" },
    units: 9, unitDone: 5, resourceCount: 64,
    pinned: ["Mrs Dalloway — annotated", "Modernism timeline", "Essay rubric"],
  },
  {
    id: "phys", key: "phys", name: "Physics", code: "PHYS 211",
    title: "Classical Mechanics", instructor: "Prof. H. Müller",
    progress: 35, streak: 3, hours: 18, tag: "Core", session: "Mon · Thu · 10:00",
    flavor: "formula",
    next: { kind: "Problem set", title: "Lagrangian formulation — set 5", due: "Friday", urgency: "warn" },
    units: 11, unitDone: 4, resourceCount: 87,
    pinned: ["Goldstein Ch. 2", "Pendulum derivations"],
  },
  {
    id: "chem", key: "chem", name: "Chemistry", code: "CHEM 130",
    title: "Organic Chemistry I", instructor: "Dr. P. Adeyemi",
    progress: 29, streak: 2, hours: 14, tag: "Elective", session: "Wed · Fri · 13:00",
    flavor: "diagram",
    next: { kind: "Quiz", title: "Functional groups recall — 25 Q", due: "This weekend", urgency: "ok" },
    units: 8, unitDone: 2, resourceCount: 41,
    pinned: ["Reaction map", "IR spectroscopy primer"],
  },
];

const ACTIVITY = [
  { t: "08:42", icon: "note",  text: "Imported lecture notes — Compactness (14p)", subj: "math" },
  { t: "Yest",  icon: "quiz",  text: "Quiz · Algorithms · 9 / 10 correct",          subj: "prog" },
  { t: "Yest",  icon: "anno",  text: "Annotated 6 pages of Mrs Dalloway",          subj: "lit"  },
  { t: "Mon",   icon: "video", text: "Watched Lec 11 — Amortized analysis",        subj: "prog" },
  { t: "Mon",   icon: "card",  text: "Reviewed 32 flashcards · 87% recall",        subj: "bio"  },
  { t: "Sun",   icon: "essay", text: "Drafted thesis paragraph — 240 words",       subj: "lit"  },
];

const TODAY_TASKS = [
  { id: "t1", subj: "math", kind: "Problem set", title: "Cauchy sequences 4.1–4.8", due: "23:59", est: "90 min", done: false, priority: "high" },
  { id: "t2", subj: "prog", kind: "Reading",     title: "CLRS — RB-tree invariants",  due: "—",     est: "45 min", done: true,  priority: "med"  },
  { id: "t3", subj: "lit",  kind: "Writing",     title: "Essay outline — Woolf",      due: "—",     est: "60 min", done: false, priority: "high" },
  { id: "t4", subj: "bio",  kind: "Flashcards",  title: "Membrane transport (28 cards)", due: "—",  est: "20 min", done: false, priority: "low"  },
  { id: "t5", subj: "phys", kind: "Problem set", title: "Lagrangian set 5 — start",   due: "Fri",   est: "120 min", done: false, priority: "med" },
];

const WEEK_FOCUS = [
  // hours per subject per day, Mon-Sun
  { d: "M", math: 1.4, prog: 2.1, bio: 0.6, lit: 0.8, phys: 0.5, chem: 0 },
  { d: "T", math: 2.0, prog: 1.0, bio: 1.1, lit: 0,   phys: 1.2, chem: 0.4 },
  { d: "W", math: 0.6, prog: 2.4, bio: 0.8, lit: 1.4, phys: 0,   chem: 0.7 },
  { d: "T", math: 1.8, prog: 0.9, bio: 0.5, lit: 0.4, phys: 1.3, chem: 0 },
  { d: "F", math: 0,   prog: 1.6, bio: 1.0, lit: 0.6, phys: 0.7, chem: 1.0 },
  { d: "S", math: 0.8, prog: 0.3, bio: 0,   lit: 2.2, phys: 0,   chem: 0 },
  { d: "S", math: 1.2, prog: 0,   bio: 0.4, lit: 0.6, phys: 0.5, chem: 0 },
];

// ── Mathematics workspace data ──────────────────────────────────────────────
const MATH_UNITS = [
  { n: "01", title: "Real numbers & completeness", done: true,  problems: 24 },
  { n: "02", title: "Sequences & limits",          done: true,  problems: 31 },
  { n: "03", title: "Series & convergence",        done: true,  problems: 28 },
  { n: "04", title: "Cauchy sequences",            done: false, current: true, problems: 22 },
  { n: "05", title: "Continuity",                  done: false, problems: 19 },
  { n: "06", title: "Differentiability",           done: false, problems: 26 },
];

const MATH_THEOREMS = [
  { n: "4.1", name: "Cauchy criterion",       body: "A sequence (a_n) in ℝ converges iff for every ε > 0 there exists N such that |a_m − a_n| < ε for all m, n ≥ N." },
  { n: "4.2", name: "Bolzano–Weierstrass",    body: "Every bounded sequence in ℝⁿ has a convergent subsequence." },
  { n: "4.3", name: "Completeness of ℝ",      body: "Every Cauchy sequence in ℝ converges to a limit in ℝ." },
];

const MATH_PROBLEMS = [
  { n: "4.1", text: "Show that a_n = 1 + 1/2 + ... + 1/n is not Cauchy.", diff: "easy", status: "done" },
  { n: "4.2", text: "Prove every convergent sequence is Cauchy.", diff: "easy", status: "done" },
  { n: "4.3", text: "Let (a_n) be Cauchy and (a_{n_k}) → L. Show a_n → L.", diff: "med", status: "doing" },
  { n: "4.4", text: "Construct a Cauchy sequence in ℚ that does not converge in ℚ.", diff: "med", status: "todo" },
  { n: "4.5", text: "Prove a contractive sequence is Cauchy.", diff: "hard", status: "todo" },
  { n: "4.6", text: "Show ℓ² is complete.", diff: "hard", status: "todo" },
  { n: "4.7", text: "Give an example of a metric space where Cauchy ⇏ convergent.", diff: "med", status: "todo" },
  { n: "4.8", text: "Prove the limit of a Cauchy sequence is unique.", diff: "easy", status: "todo" },
];

// ── Programming workspace data ──────────────────────────────────────────────
const PROG_FILES = [
  { path: "src/", kind: "dir", open: true, depth: 0 },
  { path: "  rbtree.rs",    kind: "rs",  depth: 1, active: true },
  { path: "  node.rs",      kind: "rs",  depth: 1 },
  { path: "  iter.rs",      kind: "rs",  depth: 1 },
  { path: "  lib.rs",       kind: "rs",  depth: 1 },
  { path: "tests/",         kind: "dir", open: true, depth: 0 },
  { path: "  invariants.rs",kind: "rs",  depth: 1 },
  { path: "  fuzz.rs",      kind: "rs",  depth: 1 },
  { path: "notes/",         kind: "dir", open: true, depth: 0 },
  { path: "  lec-13.md",    kind: "md",  depth: 1 },
  { path: "  amortized.md", kind: "md",  depth: 1 },
  { path: "Cargo.toml",     kind: "toml",depth: 0 },
];

const PROG_TERMINAL = [
  { kind: "prompt", text: "cargo test --lib invariants" },
  { kind: "out", text: "   Compiling rbtree v0.3.1" },
  { kind: "out", text: "    Finished test [unoptimized] target(s) in 1.42s" },
  { kind: "out", text: "     Running unittests src/lib.rs" },
  { kind: "out", text: "" },
  { kind: "ok",  text: "test invariants::black_height ............... ok" },
  { kind: "ok",  text: "test invariants::no_red_red ................. ok" },
  { kind: "ok",  text: "test invariants::root_black ................. ok" },
  { kind: "fail",text: "test invariants::persistent_share ........... FAILED" },
  { kind: "out", text: "" },
  { kind: "out", text: "test result: FAILED. 3 passed; 1 failed; 0 ignored" },
  { kind: "prompt", text: "" },
];

const PROG_CONCEPTS = [
  { n: "13.1", title: "RB-tree properties",    body: "Five invariants. Every node is red or black; root and leaves (NIL) are black; if a node is red, both children are black; every path from a node to its NIL descendants contains the same number of black nodes; new insertions are red." },
  { n: "13.2", title: "Left & right rotation", body: "Rotation preserves the inorder traversal of a BST. Used by insert-fixup and delete-fixup to restore black-height balance." },
  { n: "13.3", title: "Insert-fixup cases",    body: "Six symmetric cases. Uncle red → recolor and ascend. Uncle black, zig-zag → rotate to align. Uncle black, straight → rotate and recolor." },
];

// ── Biology workspace data ─────────────────────────────────────────────────
const BIO_DIAGRAMS = [
  { id: "membrane",  title: "Phospholipid bilayer",   parts: 9,  studied: 7, type: "annotated" },
  { id: "krebs",     title: "Citric-acid cycle",      parts: 12, studied: 4, type: "process"   },
  { id: "ribosome",  title: "Ribosome — 70S",          parts: 8,  studied: 3, type: "structure" },
  { id: "mitosis",   title: "Mitosis — phases",       parts: 6,  studied: 6, type: "process"   },
  { id: "neuron",    title: "Myelinated neuron",      parts: 11, studied: 2, type: "structure" },
  { id: "transcription", title: "Transcription init", parts: 10, studied: 5, type: "process"   },
];

const BIO_GLOSSARY = [
  { term: "Endocytosis",   body: "Bulk uptake of extracellular material via membrane invagination forming intracellular vesicles." },
  { term: "Antiporter",    body: "Membrane transport protein that moves two solutes in opposite directions across a membrane." },
  { term: "Symporter",     body: "Cotransporter that moves two species in the same direction, typically harnessing an ion gradient." },
  { term: "Ionophore",     body: "Lipid-soluble molecule that ferries ions across the bilayer; e.g. valinomycin (K⁺), A23187 (Ca²⁺)." },
];

// ── Literature workspace data ──────────────────────────────────────────────
const LIT_PASSAGE = [
  "She always had the feeling that it was very, very dangerous to live even one day.",
  "For Lucy had her work cut out for her. The doors would be taken off their hinges; Rumpelmayer's men were coming.",
  "And then, thought Clarissa Dalloway, what a morning—fresh as if issued to children on a beach.",
  "What a lark! What a plunge! For so it had always seemed to her, when, with a little squeak of the hinges, which she could hear now, she had burst open the French windows and plunged at Bourton into the open air.",
  "How fresh, how calm, stiller than this of course, the air was in the early morning; like the flap of a wave; the kiss of a wave; chill and sharp and yet (for a girl of eighteen as she then was) solemn.",
];

const LIT_ANNOTATIONS = [
  { line: 0, color: "thesis",  note: "Mortality leitmotif — recurs at p. 47, p. 132. Use for opening." },
  { line: 2, color: "image",   note: "Synaesthesia ‘fresh as if issued to children’ — sensory dislocation." },
  { line: 3, color: "thesis",  note: "Plunge as transition between interior / exterior selves — core for §2." },
  { line: 4, color: "voice",   note: "Free indirect — narrator slips into Clarissa mid-sentence." },
];

// expose
export {
  SUBJECTS,
  ACTIVITY,
  TODAY_TASKS,
  WEEK_FOCUS,
  MATH_UNITS,
  MATH_THEOREMS,
  MATH_PROBLEMS,
  PROG_FILES,
  PROG_TERMINAL,
  PROG_CONCEPTS,
  BIO_DIAGRAMS,
  BIO_GLOSSARY,
  LIT_PASSAGE,
  LIT_ANNOTATIONS,
};
