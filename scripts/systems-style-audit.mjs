import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const auditedRoots = ["backend/src", "frontend/src", "frontend/vite.config.ts"];
const legacyExclusions = new Set(["frontend/src/App.svelte"]);
const auditedExtensions = new Set([".ts", ".vue", ".svelte"]);

const violations = [];

const isAuditedFile = (filePath) => auditedExtensions.has(path.extname(filePath));

const collectFiles = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  const status = statSync(absolutePath);
  if (status.isFile()) {
    return isAuditedFile(relativePath) && !legacyExclusions.has(relativePath) ? [relativePath] : [];
  }

  return readdirSync(absolutePath)
    .flatMap((entry) => collectFiles(path.join(relativePath, entry)))
    .filter((filePath) => !filePath.includes(`${path.sep}dist${path.sep}`));
};

const stripLineComment = (line) => {
  const marker = line.indexOf("//");
  return marker === -1 ? line : line.slice(0, marker);
};

const addViolation = (filePath, lineNumber, rule, line) => {
  violations.push(`${filePath}:${lineNumber}: ${rule}: ${line.trim()}`);
};

const auditLine = (filePath, lineNumber, rawLine) => {
  const line = stripLineComment(rawLine);
  if (/\bany\b/.test(line)) {
    addViolation(filePath, lineNumber, "no any", rawLine);
  }
  if (/\bunknown\b/.test(line)) {
    addViolation(filePath, lineNumber, "no unknown", rawLine);
  }
  if (/\benum\s+[A-Za-z_$]/.test(line)) {
    addViolation(filePath, lineNumber, "no enum", rawLine);
  }
  if (/\bas\s+(?!const\b)/.test(line)) {
    addViolation(filePath, lineNumber, "no type assertions", rawLine);
  }
  if (/\binterface\s+[A-Za-z_$]/.test(line) && !/Port\b/.test(filePath) && !/ports?\//.test(filePath)) {
    addViolation(filePath, lineNumber, "interfaces are for ports", rawLine);
  }
};

const files = auditedRoots.flatMap(collectFiles);
for (const filePath of files) {
  const text = readFileSync(path.join(root, filePath), "utf8");
  text.split(/\r?\n/).forEach((line, index) => auditLine(filePath, index + 1, line));
}

if (violations.length > 0) {
  console.error("Systems-style TypeScript audit failed:");
  console.error(violations.join("\n"));
  process.exitCode = 1;
}
