import type { LintResult } from "@growth-os/shared-types";
import { validateSTE100, splitIntoSentences, countWords } from "./ste100";
import slopData from "./slop.json";

// Invisible unicode character patterns
const INVISIBLE_UNICODE_REGEX = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD\u180E\u200E\u200F\u202A-\u202E]/g;

// Corporate slop words from slop.json and GTM linters
const DEFAULT_SLOP_WORDS = [
  "delve", "delving", "testament", "tapestry", "seamless", "seamlessly",
  "game-changer", "gamechanger", "leverage", "leveraging", "synergy",
  "robust", "revolutionize", "revolutionary", "elevate", "streamline",
  "unlock", "supercharge", "holistic", "empower", "empowering",
  "cutting-edge", "next-generation", "pioneering", "transformative",
  "paradigm shift", "synergistic", "best-in-class", "mission-critical"
];

export interface LintOptions {
  enforceSte100?: boolean;
  maxWordsPerSentence?: number;
  maxSlopDensity?: number; // e.g. 0.01 (1%)
  minBurstiness?: number;  // sentence length variation
}

export function stripInvisibleCharacters(text: string): { cleanText: string; count: number } {
  let count = 0;
  const cleanText = text.replace(INVISIBLE_UNICODE_REGEX, () => {
    count++;
    return "";
  });
  return { cleanText, count };
}

export function calculateBurstiness(sentences: string[]): number {
  if (sentences.length < 2) return 1.0;
  const lengths = sentences.map(countWords);
  const mean = lengths.reduce((acc, l) => acc + l, 0) / lengths.length;
  if (mean === 0) return 0;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  // Coefficient of variation as burstiness metric
  return parseFloat((stdDev / mean).toFixed(3));
}

export function lintOutreachCopy(text: string, options: LintOptions = {}): LintResult {
  const failureReasons: string[] = [];

  // 1. Strip invisible characters
  const { cleanText, count: zeroWidthStripped } = stripInvisibleCharacters(text);
  if (zeroWidthStripped > 0) {
    failureReasons.push(`Found and stripped ${zeroWidthStripped} invisible watermark character(s).`);
  }

  // 2. Check for corporate slop
  const lower = cleanText.toLowerCase();
  const slopWordsFound: string[] = [];
  for (const word of DEFAULT_SLOP_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      slopWordsFound.push(word);
    }
  }

  const sentences = splitIntoSentences(cleanText);
  const totalWords = sentences.reduce((acc, s) => acc + countWords(s), 0);
  const slopScore = totalWords > 0 ? parseFloat((slopWordsFound.length / totalWords).toFixed(4)) : 0;

  const maxSlopAllowed = options.maxSlopDensity ?? 0.01;
  if (slopScore > maxSlopAllowed) {
    failureReasons.push(
      `Slop density exceeds limit: ${(slopScore * 100).toFixed(1)}% (found: ${slopWordsFound.join(", ")})`
    );
  }

  // 3. Sycophantic opening filter
  if (/^(I hope this (email|message) finds you well|Allow me to introduce myself|My name is .* and I am reaching out)\b/i.test(cleanText.trim())) {
    failureReasons.push("Contains prohibited sycophantic opening.");
  }

  // 4. Burstiness check
  const burstinessScore = calculateBurstiness(sentences);

  // 5. ASD-STE100 Compliance Check
  const ste100 = validateSTE100(cleanText, {
    maxWordsPerSentence: options.maxWordsPerSentence ?? 20
  });

  const enforceSte100 = options.enforceSte100 ?? true;
  if (enforceSte100 && !ste100.compliant) {
    failureReasons.push(
      `Failed ASD-STE100 compliance: ${ste100.violations.length} violation(s) found.`
    );
  }

  const passed = failureReasons.length === 0;

  return {
    cleanText,
    zeroWidthStripped,
    slopWordsFound,
    slopScore,
    burstinessScore,
    ste100,
    passed,
    failureReasons
  };
}
