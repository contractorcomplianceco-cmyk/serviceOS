// ---------------------------------------------------------------------------
// VoiceConnect provider abstractions.
//
// These interfaces define the pluggable stages of the voice-closeout pipeline:
// speech-to-text, language detection, translation, and structured field
// extraction. The prototype ships a labeled SIMULATOR implementation plus a
// MANUAL passthrough (for typed entry). Nothing calls a real STT/translation
// API — swapping in a real provider means implementing these interfaces.
// Output is always a DRAFT: a human reviews/approves before anything downstream.
// ---------------------------------------------------------------------------

export interface Transcript {
  text: string;
  confidence: number;
  provider: string;
  simulated: boolean;
}

export interface LanguageResult {
  language: string;
  confidence: number;
  simulated: boolean;
}

export interface TranslationResult {
  text: string;
  from: string;
  to: string;
  translated: boolean;
  simulated: boolean;
}

export interface ExtractedCloseout {
  summary: string;
  laborHours: number | null;
  materials: string[];
  followUpNeeded: boolean;
  simulated: boolean;
}

export interface SpeechToTextProvider {
  name: string;
  transcribe(audioRef: string): Promise<Transcript>;
}

export interface LanguageProvider {
  name: string;
  detect(text: string): Promise<LanguageResult>;
  translate(text: string, to: string): Promise<TranslationResult>;
}

export interface ExtractionProvider {
  name: string;
  extract(text: string): Promise<ExtractedCloseout>;
}

// --- Simulated implementations -------------------------------------------

const SAMPLE_TRANSCRIPTS = [
  "Replaced the failed circulator pump on boiler two, bled the lines, system holding pressure. Used one pump and two gaskets. About two hours on site.",
  "Cleared the main drain blockage, ran camera to confirm flow. No parts needed. Recommend follow up to descale next quarter.",
];

export const simulatedSttProvider: SpeechToTextProvider = {
  name: "VoiceConnect STT Simulator",
  async transcribe(audioRef) {
    const idx = audioRef.length % SAMPLE_TRANSCRIPTS.length;
    return {
      text: SAMPLE_TRANSCRIPTS[idx],
      confidence: 0.94,
      provider: this.name,
      simulated: true,
    };
  },
};

export const simulatedLanguageProvider: LanguageProvider = {
  name: "VoiceConnect Language Simulator",
  async detect(text) {
    // Naive heuristic: everything is treated as English in the simulator.
    const hasSpanish = /\b(el|la|reparé|fuga|caldera)\b/i.test(text);
    return {
      language: hasSpanish ? "es" : "en",
      confidence: 0.9,
      simulated: true,
    };
  },
  async translate(text, to) {
    // The simulator does not actually translate; it labels the passthrough.
    return { text, from: "auto", to, translated: false, simulated: true };
  },
};

export const simulatedExtractionProvider: ExtractionProvider = {
  name: "VoiceConnect Extraction Simulator",
  async extract(text) {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*hour/i);
    const materials: string[] = [];
    if (/pump/i.test(text)) materials.push("Circulator pump");
    if (/gasket/i.test(text)) materials.push("Gaskets");
    return {
      summary: text.slice(0, 160),
      laborHours: hoursMatch ? Number(hoursMatch[1]) : null,
      materials,
      followUpNeeded: /follow up|recommend/i.test(text),
      simulated: true,
    };
  },
};

// --- Manual (typed entry) providers --------------------------------------

export const manualSttProvider: SpeechToTextProvider = {
  name: "Manual entry",
  async transcribe(audioRef) {
    return { text: audioRef, confidence: 1, provider: this.name, simulated: false };
  },
};

export interface VoicePipelineResult {
  transcript: Transcript;
  language: LanguageResult;
  translation: TranslationResult;
  extraction: ExtractedCloseout;
}

/**
 * Run the full voice pipeline (STT → detect → translate → extract). Always
 * produces a labeled draft for human review — never an approved closeout.
 */
export async function runVoicePipeline(
  audioRef: string,
  opts?: {
    stt?: SpeechToTextProvider;
    language?: LanguageProvider;
    extraction?: ExtractionProvider;
    targetLanguage?: string;
  },
): Promise<VoicePipelineResult> {
  const stt = opts?.stt ?? simulatedSttProvider;
  const language = opts?.language ?? simulatedLanguageProvider;
  const extraction = opts?.extraction ?? simulatedExtractionProvider;
  const target = opts?.targetLanguage ?? "en";

  const transcript = await stt.transcribe(audioRef);
  const detected = await language.detect(transcript.text);
  const translation =
    detected.language === target
      ? {
          text: transcript.text,
          from: detected.language,
          to: target,
          translated: false,
          simulated: transcript.simulated,
        }
      : await language.translate(transcript.text, target);
  const extraction_ = await extraction.extract(translation.text);
  return { transcript, language: detected, translation, extraction: extraction_ };
}
