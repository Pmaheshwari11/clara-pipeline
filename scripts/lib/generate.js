export async function generateAgentSpec(memo, apiKey) {
  const prompt = `
You are an AI that generates voice agent configuration specs for Clara Answers.
Clara is an AI voice receptionist for service trade businesses.
Using the account memo below, generate a Retell Agent Spec JSON.
Rules:
- Never mention function calls, tools, or AI to the caller
- Always collect name and phone before transferring
- Business hours flow: greet, ask purpose, collect name + number, transfer, fallback if fails, ask if anything else, close
- After hours flow: greet, ask purpose, confirm emergency, if emergency collect name + number + address then transfer, if fails apologize and assure followup, if non-emergency collect details and confirm next business day followup, close
- Only mention pricing if customer asks
- Return ONLY valid JSON. No explanation. No markdown. No backticks.

Output schema:
{
  "agent_name": string,
  "version": string,
  "voice_style": string,
  "timezone": string,
  "business_hours": object,
  "system_prompt": string,
  "key_variables": object,
  "call_transfer_protocol": object,
  "fallback_protocol": object
}

Account Memo:
${JSON.stringify(memo, null, 2)}
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
