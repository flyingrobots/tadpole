import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "frontend/src/EditorCommands.ts",
  "frontend/src/InvalidSvgLayerRow.ts",
  "frontend/src/SvgLayerRow.ts",
  "frontend/src/SvgNativeSave.ts",
  "frontend/src/SvgLayerTree.ts",
  "frontend/src/SvgTargetMetadata.ts",
];

const output = execFileSync(
  "npx",
  ["tsc", "-p", "frontend/tsconfig.systems.json", "--noEmit", "--listFiles", "--pretty", "false"],
  { cwd: root, encoding: "utf8" },
);

const listedFiles = new Set(output.split(/\r?\n/u).filter((line) => line.trim() !== ""));
const missingFiles = requiredFiles.filter((filePath) => !listedFiles.has(path.join(root, filePath)));

if (missingFiles.length > 0) {
  console.error("Systems typecheck coverage is incomplete:");
  console.error(missingFiles.join("\n"));
  process.exitCode = 1;
}
