export type CommandType =
  | "PROGRAM" | "END" | "MOVE" | "MOVES" | "SPEED" | "SIGNAL" | "DELAY"
  | "COMMENT" | "EMPTY" | "UNSUPPORTED";

export type ParsedLine = {
  line: number; raw: string; type: CommandType; args: string[]; supported: boolean; note: string;
};

export type Finding = {
  kind: "flow" | "dependency" | "assumption" | "warning";
  title: string; detail: string; lines: number[]; verified: boolean;
};

export type TestCase = {
  id: string; title: string; sourceLines: number[]; precondition: string; expected: string;
  status: "ready" | "blocked";
};

const number = "[-+]?\\d*\\.?\\d+";

export function parseVPlus(source: string) {
  const lines: ParsedLine[] = source.split("\n").map((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return { line, raw, type: "EMPTY", args: [], supported: true, note: "Blank line" };
    if (trimmed.startsWith(";") || trimmed.startsWith("//")) {
      return { line, raw, type: "COMMENT", args: [trimmed.replace(/^(;|\/\/)\s*/, "")], supported: true, note: "Comment" };
    }
    let match = trimmed.match(/^\.PROGRAM\s+([A-Za-z_]\w*)\s*(?:\((.*?)\))?\s*$/i);
    if (match) return { line, raw, type: "PROGRAM", args: [match[1], match[2] ?? ""], supported: true, note: "Program declaration" };
    if (/^\.END\s*$/i.test(trimmed)) return { line, raw, type: "END", args: [], supported: true, note: "Program terminator" };
    match = trimmed.match(/^MOVES\s+([A-Za-z_]\w*)(?:\s*,\s*(.+))?\s*$/i);
    if (match) return { line, raw, type: "MOVES", args: [match[1], match[2] ?? ""], supported: true, note: "Straight-line motion" };
    match = trimmed.match(/^MOVE\s+([A-Za-z_]\w*)\s*$/i);
    if (match) return { line, raw, type: "MOVE", args: [match[1]], supported: true, note: "Joint-interpolated motion" };
    match = trimmed.match(new RegExp(`^SPEED\\s+(${number})(?:\\s+(ALWAYS))?\\s*$`, "i"));
    if (match) return { line, raw, type: "SPEED", args: [match[1], match[2] ?? ""], supported: true, note: "Motion speed setting" };
    match = trimmed.match(/^SIGNAL\s+(-?\d+)\s*$/i);
    if (match) return { line, raw, type: "SIGNAL", args: [match[1]], supported: true, note: "Digital output command" };
    match = trimmed.match(new RegExp(`^DELAY\\s+(${number})\\s*$`, "i"));
    if (match) return { line, raw, type: "DELAY", args: [match[1]], supported: true, note: "Timed wait" };
    return { line, raw, type: "UNSUPPORTED", args: [trimmed.split(/\s+/)[0]], supported: false, note: "Outside the supported deterministic grammar" };
  });

  const executable = lines.filter((item) => !["EMPTY", "COMMENT"].includes(item.type));
  const positions = [...new Set(lines.filter((item) => item.type === "MOVE" || item.type === "MOVES").map((item) => item.args[0]))];
  const signals = [...new Set(lines.filter((item) => item.type === "SIGNAL").map((item) => Math.abs(Number(item.args[0]))))];
  const unsupported = lines.filter((item) => item.type === "UNSUPPORTED");
  const program = lines.find((item) => item.type === "PROGRAM");
  const end = lines.find((item) => item.type === "END");
  const motion = lines.filter((item) => item.type === "MOVE" || item.type === "MOVES");
  const delays = lines.filter((item) => item.type === "DELAY");
  const signalLines = lines.filter((item) => item.type === "SIGNAL");

  const findings: Finding[] = [
    { kind: "flow", title: "Single linear execution path", detail: `${motion.length} motion commands execute in source order with ${delays.length} explicit dwell${delays.length === 1 ? "" : "s"}; no branch or loop syntax is in the supported grammar.`, lines: executable.map((item) => item.line), verified: Boolean(program && end) },
    { kind: "dependency", title: `${positions.length} taught position${positions.length === 1 ? "" : "s"} required`, detail: positions.length ? `${positions.map((position) => `“${position}”`).join(", ")} must exist in the target controller position store.` : "No taught positions were detected.", lines: motion.map((item) => item.line), verified: false },
    { kind: "dependency", title: `${signals.length} digital output channel${signals.length === 1 ? "" : "s"}`, detail: signals.length ? `Output ${signals.join(", ")} is written ${signalLines.length} times. Electrical polarity and field wiring are not available in source.` : "No digital outputs were detected.", lines: signalLines.map((item) => item.line), verified: false },
    { kind: "assumption", title: "Timing and gripper semantics are unverified", detail: "The draft treats DELAY values as seconds and positive/negative SIGNAL values as energize/de-energize. Confirm both against the cell I/O map and controller manual.", lines: [...delays, ...signalLines].map((item) => item.line), verified: false },
  ];
  if (!program || !end) findings.push({ kind: "warning", title: "Program boundary incomplete", detail: "A valid .PROGRAM declaration and .END terminator are both required.", lines: [program?.line, end?.line].filter(Boolean) as number[], verified: false });
  unsupported.forEach((item) => findings.push({ kind: "warning", title: `Unsupported statement: ${item.args[0]}`, detail: `Line ${item.line} was preserved but excluded from generated behavior. Resolve it manually before migration.`, lines: [item.line], verified: false }));

  const tests: TestCase[] = [
    { id: "T-01", title: "Program enters and returns to home", sourceLines: motion.filter((item) => item.args[0]?.toLowerCase() === "home").map((item) => item.line), precondition: "All referenced poses are loaded in a virtual controller.", expected: "The first and final home motions complete without a workspace or joint-limit violation.", status: positions.some((position) => position.toLowerCase() === "home") ? "ready" : "blocked" },
    { id: "T-02", title: "Gripper output follows pick/place order", sourceLines: signalLines.map((item) => item.line), precondition: "Output polarity is confirmed against the synthetic I/O map.", expected: "Output transitions preserve the source order and never release during transfer.", status: signalLines.length >= 2 ? "ready" : "blocked" },
    { id: "T-03", title: "Motion mode and speed are preserved", sourceLines: lines.filter((item) => ["MOVE", "MOVES", "SPEED"].includes(item.type)).map((item) => item.line), precondition: "Target platform speed scaling is mapped.", expected: "Joint and straight-line moves retain intent within the configured tolerance.", status: motion.length ? "ready" : "blocked" },
    { id: "T-04", title: "Unsupported source is dispositioned", sourceLines: unsupported.map((item) => item.line), precondition: "Engineer assigns a migrate, replace, or remove decision.", expected: "No unsupported statement reaches the target draft without a recorded TODO.", status: unsupported.length ? "blocked" : "ready" },
  ];
  return { lines, executable, positions, signals, unsupported, findings, tests, programName: program?.args[0] ?? "unnamed_program", validBoundary: Boolean(program && end) };
}

export type ParseResult = ReturnType<typeof parseVPlus>;

export function generateDraft(parsed: ParseResult) {
  const body = parsed.lines.flatMap((item) => {
    const trace = `  // Source L${item.line}`;
    switch (item.type) {
      case "PROGRAM": return [`FUNCTION ${item.args[0]}():${trace}`];
      case "SPEED": return [`  set_motion_speed(${item.args[0]})${trace}`];
      case "MOVE": return [`  move_joint(pose("${item.args[0]}"))${trace}`];
      case "MOVES": return [`  move_linear(pose("${item.args[0]}"))${trace}${item.args[1] ? ` // TODO: map V+ qualifier “${item.args[1]}”` : ""}`];
      case "SIGNAL": return [`  set_digital_output(${Math.abs(Number(item.args[0]))}, ${Number(item.args[0]) > 0 ? "ON" : "OFF"})${trace} // TODO: verify polarity`];
      case "DELAY": return [`  wait_seconds(${item.args[0]})${trace} // TODO: verify time base`];
      case "UNSUPPORTED": return [`  TODO_UNMAPPED(${JSON.stringify(item.raw.trim())})${trace}`];
      case "END": return [`END FUNCTION${trace}`];
      case "COMMENT": return [`  // ${item.args[0]} (Source L${item.line})`];
      default: return [];
    }
  });
  return ["// TARGET-NEUTRAL DRAFT — REVIEW REQUIRED", "// No real hardware or safety behavior is implied.", ...body].join("\n");
}
