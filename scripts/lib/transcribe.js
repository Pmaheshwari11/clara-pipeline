import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function prepareTranscript(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  // Already a transcript
  if (ext === ".txt") {
    console.log("📄 Using transcript directly");
    return inputPath;
  }

  // Audio/video file — run Whisper
  const supported = [".mp4", ".mp3", ".m4a", ".wav", ".webm"];
  if (!supported.includes(ext)) {
    console.error(`❌ Unsupported file type: ${ext}`);
    process.exit(1);
  }

  console.log(`🎙️ Transcribing ${ext} file with Whisper...`);

  const outputDir = "transcripts";
  fs.mkdirSync(outputDir, { recursive: true });

  const baseName = path.basename(inputPath, ext);
  const outputPath = `${outputDir}/${baseName}.txt`;

  // Check if transcript already exists (idempotent)
  if (fs.existsSync(outputPath)) {
    console.log(`⚡ Transcript already exists: ${outputPath}`);
    return outputPath;
  }

  try {
    execSync(
      `whisper "${inputPath}" --model small --output_format txt --output_dir ${outputDir}`,
      { stdio: "inherit" },
    );
    console.log(`✅ Transcription saved: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Whisper failed. Is it installed?");
    console.error("Install with: pip install openai-whisper");
    process.exit(1);
  }
}
