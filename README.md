# Clara Answers — Onboarding Automation Pipeline

An end-to-end automation pipeline that converts call transcripts (demo + onboarding) into versioned AI voice agent configurations for Clara Answers.

---

## What This Does

**Pipeline A** — Takes a demo call transcript (or audio file) and generates:

- Structured account memo JSON (v1)
- Retell agent draft spec JSON (v1)
- Task tracker item
- Account registered with UUID

**Pipeline B** — Takes an onboarding call transcript and generates:

- Updated account memo JSON (v2)
- Updated Retell agent spec JSON (v2)
- Changelog showing every field that changed and why

---

## Architecture

```
Input (txt / mp4 / mp3 / m4a)
          ↓
    [Whisper] (if audio/video)
          ↓
    Gemini 2.5 Flash (extraction)
          ↓
    Account Memo JSON (v1)
          ↓
    Gemini 2.5 Flash (agent spec generation)
          ↓
    Retell Agent Spec JSON (v1)
          ↓
    Stored in outputs/accounts/<uuid>/v1/
          ↓
    Task created in outputs/tasks.json
          ↓
    [Onboarding transcript arrives]
          ↓
    Gemini 2.5 Flash (extraction)
          ↓
    deepMerge(v1, onboarding memo)
          ↓
    Account Memo JSON (v2) + Changelog
          ↓
    Retell Agent Spec JSON (v2)
          ↓
    Stored in outputs/accounts/<uuid>/v2/
```

---

## Folder Structure

```
clara-pipeline/
├── scripts/
│   ├── pipeline_a.js          # Demo call → v1 (entry point)
│   ├── pipeline_b.js          # Onboarding call → v2 (entry point)
│   ├── server.js              # Express API server for n8n integration
│   ├── batch.sh               # Batch processing script
│   └── lib/
│       ├── extract.js         # Gemini extraction logic
│       ├── generate.js        # Retell agent spec generation
│       ├── merge.js           # deepMerge + changelog
│       ├── account.js         # UUID, registry, versioning
│       ├── storage.js         # File I/O helpers
│       ├── tracker.js         # Task tracker (GitHub Issues or local)
│       └── transcribe.js      # Whisper transcription wrapper
├── workflows/
│   ├── pipeline_a.json        # n8n workflow export (Pipeline A)
│   ├── pipeline_b.json        # n8n workflow export (Pipeline B)
│   └── README.md              # n8n setup instructions
├── transcripts/               # Place input transcripts here
├── outputs/
│   ├── registry.json          # All accounts + UUIDs
│   ├── tasks.json             # Task tracker items
│   └── accounts/
│       └── <uuid>/
│           ├── v1/
│           │   ├── memo.json
│           │   └── agent_spec.json
│           └── v2/
│               ├── memo.json
│               └── agent_spec.json
├── changelog/
│   └── <uuid>_v1_to_v2.json
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/clara-pipeline.git
cd clara-pipeline
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here        # optional
GITHUB_REPO=yourusername/your-repo-name    # optional
```

**Get a free Gemini API key:**

1. Go to https://aistudio.google.com
2. Click "Get API Key"
3. Create a new key — no credit card required
4. Paste it into `.env`

### 4. Install Whisper (for audio/video transcription)

Whisper is only needed if you have MP4/MP3/M4A files. Skip if you have `.txt` transcripts already.

```bash
# Create a Python virtual environment
python3 -m venv whisper-env

# Activate it
source whisper-env/bin/activate        # Mac/Linux
whisper-env\Scripts\activate           # Windows

# Install Whisper
pip install openai-whisper

# Install ffmpeg (required by Whisper)
brew install ffmpeg          # Mac
sudo apt install ffmpeg      # Ubuntu/Linux
choco install ffmpeg         # Windows

# Verify installation
whisper --version
```

**Transcribe an audio file manually:**

```bash
whisper your_call.mp4 --model small --output_format txt --output_dir ./transcripts
```

> The pipeline also runs Whisper automatically if you pass an audio file directly.

### 5. Install Docker (for n8n)

```bash
# Verify Docker is installed
docker --version
docker compose version
```

If not installed, get it from https://docs.docker.com/get-docker/

---

## Running the Pipeline

### Option A — CLI (simple)

```bash
# Pipeline A — demo call, auto-creates account
node scripts/pipeline_a.js transcripts/demo.txt

# Pipeline A — with audio file (auto-transcribes)
node scripts/pipeline_a.js recordings/demo.mp4

# Pipeline B — interactive mode (shows list of pending accounts)
node scripts/pipeline_b.js transcripts/onboarding.txt

# Pipeline B — non-interactive (pass account directly)
node scripts/pipeline_b.js transcripts/onboarding.txt "Ben's Electric Solutions"
node scripts/pipeline_b.js transcripts/onboarding.txt <uuid>
```

### Option B — n8n Workflow (orchestrated)

See `workflows/README.md` for full n8n setup instructions.

Quick start:

```bash
# Start Clara API server (required for n8n)
node scripts/server.js

# Start n8n
docker compose up -d
```

Open http://localhost:5678, import workflows, activate them, then trigger via webhook.

### Option C — Batch Processing

```bash
chmod +x scripts/batch.sh

# Run Pipeline A on all transcripts in a folder
./scripts/batch.sh transcripts/
```

---

## Plugging In Your Dataset

1. Place all transcript `.txt` files (or audio files) in the `transcripts/` folder
2. Name them clearly, e.g. `demo_client1.txt`, `onboarding_client1.txt`
3. Run Pipeline A on all demo files first:

```bash
./scripts/batch.sh transcripts/
```

4. Then run Pipeline B on each onboarding file:

```bash
node scripts/pipeline_b.js transcripts/onboarding_client1.txt
# Select the matching account from the list
```

5. Check `outputs/registry.json` to see all registered accounts

---

## Output Files Explained

### `memo.json`

Structured account configuration extracted from transcript. Includes:

- Business hours, timezone, services
- Pricing rules
- Emergency routing logic
- After-hours and office-hours flow summaries
- Missing fields listed in `questions_or_unknowns`

### `agent_spec.json`

Ready-to-use Retell agent configuration including:

- Full system prompt with business hours + after-hours flows
- Call transfer protocol
- Fallback protocol if transfer fails
- Key variables (timezone, pricing, emergency customers)

### `changelog JSON`

Diff between v1 and v2 showing every changed field, old value, new value, and reason.

### `registry.json`

Maps UUID → company name for all registered accounts.

### `tasks.json`

Task tracker items created for each account. If GitHub token is configured, issues are also created on GitHub.

---

## Retell Manual Import

Since Retell's free tier does not support programmatic agent creation:

1. Log into your Retell account at https://retell.ai
2. Create a new agent
3. Open `outputs/accounts/<uuid>/v2/agent_spec.json`
4. Copy `system_prompt` → paste into agent prompt field
5. Set `voice_style` in the voice settings
6. Set transfer number from `call_transfer_protocol`
7. Set timezone from `timezone` field

---

## LLM Zero-Cost Note

This pipeline uses **Google Gemini 2.5 Flash** — completely free:

- 15 requests/minute
- 1500 requests/day
- No credit card required

If you hit rate limits, wait 1 minute and retry. The pipeline is idempotent — running it twice on the same file will not create duplicate accounts.

---

## Known Limitations

- Timezone is not always extractable from transcripts — defaults to `America/Edmonton` for Calgary-based clients
- Transfer phone number will be a placeholder if not confirmed in transcript
- Pipeline B requires `accountId` when triggered via webhook (non-interactive mode)
- Whisper transcription quality depends on audio clarity — use `--model medium` for better accuracy at the cost of speed
- Gemini free tier has rate limits (15 req/min) — add `sleep` between batch calls if needed

---

## What I Would Improve With Production Access

- **Retell API integration** — auto-deploy agent specs directly via Retell API
- **Supabase** — replace local JSON files with a proper versioned database
- **Webhook triggers** — auto-run pipeline when a new transcript is uploaded to Google Drive or S3
- **Diff viewer UI** — a simple web page showing v1 vs v2 changes side by side
- **Confidence scoring** — flag extractions that Gemini is uncertain about
- **Multi-language support** — Whisper already supports it, extraction prompts need localization
- **Retry logic** — automatic retry on Gemini rate limit errors with exponential backoff
