import type { LintResult } from "@arcon/shared-types";
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
  subject?: string;
  enforceSte100?: boolean;
  maxWordsPerSentence?: number;
  maxSlopDensity?: number; // e.g. 0.01 (1%)
  minBurstiness?: number;  // sentence length variation
  enforceLemlistStandards?: boolean;
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

  // 3. Sycophantic opening & fake flattery filter
  if (/^(I hope this (email|message) finds you well|Allow me to introduce myself|My name is .* and I am reaching out|Hope all is well|I hope you are well)\b/i.test(cleanText.trim())) {
    failureReasons.push("Contains prohibited sycophantic opening.");
  }

  // 3b. Lemlist Playbook Standards: ban fake flattery, time-asks, and long subject lines
  if (options.enforceLemlistStandards ?? true) {
    if (options.subject) {
      const subjectWords = options.subject.trim().split(/\s+/).filter(Boolean);
      if (subjectWords.length > 3) {
        failureReasons.push(`Subject line '${options.subject}' exceeds 3 words (${subjectWords.length} words). High-converting subject lines must be 1-3 lowercase words.`);
      }
    }

    const timeAskRegex = /\b(10-minute|15-minute|quick call|hop on|jump on a call|discovery call|check your calendar|schedule a call)\b/i;
    const timeMatch = cleanText.match(timeAskRegex);
    if (timeMatch) {
      failureReasons.push(`Contains prohibited Step 1 time-ask ('${timeMatch[0]}'). High-converting emails must use frictionless conversation starters.`);
    }

    const fakeFlatteryRegex = /\b(really impressed by|admired your work|was impressed by how)\b/i;
    const flatteryMatch = cleanText.match(fakeFlatteryRegex);
    if (flatteryMatch) {
      failureReasons.push(`Contains prohibited fake flattery ('${flatteryMatch[0]}'). Start directly with the verifiable diagnostic fact or analogy.`);
    }
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
