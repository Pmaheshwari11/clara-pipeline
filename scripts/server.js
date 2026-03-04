import express from "express";
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

app.post("/run-pipeline-a", (req, res) => {
  const { transcriptPath, accountId } = req.body;

  if (!transcriptPath) {
    return res
      .status(400)
      .json({ success: false, error: "transcriptPath required" });
  }

  try {
    const cmd = accountId
      ? `node scripts/pipeline_a.js "${transcriptPath}" "${accountId}"`
      : `node scripts/pipeline_a.js "${transcriptPath}"`;

    const output = execSync(cmd, { encoding: "utf-8", cwd: process.cwd() });
    return res.json({ success: true, output, transcriptPath, accountId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/run-pipeline-b", (req, res) => {
  const { transcriptPath } = req.body;

  if (!transcriptPath) {
    return res
      .status(400)
      .json({ success: false, error: "transcriptPath required" });
  }

  try {
    const output = execSync(`node scripts/pipeline_b.js "${transcriptPath}"`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    });
    return res.json({ success: true, output, transcriptPath });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () =>
  console.log("✅ Clara API running on http://localhost:3000"),
);
