import { Injectable } from "@nestjs/common";

@Injectable()
export class SpintaxService {
  private readonly zeroWidthChars = ["\u200B", "\u200C", "\u200D", "\uFEFF"];

  /**
   * Resolves nested spintax patterns like {Hello|Hi|Hey} and {team|colleagues}
   */
  resolveSpintax(text: string): string {
    const spintaxRegex = /\{([^{}]+)\}/;
    let match: RegExpExecArray | null;

    let current = text;
    while ((match = spintaxRegex.exec(current)) !== null) {
      const choices = match[1].split("|");
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      current = current.slice(0, match.index) + chosen + current.slice(match.index + match[0].length);
    }

    return current;
  }

  /**
   * Injects invisible zero-width unicode characters randomly at sentence/word boundaries.
   * This completely mutates the payload's byte-hash (MD5/SHA256) so Meta's ML filters
   * never see identical raw hashes across outbound messages.
   */
  injectByteHashVariation(text: string): string {
    const words = text.split(" ");
    if (words.length <= 1) return text;

    const modifiedWords = words.map((word, idx) => {
      // 30% chance to append a zero-width space after a word
      if (Math.random() < 0.35 && idx < words.length - 1) {
        const char = this.zeroWidthChars[Math.floor(Math.random() * this.zeroWidthChars.length)];
        return word + char;
      }
      return word;
    });

    return modifiedWords.join(" ");
  }

  /**
   * Full pipeline: Resolves spintax and injects invisible byte-hash mutations.
   */
  process(text: string, applyVariation = true): string {
    const resolved = this.resolveSpintax(text);
    return applyVariation ? this.injectByteHashVariation(resolved) : resolved;
  }
}
