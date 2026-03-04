import fs from "fs";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

import { extractMemo } from "./lib/extract.js";
import { generateAgentSpec } from "./lib/generate.js";
import { deepMerge, generateChangelog } from "./lib/merge.js";
import { getNextVersion, registerAccount } from "./lib/account.js";
import { saveJSON, initAccountFolder } from "./lib/storage.js";
import { createTaskTrackerItem } from "./lib/tracker.js";
import { prepareTranscript } from "./lib/transcribe.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getPendingOnboardingAccounts() {
  const base = "outputs/accounts";
  if (!fs.existsSync(base)) return [];

  const pending = [];

  for (const accountId of fs.readdirSync(base)) {
    const accountPath = `${base}/${accountId}`;
    const versions = fs
      .readdirSync(accountPath)
      .filter((f) => f.startsWith("v"));

    const hasV1 = versions.includes("v1");
    const hasV2 = versions.includes("v2");

    if (hasV1 && !hasV2) {
      const memoPath = `${accountPath}/v1/memo.json`;
      if (fs.existsSync(memoPath)) {
        const memo = JSON.parse(fs.readFileSync(memoPath, "utf-8"));
        pending.push({
          accountId,
          companyName: memo.company_name || "Unknown",
          createdAt: memo.version || "v1",
        });
      }
    }
  }

  return pending;
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runPipelineB(inputPath) {
  if (!inputPath) {
    console.error("❌ Usage: node scripts/pipeline_b.js <transcript_or_audio>");
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  // Step 1: Show pending accounts
  const pending = getPendingOnboardingAccounts();

  if (pending.length === 0) {
    console.log("⚠️  No accounts found with demo done but onboarding pending.");
    console.log("Run pipeline_a.js first to create a demo account.");
    process.exit(0);
  }

  console.log("\n📋 Accounts pending onboarding:\n");
  pending.forEach((acc, i) => {
    console.log(`  ${i + 1}. ${acc.companyName}`);
    console.log(`     ID: ${acc.accountId}\n`);
  });

  // Step 2: Let user pick
  const answer = await promptUser("Enter number to select account: ");
  const index = parseInt(answer) - 1;

  if (isNaN(index) || index < 0 || index >= pending.length) {
    console.error("❌ Invalid selection");
    process.exit(1);
  }

  const selected = pending[index];
  console.log(`\n✅ Selected: ${selected.companyName}`);

  // Step 3: Run pipeline
  const transcriptPath = prepareTranscript(inputPath);
  console.log(`\n📄 Processing: ${transcriptPath}`);

  const rawMemo = await extractMemo(
    transcriptPath,
    selected.accountId,
    "temp",
    GEMINI_API_KEY,
  );

  const accountId = selected.accountId;
  const version = getNextVersion(accountId);

  console.log(`🏢 Account: ${accountId}`);
  console.log(`🔖 Version: ${version}`);

  rawMemo.account_id = accountId;
  rawMemo.version = version;
  registerAccount(accountId, rawMemo.company_name || selected.companyName);

  const prevVersion = `v${parseInt(version.replace("v", "")) - 1}`;
  const prevPath = `outputs/accounts/${accountId}/${prevVersion}/memo.json`;
  const prevMemo = JSON.parse(fs.readFileSync(prevPath, "utf-8"));

  const finalMemo = deepMerge(prevMemo, rawMemo);
  finalMemo.version = version;
  console.log(`🔀 Merged with ${prevVersion}`);

  const changelog = generateChangelog(prevMemo, rawMemo, accountId);
  saveJSON(
    `changelog/${accountId}_${prevVersion}_to_${version}.json`,
    changelog,
  );

  initAccountFolder(accountId, version);
  saveJSON(`outputs/accounts/${accountId}/${version}/memo.json`, finalMemo);

  const spec = await generateAgentSpec(finalMemo, GEMINI_API_KEY);
  spec.version = version;
  saveJSON(`outputs/accounts/${accountId}/${version}/agent_spec.json`, spec);

  await createTaskTrackerItem(
    accountId,
    finalMemo.company_name || selected.companyName,
    version,
    finalMemo,
  );

  console.log(`\n✅ Done! Account: ${accountId} | Version: ${version}`);
}

runPipelineB(process.argv[2]);
