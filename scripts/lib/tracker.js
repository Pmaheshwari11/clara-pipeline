export async function createTaskTrackerItem(
  accountId,
  companyName,
  version,
  memo,
) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "username/repo-name"

  if (!token || !repo) {
    // Fallback to local tasks.json if no GitHub config
    await writeLocalTask(accountId, companyName, version, memo);
    return;
  }

  const title = `[${version.toUpperCase()}] New account: ${companyName}`;
  const body = `
## Clara Onboarding Task

**Account ID:** ${accountId}
**Company:** ${companyName}
**Version:** ${version}
**Created:** ${new Date().toISOString()}

## Questions / Unknowns
${
  memo.questions_or_unknowns?.length
    ? memo.questions_or_unknowns.map((q) => `- [ ] ${q}`).join("\n")
    : "- None"
}

## Next Steps
- [ ] Review generated agent spec
- [ ] Confirm missing fields with client
- [ ] Test agent on Retell
- [ ] Go live
  `;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ title, body }),
    });

    const data = await res.json();
    if (data.html_url) {
      console.log(`🎫 GitHub Issue created: ${data.html_url}`);
    } else {
      console.warn("⚠️ GitHub Issue failed:", JSON.stringify(data));
      await writeLocalTask(accountId, companyName, version, memo);
    }
  } catch (err) {
    console.warn("⚠️ GitHub Issue error, falling back to local:", err.message);
    await writeLocalTask(accountId, companyName, version, memo);
  }
}

async function writeLocalTask(accountId, companyName, version, memo) {
  const { saveJSON } = await import("./storage.js");
  const tasksPath = "outputs/tasks.json";

  let tasks = [];
  try {
    const { readFileSync, existsSync } = await import("fs");
    if (existsSync(tasksPath)) {
      tasks = JSON.parse(readFileSync(tasksPath, "utf-8"));
    }
  } catch {}

  tasks.push({
    id: `task_${Date.now()}`,
    account_id: accountId,
    company_name: companyName,
    version,
    created_at: new Date().toISOString(),
    status: "pending",
    questions_or_unknowns: memo.questions_or_unknowns || [],
    next_steps: [
      "Review generated agent spec",
      "Confirm missing fields with client",
      "Test agent on Retell",
      "Go live",
    ],
  });

  saveJSON(tasksPath, tasks);
  console.log(`🎫 Task saved locally: outputs/tasks.json`);
}
