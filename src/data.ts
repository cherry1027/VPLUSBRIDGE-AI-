export const SAMPLE_PROGRAM = `.PROGRAM pallet_transfer()
  ; Synthetic Adept/V+ demonstration
  SPEED 80 ALWAYS
  MOVE home
  SIGNAL 1
  DELAY 0.20
  MOVES pick, 50
  DELAY 0.10
  SIGNAL -1
  MOVE place
  SIGNAL 1
  DELAY 0.25
  SIGNAL -1
  TYPE "Cycle complete"
  MOVE home
.END`;

export type MotionStep = { name: string; action: string; x: number; y: number; duration: number; gripper: boolean; source: string };

export const referenceSequence: MotionStep[] = [
  { name: "Home", action: "Joint move", x: 226, y: 112, duration: 0.8, gripper: false, source: "L4" },
  { name: "Approach pick", action: "Linear approach", x: 328, y: 125, duration: 0.7, gripper: false, source: "L7" },
  { name: "Pick", action: "Grip part", x: 348, y: 196, duration: 0.5, gripper: true, source: "L9" },
  { name: "Transfer", action: "Joint transfer", x: 406, y: 106, duration: 1.1, gripper: true, source: "L10" },
  { name: "Place", action: "Release part", x: 438, y: 190, duration: 0.6, gripper: false, source: "L11–L13" },
  { name: "Return", action: "Joint move", x: 226, y: 112, duration: 0.8, gripper: false, source: "L15" },
];

export const draftSequence: MotionStep[] = [
  { name: "Home", action: "Joint move", x: 226, y: 112, duration: 0.8, gripper: false, source: "L4" },
  { name: "Approach pick", action: "Linear approach", x: 326, y: 127, duration: 0.8, gripper: false, source: "L7" },
  { name: "Pick", action: "Grip part", x: 351, y: 194, duration: 0.7, gripper: true, source: "L9" },
  { name: "Transfer", action: "Joint transfer", x: 410, y: 111, duration: 1.2, gripper: true, source: "L10" },
  { name: "Place", action: "Release part", x: 442, y: 188, duration: 0.7, gripper: false, source: "L11–L13" },
  { name: "Return", action: "Joint move", x: 226, y: 112, duration: 0.9, gripper: false, source: "L15" },
];

export const failurePatterns = [
  { id: "io-polarity", title: "Reversed I/O polarity", tag: "I/O", severity: "High", signature: "Part releases immediately after pick or remains held after place.", cause: "SIGNAL sign was mapped as boolean state without checking the cell electrical convention.", mitigation: "Confirm output 1 active state; force both transitions in a virtual I/O harness before motion testing.", sources: "L5, L9, L11, L13" },
  { id: "frame-shift", title: "Reference-frame shift", tag: "Motion", severity: "High", signature: "Trajectory shape is correct but every pose is displaced by a consistent vector.", cause: "Taught points were migrated without the original tool or base frame definition.", mitigation: "Capture frame metadata, then compare three non-collinear calibration poses before cycle playback.", sources: "L4, L7, L10, L15" },
  { id: "blend-loss", title: "Motion blend lost", tag: "Timing", severity: "Medium", signature: "Cycle time rises and the robot stops at intermediate waypoints.", cause: "A V+ motion qualifier has no verified target-platform equivalent.", mitigation: "Keep the qualifier as a TODO; compare velocity profiles before enabling any target blend.", sources: "L7" },
  { id: "delay-unit", title: "Delay unit mismatch", tag: "Timing", severity: "Medium", signature: "Grip dwell is 10× or 1000× longer than the reference cycle.", cause: "DELAY values were interpreted with the wrong target time unit.", mitigation: "Normalize all waits to seconds and assert the measured dwell against source intent.", sources: "L6, L8, L12" },
];

export type EffortRow = { activity: string; manualHours: number; assistedHours: number; manualRework: number; assistedRework: number; manualQuality: number; assistedQuality: number };
export const initialEffort: EffortRow[] = [
  { activity: "Source analysis", manualHours: 8, assistedHours: 2.5, manualRework: 18, assistedRework: 7, manualQuality: 72, assistedQuality: 91 },
  { activity: "Documentation", manualHours: 6, assistedHours: 1.5, manualRework: 14, assistedRework: 5, manualQuality: 76, assistedQuality: 94 },
  { activity: "Draft translation", manualHours: 12, assistedHours: 4, manualRework: 24, assistedRework: 10, manualQuality: 68, assistedQuality: 88 },
  { activity: "Verification design", manualHours: 10, assistedHours: 3, manualRework: 20, assistedRework: 8, manualQuality: 74, assistedQuality: 92 },
];
