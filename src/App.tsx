import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BookOpen, Box, Braces, Check, CheckCircle2,
  ChevronRight, CircleDot, Clock3, Code2, Copy, Download, FileCheck2,
  FileText, FlaskConical, Gauge, GitCompareArrows, Info, Layers3, Pause,
  Play, RefreshCcw, RotateCcw, ScanLine, Search, ShieldAlert, Sparkles,
  TestTube2, TimerReset, TriangleAlert, UserCheck, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { draftSequence, failurePatterns, initialEffort, referenceSequence, SAMPLE_PROGRAM, type EffortRow } from "./data";
import { generateDraft, parseVPlus, type Finding, type ParseResult } from "./parser";

type Page = "workspace" | "verification";
type Tab = "analysis" | "documentation" | "draft" | "tests";
type ModelContext = { registerTool: (tool: { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };
declare global { interface Document { modelContext?: ModelContext } }

const tabItems: { id: Tab; label: string; icon: typeof ScanLine }[] = [
  { id: "analysis", label: "Analysis", icon: ScanLine },
  { id: "documentation", label: "Documentation", icon: BookOpen },
  { id: "draft", label: "Code Draft", icon: Code2 },
  { id: "tests", label: "Tests", icon: TestTube2 },
];

function downloadFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function lineLabel(lines: number[]) {
  if (!lines.length) return "No source line";
  if (lines.length === 1) return `L${lines[0]}`;
  return `L${Math.min(...lines)}–L${Math.max(...lines)}`;
}

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status"><CheckCircle2 size={16} />{message}</div>;
}

function Header({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => navigate("workspace")} aria-label="Open modernization workspace"><span className="brand-mark"><Braces size={18} /></span><span>VPlusBridge <b>AI</b></span></button>
    <nav aria-label="Primary pages"><button className={page === "workspace" ? "nav-active" : ""} onClick={() => navigate("workspace")}><ScanLine size={16}/> Modernization</button><button className={page === "verification" ? "nav-active" : ""} onClick={() => navigate("verification")}><FlaskConical size={16}/> Verification</button></nav>
    <span className="status"><i /> Local simulation lab</span>
  </header>;
}

function Metric({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub: string; tone?: "neutral" | "good" | "warn" }) {
  return <div className={`metric ${tone}`}><p>{label}</p><strong>{value}</strong><span>{sub}</span></div>;
}

function TraceButton({ lines, onTrace }: { lines: number[]; onTrace: (line: number) => void }) {
  return <button className="trace-button" disabled={!lines.length} onClick={() => lines[0] && onTrace(lines[0])}><CircleDot size={12}/>{lineLabel(lines)}</button>;
}

function AnalysisTab({ parsed, onTrace }: { parsed: ParseResult; onTrace: (line: number) => void }) {
  const commandCount = parsed.executable.length - parsed.unsupported.length;
  return <div className="tab-scroll">
    <div className="metrics-grid compact">
      <Metric label="Parsed" value={`${commandCount}/${parsed.executable.length}`} sub="recognized statements" tone={parsed.unsupported.length ? "warn" : "good"}/>
      <Metric label="Motion" value={String(parsed.lines.filter((item) => item.type === "MOVE" || item.type === "MOVES").length)} sub="ordered events" />
      <Metric label="Dependencies" value={String(parsed.positions.length + parsed.signals.length)} sub="poses + I/O" />
      <Metric label="Review" value={String(parsed.findings.filter((item) => !item.verified).length)} sub="open decisions" tone="warn" />
    </div>
    <div className="section-kicker"><span>Traceable findings</span><span>{parsed.findings.length} total</span></div>
    <div className="finding-list">{parsed.findings.map((finding, index) => <FindingCard key={`${finding.title}-${index}`} finding={finding} onTrace={onTrace}/>)}</div>
  </div>;
}

function FindingCard({ finding, onTrace }: { finding: Finding; onTrace: (line: number) => void }) {
  const icons = { flow: Activity, dependency: Layers3, assumption: Info, warning: AlertTriangle };
  const Icon = icons[finding.kind];
  return <article className={`finding-card ${finding.kind}`}><div className="finding-icon"><Icon size={16}/></div><div><div className="finding-meta"><span>{finding.kind}</span><TraceButton lines={finding.lines} onTrace={onTrace}/></div><h3>{finding.title}</h3><p>{finding.detail}</p></div></article>;
}

function DocumentationTab({ parsed, onTrace }: { parsed: ParseResult; onTrace: (line: number) => void }) {
  const inventory = ["PROGRAM", "SPEED", "MOVE", "MOVES", "SIGNAL", "DELAY", "END"] as const;
  return <div className="tab-scroll docs-layout">
    <article className="doc-block hero-doc"><div className="doc-icon"><FileText size={18}/></div><div><p className="label">Functional description</p><h3>{parsed.programName.replaceAll("_", " ")}</h3><p>This routine transfers one synthetic part from a taught pick pose to a taught place pose, using digital output {parsed.signals.join(", ") || "—"} as the gripper command. It returns the robot to home at the end of the cycle.</p></div></article>
    <article className="doc-block"><p className="label">Technical behavior</p><p>The controller executes {parsed.lines.filter((line) => line.type === "MOVE" || line.type === "MOVES").length} motion instructions, {parsed.lines.filter((line) => line.type === "SIGNAL").length} output writes, and {parsed.lines.filter((line) => line.type === "DELAY").length} timed waits in strict source order. No inferred branching is introduced.</p><TraceButton lines={parsed.executable.map((line) => line.line)} onTrace={onTrace}/></article>
    <article className="doc-block"><div className="section-kicker"><span>Instruction inventory</span><span>deterministic grammar</span></div><div className="inventory-table">{inventory.map((type) => { const lines = parsed.lines.filter((line) => line.type === type); return <div key={type}><code>{type === "PROGRAM" || type === "END" ? `.${type}` : type}</code><span>{lines.length}</span><TraceButton lines={lines.map((line) => line.line)} onTrace={onTrace}/></div>; })}</div></article>
    <article className="callout amber"><TriangleAlert size={16}/><div><b>Verification boundary</b><p>Tool frames, payload, collision models, controller options, I/O wiring, and safety logic are absent from the source and remain unverified.</p></div></article>
  </div>;
}

function DraftTab({ parsed, onCopy }: { parsed: ParseResult; onCopy: (text: string, label: string) => void }) {
  const draft = generateDraft(parsed);
  return <div className="tab-scroll draft-tab"><div className="draft-head"><div><p className="label">Target-neutral pseudocode</p><span>{parsed.unsupported.length + 2} review TODOs retained</span></div><button className="button secondary small" onClick={() => onCopy(draft, "Code draft copied")}><Copy size={14}/> Copy draft</button></div><pre className="code-draft">{draft}</pre><div className="callout blue"><ShieldAlert size={16}/><div><b>Draft only</b><p>This output expresses source intent; it does not select a target robot language, safety architecture, or production-ready motion settings.</p></div></div></div>;
}

function TestsTab({ parsed, onTrace }: { parsed: ParseResult; onTrace: (line: number) => void }) {
  const [executed, setExecuted] = useState(false);
  return <div className="tab-scroll tests-tab"><div className="test-summary"><div><p className="label">Verification plan</p><h3>{parsed.tests.length} source-linked test cases</h3></div><button className="button secondary small" onClick={() => setExecuted(true)}><Play size={14}/> Run synthetic checks</button></div><div className="test-list">{parsed.tests.map((test) => { const result = executed ? (test.status === "ready" ? "pass" : "blocked") : test.status; return <article className="test-card" key={test.id}><div className="test-id">{test.id}</div><div><h3>{test.title}</h3><p><b>Precondition:</b> {test.precondition}</p><p><b>Expected:</b> {test.expected}</p></div><div className="test-actions"><span className={`pill ${result}`}>{result}</span><TraceButton lines={test.sourceLines} onTrace={onTrace}/></div></article>; })}</div></div>;
}

function WorkspacePage({ source, setSource, notify }: { source: string; setSource: (source: string) => void; notify: (message: string) => void }) {
  const [parsedSource, setParsedSource] = useState(source);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [selectedLine, setSelectedLine] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewer, setReviewer] = useState("A. Engineer");
  const [notes, setNotes] = useState("Confirm output 1 polarity and tool frame before target selection.");
  const [reviewed, setReviewed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => parseVPlus(parsedSource), [parsedSource]);
  const dirty = source !== parsedSource;
  const copy = async (text: string, message: string) => { try { await navigator.clipboard.writeText(text); notify(message); } catch { notify("Clipboard unavailable in this preview"); } };
  const trace = (line: number) => { setSelectedLine(line); editorRef.current?.focus(); notify(`Source line ${line} focused`); };
  const runParser = () => { setParsedSource(source); setReviewed(false); notify("Source parsed with deterministic grammar"); };
  const exportPackage = () => { downloadFile("vplusbridge-modernization-package.json", JSON.stringify({ generatedAt: new Date().toISOString(), scope: "synthetic demonstration", source, parsed, draft: generateDraft(parsed), review: { reviewer, notes, reviewed } }, null, 2)); notify("Modernization package exported"); };

  return <main className="page workspace-page">
    <section className="page-head"><div><p className="eyebrow">Workspace / Cell 04 / PICKPLACE.V2</p><h1>Legacy modernization workspace</h1><p className="page-subtitle">Parse source intent, document decisions, and build a reviewable verification package.</p></div><div className="head-actions"><button className="button secondary" onClick={() => copy(source, "Source copied")}><Copy size={15}/> Copy</button><button className="button secondary" onClick={exportPackage}><Download size={15}/> Export</button><button className={`button ${reviewed ? "reviewed" : "primary"}`} onClick={() => setReviewOpen(!reviewOpen)}>{reviewed ? <Check size={15}/> : <UserCheck size={15}/>} {reviewed ? "Reviewed" : "Engineer review"}</button></div></section>
    <section className="workspace-grid">
      <article className="panel editor-panel"><div className="panel-title"><span><FileText size={16}/> PICKPLACE.V2</span><div className="editor-badges"><span className={dirty ? "dirty" : "synced"}>{dirty ? "CHANGES NOT PARSED" : "SOURCE SYNCED"}</span><span>{source.split("\n").length} LINES</span></div></div><div className="editor-wrap"><div className="line-numbers" aria-hidden="true">{source.split("\n").map((_, index) => <button tabIndex={-1} className={selectedLine === index + 1 ? "selected" : ""} key={index} onMouseDown={(event) => event.preventDefault()} onClick={() => setSelectedLine(index + 1)}>{String(index + 1).padStart(2, "0")}</button>)}</div><textarea ref={editorRef} aria-label="Editable V+ source program" value={source} onChange={(event) => setSource(event.target.value)} onKeyUp={(event) => { const before = event.currentTarget.value.slice(0, event.currentTarget.selectionStart); setSelectedLine(before.split("\n").length); }} spellCheck={false}/></div><div className="editor-footer"><div className="source-focus"><span>L{selectedLine}</span><code>{source.split("\n")[selectedLine - 1]?.trim() || "—"}</code></div><button className="button parse-button" onClick={runParser}><RefreshCcw size={14}/> Parse source</button></div></article>
      <article className="panel inspector-panel"><div className="inspector-tabs" role="tablist">{tabItems.map((tab) => { const Icon = tab.icon; return <button role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}><Icon size={15}/>{tab.label}{tab.id === "analysis" && parsed.unsupported.length > 0 ? <em>{parsed.unsupported.length}</em> : null}</button>; })}</div><div className="tab-content">{activeTab === "analysis" && <AnalysisTab parsed={parsed} onTrace={trace}/>} {activeTab === "documentation" && <DocumentationTab parsed={parsed} onTrace={trace}/>} {activeTab === "draft" && <DraftTab parsed={parsed} onCopy={copy}/>} {activeTab === "tests" && <TestsTab parsed={parsed} onTrace={trace}/>}</div><div className="inspector-footer"><span className={parsed.unsupported.length ? "warn-dot" : "ok-dot"}/><span>{parsed.unsupported.length ? `${parsed.unsupported.length} unsupported statement requires disposition` : "All executable statements are in the supported grammar"}</span><b>Synthetic · no hardware validation</b></div></article>
    </section>
    {reviewOpen && <aside className="review-drawer" aria-label="Engineer review"><div className="drawer-head"><div><p className="eyebrow">Review checkpoint</p><h2>Engineer disposition</h2></div><button className="icon-button" onClick={() => setReviewOpen(false)} aria-label="Close review"><X size={18}/></button></div><label>Reviewer<input value={reviewer} onChange={(event) => setReviewer(event.target.value)}/></label><label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)}/></label><div className="review-checks"><span><CheckCircle2 size={15}/> {parsed.findings.length} findings read</span><span><AlertTriangle size={15}/> {parsed.unsupported.length + 2} open assumptions/TODOs</span></div><button className="button primary full" onClick={() => { setReviewed(true); setReviewOpen(false); notify("Review checkpoint recorded locally"); }}><FileCheck2 size={15}/> Record local review</button><p className="microcopy">This records a demonstration review state only. It is not safety approval or certification.</p></aside>}
  </main>;
}

function Workcell({ mode, step, compare }: { mode: "reference" | "draft"; step: number; compare: boolean }) {
  const sequence = mode === "reference" ? referenceSequence : draftSequence;
  const current = sequence[step];
  const elbowX = 235 + (current.x - 235) * 0.42;
  const elbowY = 104 + (current.y - 104) * 0.22;
  const refPath = referenceSequence.map((point) => `${point.x},${point.y}`).join(" ");
  const draftPath = draftSequence.map((point) => `${point.x},${point.y}`).join(" ");
  return <svg className="workcell" viewBox="0 0 520 270" role="img" aria-label={`Synthetic workcell showing ${mode} sequence at ${current.name}`}>
    <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1b2831" strokeWidth="1"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="520" height="270" rx="12" fill="#090e13"/><rect width="520" height="270" rx="12" fill="url(#grid)"/>
    <path d="M25 225 H495" stroke="#263641" strokeWidth="2"/><rect x="314" y="206" width="76" height="19" rx="3" fill="#18252d" stroke="#3e5661"/><rect x="407" y="205" width="73" height="20" rx="3" fill="#18252d" stroke="#3e5661"/>
    <text x="326" y="220" fill="#71848e" fontSize="9">PICK FIXTURE</text><text x="418" y="220" fill="#71848e" fontSize="9">PLACE NEST</text>
    {compare && <><polyline points={refPath} fill="none" stroke="#42dec9" strokeWidth="2" strokeDasharray="4 5" opacity=".65"/><polyline points={draftPath} fill="none" stroke="#d9a45b" strokeWidth="2" strokeDasharray="2 6" opacity=".75"/></>}
    <rect x="142" y="215" width="77" height="12" rx="3" fill="#24333c" stroke="#415865"/><path d="M160 214 L173 181 H205 L216 214" fill="#14212a" stroke="#607683" strokeWidth="2"/><circle cx="189" cy="173" r="14" fill="#182830" stroke="#43dfca" strokeWidth="3"/>
    <line x1="189" y1="173" x2={elbowX} y2={elbowY} stroke="#7d949e" strokeWidth="14" strokeLinecap="round"/><circle cx={elbowX} cy={elbowY} r="11" fill="#152028" stroke="#43dfca" strokeWidth="3"/><line x1={elbowX} y1={elbowY} x2={current.x} y2={current.y} stroke="#91a8b1" strokeWidth="11" strokeLinecap="round"/><circle cx={current.x} cy={current.y} r="9" fill="#152028" stroke={mode === "reference" ? "#43dfca" : "#e4a959"} strokeWidth="3" filter="url(#glow)"/>
    <path d={`M${current.x - 7} ${current.y + 8} L${current.x - 10} ${current.y + 19} M${current.x + 7} ${current.y + 8} L${current.x + 10} ${current.y + 19}`} stroke={current.gripper ? "#43dfca" : "#aebec5"} strokeWidth="3" strokeLinecap="round"/>{current.gripper && <rect x={current.x - 7} y={current.y + 18} width="14" height="10" rx="2" fill="#e3a759" filter="url(#glow)"/>}
    <g transform="translate(18 18)"><rect width="148" height="30" rx="6" fill="#0d171d" stroke="#243740"/><circle cx="17" cy="15" r="4" fill={mode === "reference" ? "#43dfca" : "#e4a959"}/><text x="30" y="19" fill="#c5d3d9" fontSize="11">{mode.toUpperCase()} · {current.name}</text></g><text x="430" y="24" fill="#526570" fontSize="9">VIRTUAL CELL 04</text>
  </svg>;
}

function SequenceTimeline({ mode, step }: { mode: "reference" | "draft"; step: number }) {
  const sequence = mode === "reference" ? referenceSequence : draftSequence;
  return <div className="sequence-list">{sequence.map((event, index) => <div className={`sequence-event ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} key={`${event.name}-${index}`}><span className="sequence-index">{index < step ? <Check size={12}/> : index + 1}</span><div><b>{event.name}</b><small>{event.action} · {event.source}</small></div><time>{event.duration.toFixed(1)}s</time></div>)}</div>;
}

function SimulationLab({ notify }: { notify: (message: string) => void }) {
  const [mode, setMode] = useState<"reference" | "draft">("reference");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [compare, setCompare] = useState(false);
  const sequence = mode === "reference" ? referenceSequence : draftSequence;
  const current = sequence[step];
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= sequence.length - 1) { setRunning(false); notify(`${mode === "reference" ? "Reference" : "Draft"} sequence completed`); }
      else setStep((value) => value + 1);
    }, Math.max(650, current.duration * 800));
    return () => window.clearTimeout(timer);
  }, [running, step, sequence.length, current.duration, mode, notify]);
  const reset = () => { setRunning(false); setStep(0); notify("Simulation reset"); };
  const changeMode = (next: "reference" | "draft") => { setMode(next); setStep(0); setRunning(false); };
  const cycleTime = sequence.reduce((sum, event) => sum + event.duration, 0);
  return <section className="simulation-grid">
    <article className="panel sim-panel"><div className="panel-title"><div className="segmented"><button className={mode === "reference" ? "active" : ""} onClick={() => changeMode("reference")}>Reference</button><button className={mode === "draft" ? "active draft" : ""} onClick={() => changeMode("draft")}>Draft</button></div><span className="virtual-badge"><Box size={14}/> SVG DIGITAL TWIN</span></div><div className="workcell-wrap"><Workcell mode={mode} step={step} compare={compare}/></div><div className="sim-console"><div className="sim-controls"><button className="control primary-control" onClick={() => { if (step === sequence.length - 1) setStep(0); setRunning(!running); }}>{running ? <Pause size={17}/> : <Play size={17}/>}<span>{running ? "Pause" : step === sequence.length - 1 ? "Replay" : "Run"}</span></button><button className="control" onClick={reset}><RotateCcw size={17}/><span>Reset</span></button><button className={`control ${compare ? "active" : ""}`} onClick={() => setCompare(!compare)}><GitCompareArrows size={17}/><span>Compare</span></button></div><div className="io-strip"><div><span className={current.gripper ? "io on" : "io"}/><p>DO-01 <b>{current.gripper ? "ON" : "OFF"}</b></p></div><div><span className="io on"/><p>Servo <b>READY</b></p></div><div><span className={running ? "io amber" : "io"}/><p>Motion <b>{running ? "ACTIVE" : "IDLE"}</b></p></div><div><Gauge size={14}/><p>Cycle <b>{cycleTime.toFixed(1)}s</b></p></div></div></div></article>
    <article className="panel events-panel"><div className="panel-title"><span><Activity size={16}/> Motion events</span><span>{step + 1}/{sequence.length}</span></div><SequenceTimeline mode={mode} step={step}/><div className="event-detail"><p className="label">Current assertion</p><h3>{current.name}</h3><p>{current.action} at virtual coordinate ({current.x}, {current.y}); gripper output is {current.gripper ? "energized" : "de-energized"}.</p></div></article>
  </section>;
}

function OutcomeStrip() {
  const outcomes = [
    { label: "Event order", value: "6 / 6", state: "pass", detail: "Sequence aligned" },
    { label: "I/O transitions", value: "4 / 4", state: "pass", detail: "Order preserved" },
    { label: "Max path delta", value: "6.4 mm", state: "warn", detail: "Review tolerance" },
    { label: "Collision checks", value: "0", state: "pass", detail: "Virtual model only" },
  ];
  return <section className="outcome-strip">{outcomes.map((outcome) => <article key={outcome.label}><span className={`outcome-icon ${outcome.state}`}>{outcome.state === "pass" ? <Check size={14}/> : <AlertTriangle size={14}/>}</span><div><p>{outcome.label}</p><strong>{outcome.value}</strong><small>{outcome.detail}</small></div></article>)}</section>;
}

function EffortEvaluation({ notify }: { notify: (message: string) => void }) {
  const [rows, setRows] = useState<EffortRow[]>(initialEffort);
  const update = (index: number, key: keyof EffortRow, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === "activity" ? value : Math.max(0, Number(value)) } : row));
  const sum = (key: keyof EffortRow) => rows.reduce((total, row) => total + (typeof row[key] === "number" ? row[key] as number : 0), 0);
  const manualHours = sum("manualHours"); const assistedHours = sum("assistedHours"); const timeSaved = manualHours - assistedHours;
  const timePercent = manualHours ? Math.round((timeSaved / manualHours) * 100) : 0;
  const avg = (key: keyof EffortRow) => rows.length ? sum(key) / rows.length : 0;
  const reworkReduction = avg("manualRework") - avg("assistedRework"); const qualityGain = avg("assistedQuality") - avg("manualQuality");
  const chartData = rows.map((row) => ({ name: row.activity.split(" ")[0], Manual: row.manualHours, "AI-assisted": row.assistedHours }));
  const exportResults = () => { downloadFile("vplusbridge-evaluation-results.json", JSON.stringify({ generatedAt: new Date().toISOString(), disclaimer: "Synthetic evaluation; not hardware or safety certification", effort: rows, metrics: { manualHours, assistedHours, timeSaved, timePercent, reworkReduction, assistedQuality: avg("assistedQuality"), qualityGain } }, null, 2)); notify("Evaluation results exported"); };
  const numericKeys = ["manualHours", "assistedHours", "manualRework", "assistedRework", "manualQuality", "assistedQuality"] as (keyof EffortRow)[];
  return <section className="evaluation-section">
    <div className="section-heading"><div><p className="eyebrow">Evaluation model</p><h2>Human effort and output quality</h2><p>Edit any value to recalculate the synthetic comparison.</p></div><button className="button secondary" onClick={exportResults}><Download size={15}/> Export results</button></div>
    <div className="evaluation-layout"><article className="panel effort-panel"><div className="effort-table-wrap"><table className="effort-table"><thead><tr><th>Activity</th><th>Manual h</th><th>AI-assisted h</th><th>Manual rework %</th><th>Assisted rework %</th><th>Manual quality</th><th>Assisted quality</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.activity}><td>{row.activity}</td>{numericKeys.map((key) => <td key={key}><input aria-label={`${row.activity} ${key}`} type="number" min="0" max={String(key).includes("Quality") || String(key).includes("Rework") ? 100 : undefined} step={String(key).includes("Hours") ? .5 : 1} value={row[key]} onChange={(event) => update(index, key, event.target.value)}/></td>)}</tr>)}</tbody></table></div><div className="effort-chart"><BarChart responsive style={{ width: "100%", height: "100%" }} data={chartData} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}><CartesianGrid stroke="#1b2831" vertical={false}/><XAxis dataKey="name" stroke="#647681" tickLine={false} axisLine={false} fontSize={11}/><YAxis stroke="#647681" tickLine={false} axisLine={false} fontSize={11}/><Tooltip cursor={{ fill: "#14212a" }} contentStyle={{ background: "#0b1217", border: "1px solid #263740", borderRadius: 8, fontSize: 12 }}/><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }}/><Bar dataKey="Manual" fill="#536772" radius={[4,4,0,0]}/><Bar dataKey="AI-assisted" fill="#43dfca" radius={[4,4,0,0]}/></BarChart></div></article>
      <aside className="metric-stack"><div className="impact-card accent"><div className="impact-icon"><Clock3 size={18}/></div><p>Time saved</p><strong>{timeSaved.toFixed(1)} h</strong><span>{timePercent}% faster across this example</span></div><div className="impact-card"><div className="impact-icon"><TimerReset size={18}/></div><p>Rework reduction</p><strong>{reworkReduction.toFixed(1)} pts</strong><span>{avg("assistedRework").toFixed(1)}% assisted average</span></div><div className="impact-card"><div className="impact-icon"><Sparkles size={18}/></div><p>Output quality</p><strong>{avg("assistedQuality").toFixed(0)} / 100</strong><span>+{qualityGain.toFixed(1)} points vs manual</span></div></aside>
    </div>
  </section>;
}

function FailureExplorer() {
  const [selected, setSelected] = useState(failurePatterns[0].id);
  const active = failurePatterns.find((pattern) => pattern.id === selected) ?? failurePatterns[0];
  return <section className="research-grid">
    <article className="panel failure-panel"><div className="panel-title"><span><Search size={16}/> Failure pattern explorer</span><span>4 patterns</span></div><div className="failure-body"><div className="failure-list">{failurePatterns.map((pattern) => <button className={selected === pattern.id ? "active" : ""} key={pattern.id} onClick={() => setSelected(pattern.id)}><span><i className={pattern.severity === "High" ? "high" : "medium"}/>{pattern.tag}</span><b>{pattern.title}</b><ChevronRight size={15}/></button>)}</div><div className="failure-detail"><div className="failure-title"><div><p className="label">{active.severity} severity · {active.tag}</p><h3>{active.title}</h3></div><span>{active.sources}</span></div><dl><div><dt>Observed signature</dt><dd>{active.signature}</dd></div><div><dt>Likely migration cause</dt><dd>{active.cause}</dd></div><div><dt>Verification response</dt><dd>{active.mitigation}</dd></div></dl></div></div></article>
    <article className="panel research-panel"><div className="panel-title"><span><BookOpen size={16}/> Research summary</span><span>synthetic study</span></div><div className="research-content"><div className="research-stat"><strong>3.1×</strong><span>analysis throughput in the modeled task set</span></div><div className="research-stat"><strong>100%</strong><span>finding-to-source trace coverage</span></div><div className="research-stat"><strong>0</strong><span>claims of automatic safety equivalence</span></div><hr/><h3>Interpretation</h3><p>Deterministic extraction is most useful for inventory, traceability, and repeatable review artifacts. Engineering value comes from exposing uncertainty—not silently resolving it.</p><ul><li><Check size={13}/> Keep unsupported syntax visible.</li><li><Check size={13}/> Separate source fact from inferred intent.</li><li><Check size={13}/> Use simulation as evidence, not certification.</li></ul><div className="callout amber"><Info size={15}/><p>Illustrative results only. No real robot, production controller, or safety function was tested.</p></div></div></article>
  </section>;
}

function VerificationPage({ notify }: { notify: (message: string) => void }) {
  return <main className="page verification-page"><section className="page-head"><div><p className="eyebrow">Virtual lab / Evaluation run 0042</p><h1>Verification & evaluation</h1><p className="page-subtitle">Compare motion intent, inspect I/O behavior, and quantify a synthetic modernization workflow.</p></div><div className="run-meta"><span><i/> Environment ready</span><span>MODEL <b>VB-CELL-04</b></span><span>RATE <b>1.0×</b></span></div></section><SimulationLab notify={notify}/><OutcomeStrip/><EffortEvaluation notify={notify}/><FailureExplorer/></main>;
}

export default function App() {
  const initialPage: Page = window.location.pathname.startsWith("/verification") ? "verification" : "workspace";
  const [page, setPage] = useState<Page>(initialPage);
  const [source, setSource] = useState(SAMPLE_PROGRAM);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const notify = (message: string) => { setToast(message); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 2600); };
  const navigate = (next: Page) => { const path = next === "verification" ? "/verification" : "/"; window.history.pushState({}, "", path); setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { const pop = () => setPage(window.location.pathname.startsWith("/verification") ? "verification" : "workspace"); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  useEffect(() => {
    const context = document.modelContext; if (!context?.registerTool) return; const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({ name: "set_vplus_source", title: "Set V+ source", description: "Replace the editable V+ program in the modernization workspace.", inputSchema: { type: "object", properties: { source: { type: "string", minLength: 1 } }, required: ["source"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute(input) { const value = input as { source?: unknown }; if (typeof value.source !== "string" || !value.source.trim()) throw new Error("source must be a non-empty string"); setSource(value.source); setPage("workspace"); window.history.pushState({}, "", "/"); return { updated: true, lineCount: value.source.split("\n").length }; } }, { signal: lifecycle.signal });
      await context.registerTool({ name: "navigate_lab_page", title: "Open lab page", description: "Navigate to either the modernization workspace or virtual verification page.", inputSchema: { type: "object", properties: { page: { type: "string", enum: ["workspace", "verification"] } }, required: ["page"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { const value = input as { page?: string }; if (value.page !== "workspace" && value.page !== "verification") throw new Error("page must be workspace or verification"); navigate(value.page); return { page: value.page }; } }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined); return () => lifecycle.abort();
  }, []);
  return <div className="app-shell"><Header page={page} navigate={navigate}/>{page === "workspace" ? <WorkspacePage source={source} setSource={setSource} notify={notify}/> : <VerificationPage notify={notify}/>}<footer className="site-footer"><span>VPlusBridge AI · Legacy modernization research prototype</span><span><ShieldAlert size={13}/> No hardware control, safety certification, or production migration</span></footer>{toast && <Toast message={toast}/>}</div>;
}
