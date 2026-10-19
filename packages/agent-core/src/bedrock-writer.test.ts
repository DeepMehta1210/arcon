import { describe, it, expect } from "bun:test";
import { extractCleanTextFromHtml, getBedrockClient } from "./bedrock-writer";

describe("BedrockWriter and HTML Extraction", () => {
  it("strips scripts, styles, navs and extracts clean human text", () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <style>.hero { color: red; }</style>
          <script>console.log("tracking code");</script>
        </head>
        <body>
          <nav><a href="/home">Home</a><a href="/about">About</a></nav>
          <main>
            <h1>Magora Systems</h1>
            <p>We deliver bespoke enterprise web applications, Amazon Bedrock AI integrations, and cloud infrastructure for UK businesses.</p>
          </main>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const cleaned = extractCleanTextFromHtml(rawHtml);
    expect(cleaned).toContain("Magora Systems");
    expect(cleaned).toContain("bespoke enterprise web applications");
    expect(cleaned).not.toContain("console.log");
    expect(cleaned).not.toContain(".hero { color: red; }");
    expect(cleaned).not.toContain("<nav>");
    expect(cleaned).not.toContain("<footer>");
  });

  it("instantiates BedrockRuntimeClient with configured region", () => {
    const client = getBedrockClient();
    expect(client).toBeDefined();
    expect(typeof client.send).toBe("function");
  });
});
