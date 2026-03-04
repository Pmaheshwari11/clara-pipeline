import fs from "fs";
import path from "path";

export function saveJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filePath}`);
}

export function initAccountFolder(accountId, version) {
  const dir = `outputs/accounts/${accountId}/${version}`;
  fs.mkdirSync(dir, { recursive: true });
  console.log(`📁 Created: ${dir}`);
  return dir;
}
