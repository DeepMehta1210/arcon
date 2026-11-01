import { describe, it, expect } from "bun:test";
import { lintOutreachCopy, stripInvisibleCharacters } from "./linter";
import { validateSTE100 } from "./ste100";

describe("ASD-STE100 and Copy Linter", () => {
  it("strips invisible zero-width characters", () => {
    const textWithHidden = "Hello\u200Bworld\uFEFF!";
    const { cleanText, count } = stripInvisibleCharacters(textWithHidden);
    expect(cleanText).toBe("Helloworld!");
    expect(count).toBe(2);
  });

  it("detects corporate slop words", () => {
    const slopText = "We can leverage our seamless synergy to delve into the solution.";
    const result = lintOutreachCopy(slopText, { enforceSte100: false });
    expect(result.slopWordsFound).toContain("leverage");
    expect(result.slopWordsFound).toContain("seamless");
    expect(result.slopWordsFound).toContain("synergy");
    expect(result.slopWordsFound).toContain("delve");
    expect(result.passed).toBe(false);
  });

  it("catches sentences longer than 20 words under ASD-STE100", () => {
    const longSentence =
      "This is an extremely long and unnecessarily verbose sentence that goes on and on without stopping to explain a very simple concept that should be short.";
    const result = validateSTE100(longSentence);
    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.maxWordCountObserved).toBeGreaterThan(20);
  });

  it("approves clean, concise ASD-STE100 outreach copy", () => {
    const cleanCopy =
      "We found three broken links on your homepage. We built a free diagnostic report. Do you want the link?";
    const result = lintOutreachCopy(cleanCopy, { enforceSte100: true });
    expect(result.passed).toBe(true);
    expect(result.zeroWidthStripped).toBe(0);
    expect(result.slopWordsFound.length).toBe(0);
    expect(result.ste100.compliant).toBe(true);
  });

  it("enforces Lemlist Playbook standards: flags long subjects, fake flattery, and time-asks", () => {
    const badSubject = "vipan - scaling cloud backend & ai for esferasoft";
    const badBody = "Hi Vipan,\n\nI was really impressed by how your team built GLŌ.\n\nOpen to a quick 10-minute engineering chat this Thursday?";
    const result = lintOutreachCopy(badBody, { subject: badSubject, enforceSte100: false });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes("exceeds 3 words"))).toBe(true);
    expect(result.failureReasons.some(r => r.includes("Step 1 time-ask"))).toBe(true);
    expect(result.failureReasons.some(r => r.includes("fake flattery"))).toBe(true);

    const goodSubject = "cloud bill";
    const goodBody = "Hi Vipan,\n\nChecked your AWS setup. Moving to Graviton cuts compute spend by 40%.\n\nIs this accurate for your infrastructure?";
    const goodResult = lintOutreachCopy(goodBody, { subject: goodSubject, enforceSte100: false });
    expect(goodResult.passed).toBe(true);
  });
});
