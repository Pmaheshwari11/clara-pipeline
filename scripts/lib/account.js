import fs from "fs";
import { randomUUID } from "crypto";
import { saveJSON } from "./storage.js";

const REGISTRY_PATH = "outputs/registry.json";

export function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return {};
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
}

export function registerAccount(accountId, companyName) {
  const registry = loadRegistry();
  registry[accountId] = {
    company_name: companyName,
    created_at: new Date().toISOString(),
  };
  saveJSON(REGISTRY_PATH, registry);
  console.log(`📋 Registered: ${companyName} → ${accountId}`);
}

export function resolveAccountId(input) {
  if (!input) return null;
  if (input.match(/^[0-9a-f-]{36}$/)) return input;
  const registry = loadRegistry();
  const match = Object.entries(registry).find(
    ([, val]) => val.company_name.toLowerCase() === input.toLowerCase(),
  );
  if (match) {
    console.log(`🔍 Resolved "${input}" → ${match[0]}`);
    return match[0];
  }
  return null;
}

export function getOrCreateAccountId(companyName) {
  const base = "outputs/accounts";
  if (fs.existsSync(base)) {
    for (const accountId of fs.readdirSync(base)) {
      const memoPath = `${base}/${accountId}/v1/memo.json`;
      if (fs.existsSync(memoPath)) {
        const memo = JSON.parse(fs.readFileSync(memoPath, "utf-8"));
        if (memo.company_name?.toLowerCase() === companyName?.toLowerCase()) {
          console.log(`🔍 Found existing account: ${accountId}`);
          return accountId;
        }
      }
    }
  }
  const id = randomUUID();
  console.log(`🆕 New account created: ${id}`);
  return id;
}

export function getNextVersion(accountId) {
  const base = `outputs/accounts/${accountId}`;
  if (!fs.existsSync(base)) return "v1";
  const versions = fs.readdirSync(base).filter((f) => f.startsWith("v"));
  if (versions.length === 0) return "v1";
  const nums = versions
    .map((v) => parseInt(v.replace("v", "")))
    .filter(Boolean);
  return `v${Math.max(...nums) + 1}`;
}
