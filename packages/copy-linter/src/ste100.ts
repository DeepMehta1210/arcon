import type { STE100CheckResult } from "@growth-os/shared-types";

const MAX_INSTRUCTION_WORDS = 20;
const MAX_DESCRIPTIVE_WORDS = 25;

export interface STE100Options {
  strictMode?: boolean;
  maxWordsPerSentence?: number;
}

export function splitIntoSentences(text: string): string[] {
  // Normalize whitespace and split on sentence endings (. ? !) followed by space or newline
  const cleaned = text.replace(/\r\n/g, "\n");
  const rawSentences = cleaned.split(/(?<=[.?!])\s+(?=[A-Z0-9])/);
  return rawSentences
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#") && !s.startsWith("```"));
}

export function countWords(sentence: string): number {
  const words = sentence
    .replace(/[^\w\s-]/g, "")
    .trim()
    .split(/\s+/);
  return words.filter((w) => w.length > 0).length;
}

export function validateSTE100(
  text: string,
  options: STE100Options = {}
): STE100CheckResult {
  const maxLimit = options.maxWordsPerSentence ?? MAX_INSTRUCTION_WORDS;
  const sentences = splitIntoSentences(text);
  const violations: Array<{
    sentence: string;
    wordCount: number;
    maxAllowed: number;
    reason: string;
  }> = [];

  let totalWords = 0;
  let maxObserved = 0;

  for (const sentence of sentences) {
    const words = countWords(sentence);
    totalWords += words;
    if (words > maxObserved) {
      maxObserved = words;
    }

    if (words > maxLimit) {
      violations.push({
        sentence,
        wordCount: words,
        maxAllowed: maxLimit,
        reason: `Sentence exceeds ASD-STE100 word limit (${words} > ${maxLimit} words)`
      });
    }

    // Check for obvious passive voice constructions
    if (/\b(is|are|was|were|been|being)\s+([a-z]+ed|[a-z]+en)\b/i.test(sentence)) {
      violations.push({
        sentence,
        wordCount: words,
        maxAllowed: maxLimit,
        reason: "Possible passive voice detected; ASD-STE100 requires active voice"
      });
    }
  }

  const sentenceCount = sentences.length;
  const averageWordCount =
    sentenceCount > 0 ? parseFloat((totalWords / sentenceCount).toFixed(2)) : 0;

  return {
    compliant: violations.length === 0,
    sentenceCount,
    maxWordCountObserved: maxObserved,
    averageWordCount,
    violations
  };
}
