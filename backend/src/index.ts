import cors from "cors";
import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const fontDirectory = path.resolve(process.cwd(), "fonts");

app.use(cors());
app.use(express.json());

const supportedFontExtensions = new Set([".woff2", ".woff", ".ttf", ".otf", ".eot"]);

type FontRecord = {
  file: string;
  family: string;
  format: string;
  url: string;
};

function getFontFormat(fileName: string): string {
  return path.extname(fileName).toLowerCase().replace(".", "");
}

function fileNameToFamily(fileName: string): string {
  const ext = path.extname(fileName);
  return path.basename(fileName, ext).replace(/[-_]+/g, " ").trim() || "Unnamed Font";
}

function safeFontPath(filename: string): string {
  return path.resolve(fontDirectory, path.basename(filename));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tadpole-backend", fontDirectory });
});

app.get("/api/fonts", async (_req, res) => {
  let files: string[] = [];

  try {
    files = await fs.readdir(fontDirectory);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return res.json([]);
    }
    return res.status(500).json({ error: "Unable to read font directory" });
  }

  const list: FontRecord[] = files
    .filter((file) => supportedFontExtensions.has(path.extname(file).toLowerCase()))
    .map((file) => ({
      file,
      family: fileNameToFamily(file),
      format: getFontFormat(file),
      url: `/api/fonts/${encodeURIComponent(file)}`,
    }));

  res.json(list);
});

app.get("/api/fonts/:filename", async (req, res) => {
  const requested = req.params.filename;
  const targetPath = safeFontPath(requested);

  if (!targetPath.startsWith(fontDirectory + path.sep)) {
    return res.status(400).json({ error: "Invalid font path" });
  }

  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: "Font not found" });
    }

    res.sendFile(targetPath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return res.status(404).json({ error: "Font not found" });
    }
    return res.status(500).json({ error: "Failed to fetch font" });
  }
});

app.get("/api/fonts/:filename/stylesheet", async (req, res) => {
  const requested = req.params.filename;
  const targetPath = safeFontPath(requested);

  if (!targetPath.startsWith(fontDirectory + path.sep)) {
    return res.status(400).json({ error: "Invalid font path" });
  }

  try {
    await fs.access(targetPath);
    const format = getFontFormat(requested);
    const family = fileNameToFamily(requested);
    const href = `/api/fonts/${encodeURIComponent(requested)}`;

    const css = `@font-face {\n  font-family: "${family}";\n  src: url("${href}") format("${format}");\n  font-display: swap;\n}\n`;

    res.type("text/css").send(css);
  } catch {
    return res.status(404).json({ error: "Font not found" });
  }
});

app.listen(port, () => {
  console.log(`\ud83e\udd3a Tadpole backend running at http://localhost:${port}`);
});
