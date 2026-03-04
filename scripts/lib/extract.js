export async function extractMemo(transcriptPath, accountId, version, apiKey) {
  const { readFileSync } = await import("fs");
  const transcript = readFileSync(transcriptPath, "utf-8");

  const prompt = `
You are an AI that extracts structured configuration data from call transcripts for a voice agent system.
Extract the following fields from the transcript below. 
Only extract what is explicitly stated. 
Do not invent or assume missing details.
If a field is missing, set it to null or empty array.
For questions_or_unknowns, list only fields that are truly missing but needed.
Return ONLY valid JSON. No explanation. No markdown. No backticks.

Schema:
{
  "account_id": string,
  "version": string,
  "company_name": string,
  "office_address": string,
  "contact": { "primary_name": string, "email": string, "phone": string },
  "business_hours": { "days": array, "start": string, "end": string, "timezone": string },
  "services_supported": array of strings,
  "pricing": { "service_call_fee": string, "hourly_rate": string, "increment": string, "mention_on_call": boolean },
  "emergency_definition": array of strings,
  "emergency_routing_rules": { "allowed_customers": array, "transfer_to": string, "order": array, "fallback": string },
  "non_emergency_routing_rules": { "action": string, "collect": array, "message": string },
  "call_transfer_rules": { "timeout_seconds": number, "retries": number, "what_to_say_if_fails": string },
  "integration_constraints": array of strings,
  "after_hours_flow_summary": string,
  "office_hours_flow_summary": string,
  "notification_settings": { "email": string, "sms_number": string },
  "integration": { "crm": string, "status": string },
  "questions_or_unknowns": array of strings,
  "notes": string
}

Use account_id: "${accountId}"
Use version: "${version}"
Transcript:
${transcript}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  const data = await res.json();
  if (!data.candidates) {
    console.error("❌ Gemini error:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
  const raw = data.candidates[0].content.parts[0].text;
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}
