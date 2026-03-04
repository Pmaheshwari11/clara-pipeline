# n8n Workflow Setup

## Prerequisites

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and add your keys
```

### 3. Start the Clara API server

The Clara API server must be running before n8n can execute pipelines:

```bash
node scripts/server.js
```

This starts a local Express server on http://localhost:3000

### 4. Start n8n

```bash
docker compose up -d
```

Open http://localhost:5678

---

## Import Workflows

1. Go to Workflows in n8n
2. Click "Add Workflow" → "Import from file"
3. Import `workflows/pipeline_a.json` (demo calls → v1)
4. Import `workflows/pipeline_b.json` (onboarding calls → v2)
5. In each workflow, open the **HTTP Request** node and update the IP:
   ```bash
   # Find your Docker bridge IP
   docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}'
   ```
   Replace `172.17.0.1` in the URL with your bridge IP if different.
6. Activate both workflows using the toggle in the top right

---

## Trigger Pipelines via Webhook

### Pipeline A — Demo call → creates v1 account

```bash
curl -X POST http://localhost:5678/webhook/<pipeline-a-webhook-id> \
  -H "Content-Type: application/json" \
  -d '{"transcriptPath": "transcripts/your_demo_file.txt"}'
```

### Pipeline B — Onboarding call → creates v2 + changelog

```bash
curl -X POST http://localhost:5678/webhook/clara-pipeline-b \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptPath": "transcripts/your_onboarding_file.txt",
    "accountId": "uuid-or-company-name"
  }'
```

> **Note:** Get accountId from `outputs/registry.json` or pass the company name directly (e.g. `"Ben's Electric Solutions"`).

---

## CLI Usage (without n8n)

```bash
# Pipeline A - demo call, auto-creates account
node scripts/pipeline_a.js transcripts/demo.txt

# Pipeline B - interactive mode (shows list of pending accounts)
node scripts/pipeline_b.js transcripts/onboarding.txt

# Pipeline B - non-interactive (pass accountId directly)
node scripts/pipeline_b.js transcripts/onboarding.txt <uuid-or-company-name>
```

---

## Batch Processing

Run Pipeline A on all transcripts in a folder:

```bash
chmod +x scripts/batch.sh

# Using n8n webhook
./scripts/batch.sh transcripts/

# Using a custom webhook URL
./scripts/batch.sh transcripts/ http://localhost:5678/webhook/<your-webhook-id>
```

---

## Supported Input Formats

Both pipelines accept:

| Format | Handling                     |
| ------ | ---------------------------- |
| `.txt` | Used directly as transcript  |
| `.mp4` | Auto-transcribed via Whisper |
| `.mp3` | Auto-transcribed via Whisper |
| `.m4a` | Auto-transcribed via Whisper |
| `.wav` | Auto-transcribed via Whisper |

To use Whisper transcription, install it first:

```bash
python -m venv whisper-env
source whisper-env/bin/activate
pip install openai-whisper
brew install ffmpeg   # Mac
# OR
sudo apt install ffmpeg  # Linux
```

---

## Check Registry

Find all registered accounts and their UUIDs:

```bash
cat outputs/registry.json
```

---

## Output Structure

After running the pipeline, outputs are saved here:

```
outputs/
├── registry.json                          # All accounts + UUIDs
├── tasks.json                             # Task tracker items
└── accounts/
    └── <uuid>/
        ├── v1/
        │   ├── memo.json                  # Extracted account config
        │   └── agent_spec.json            # Retell agent draft
        └── v2/
            ├── memo.json                  # Merged + updated config
            └── agent_spec.json            # Updated agent spec

changelog/
└── <uuid>_v1_to_v2.json                  # What changed and why
```

---

## Architecture

```
Input (txt / mp4 / mp3 / m4a)
          ↓
    [Whisper] (if audio/video)
          ↓
    Gemini 2.5 Flash
          ↓
    Account Memo JSON (v1)
          ↓
    Gemini 2.5 Flash
          ↓
    Retell Agent Spec JSON (v1)
          ↓
    Stored in outputs/accounts/<uuid>/v1/
          ↓
    Task created in outputs/tasks.json
          ↓
    [Onboarding transcript arrives]
          ↓
    Gemini 2.5 Flash
          ↓
    Raw onboarding memo
          ↓
    deepMerge(v1, onboarding)
          ↓
    Account Memo JSON (v2) + Changelog
          ↓
    Retell Agent Spec JSON (v2)
          ↓
    Stored in outputs/accounts/<uuid>/v2/
```

---

## LLM Zero-Cost Note

This pipeline uses **Google Gemini 2.5 Flash** via the free tier:

- Free tier: 15 requests/minute, 1500 requests/day
- No credit card required
- Get your free API key at: https://aistudio.google.com
- Add it to `.env` as `GEMINI_API_KEY`

If you hit rate limits, the pipeline will exit with a Gemini error. Wait a minute and retry.

---

## Retell Manual Import

Since Retell's free tier does not support programmatic agent creation:

1. Log into your Retell account at https://retell.ai
2. Create a new agent
3. Open the generated `agent_spec.json` for your account
4. Copy the `system_prompt` field into the agent prompt
5. Set voice style from `voice_style` field
6. Set transfer number from `call_transfer_protocol.transfer_number`
7. Set timezone from `timezone` field

---

## Known Limitations

- Timezone is not always extractable from transcripts — defaults to `America/Edmonton` for Calgary clients
- Transfer phone number will be a placeholder if not confirmed in transcript
- Pipeline B requires accountId when triggered via webhook (non-interactive mode)
- Whisper transcription quality depends on audio clarity
- Gemini free tier has rate limits (15 req/min)

---

## Troubleshooting

**n8n can't connect to Clara API server:**

```bash
# Find Docker bridge IP
docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}'
# Update HTTP Request node URL in n8n with this IP
```

**Gemini API error:**

```bash
# Check your API key
echo $GEMINI_API_KEY
# Check rate limits — wait 1 minute and retry
```

**Whisper not found:**

```bash
source whisper-env/bin/activate
whisper --version
```
