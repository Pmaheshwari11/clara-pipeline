import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { extractMemo } from "./lib/extract.js";
import { generateAgentSpec } from "./lib/generate.js";
import { deepMerge, generateChangelog } from "./lib/merge.js";
import {
  getOrCreateAccountId,
  getNextVersion,
  registerAccount,
  resolveAccountId,
} from "./lib/account.js";
import { saveJSON, initAccountFolder } from "./lib/storage.js";
import { createTaskTrackerItem } from "./lib/tracker.js";
import { prepareTranscript } from "./lib/transcribe.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function runPipeline(inputPath, manualAccountId) {
  if (!inputPath) {
    console.error(
      "❌ Usage: node scripts/pipeline.js <file.txt|mp4|mp3|m4a> [account_id]",
    );
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  // Auto-transcribe if audio/video
  const transcriptPath = prepareTranscript(inputPath);

  console.log(`\n📄 Processing: ${transcriptPath}`);

  const rawMemo = await extractMemo(
    transcriptPath,
    "unknown",
    "temp",
    GEMINI_API_KEY,
  );
  const accountId =
    resolveAccountId(manualAccountId) ||
    getOrCreateAccountId(rawMemo.company_name || "Unknown");
  const version = getNextVersion(accountId);

  console.log(`🏢 Account: ${accountId}`);
  console.log(`🔖 Version: ${version}`);

  rawMemo.account_id = accountId;
  rawMemo.version = version;
  registerAccount(accountId, rawMemo.company_name || "Unknown");

  let finalMemo = rawMemo;
  if (version !== "v1") {
    const prevVersion = `v${parseInt(version.replace("v", "")) - 1}`;
    const prevPath = `outputs/accounts/${accountId}/${prevVersion}/memo.json`;
    if (fs.existsSync(prevPath)) {
      const prevMemo = JSON.parse(fs.readFileSync(prevPath, "utf-8"));
      finalMemo = deepMerge(prevMemo, rawMemo);
      finalMemo.version = version;
      console.log(`🔀 Merged with ${prevVersion}`);
      const changelog = generateChangelog(prevMemo, rawMemo, accountId);
      saveJSON(
        `changelog/${accountId}_${prevVersion}_to_${version}.json`,
        changelog,
      );
    }
  }

  initAccountFolder(accountId, version);
  saveJSON(`outputs/accounts/${accountId}/${version}/memo.json`, finalMemo);

  const spec = await generateAgentSpec(finalMemo, GEMINI_API_KEY);
  spec.version = version;
  saveJSON(`outputs/accounts/${accountId}/${version}/agent_spec.json`, spec);
  await createTaskTrackerItem(
    accountId,
    rawMemo.company_name || "Unknown",
    version,
    finalMemo,
  );

  console.log(`\n✅ Done! Account: ${accountId} | Version: ${version}`);
}

runPipeline(process.argv[2], process.argv[3]);
