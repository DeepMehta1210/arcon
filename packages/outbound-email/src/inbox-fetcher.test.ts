import { describe, expect, test } from "bun:test";
import { stripQuotedReply, classifyReplyIntent } from "./inbox-fetcher";

describe("Inbound Reply Parser & Intent Classifier", () => {
  test("strips standard email quotation headers and quote lines", () => {
    const rawReply = `Sounds good Deep, send over the 1-page breakdown.

On Mon, Nov 8, 2026 at 2:15 PM Deep Mehta <deep@3dices.com> wrote:
> Hi Pavel,
> Quick question—when your team launches custom web builds for clients...`;

    const clean = stripQuotedReply(rawReply);
    expect(clean).toBe("Sounds good Deep, send over the 1-page breakdown.");
  });

  test("classifies positive/buying interest replies", () => {
    expect(classifyReplyIntent("Yes, send over the breakdown please.")).toBe("interested");
    expect(classifyReplyIntent("Sure, I would love to see how this works.")).toBe("interested");
    expect(classifyReplyIntent("Sounds good, open to seeing the 1-page breakdown.")).toBe("interested");
  });

  test("classifies referral / colleague hand-off replies", () => {
    expect(classifyReplyIntent("Please reach out to our Head of Infrastructure, Alex.")).toBe("referral");
    expect(classifyReplyIntent("I'm forwarding this to our CTO John.")).toBe("referral");
    expect(classifyReplyIntent("Talk to my engineering lead copied on this thread.")).toBe("referral");
  });

  test("classifies unsubscribe / DNC requests", () => {
    expect(classifyReplyIntent("Unsubscribe me please.")).toBe("dnc");
    expect(classifyReplyIntent("Not interested, remove us from your list.")).toBe("dnc");
    expect(classifyReplyIntent("Please stop emailing me.")).toBe("dnc");
  });

  test("classifies pricing / capability discovery questions", () => {
    expect(classifyReplyIntent("How much do you charge for this white-label retainer?")).toBe("question");
    expect(classifyReplyIntent("Can you share any case studies for Next.js apps?")).toBe("question");
  });

  test("classifies in-house / objection replies", () => {
    expect(classifyReplyIntent("We handle all DevOps in-house with our internal team.")).toBe("objection");
    expect(classifyReplyIntent("We don't use AWS, we are fully on GCP.")).toBe("objection");
  });
});
