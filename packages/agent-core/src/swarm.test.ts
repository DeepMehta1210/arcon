import { describe, it, expect } from "bun:test";
import { evaluate5FactorRubric } from "./rubric";
import { runResearchSwarm } from "./swarm";
import { ProspectDossierSchema } from "@arcon/shared-types";

describe("Research Swarm and 5-Factor Rubric", () => {
  it("qualifies leads scoring 70% or higher", () => {
    const highFit = evaluate5FactorRubric({
      painStrength: 80,
      icpFit: 85,
      timing: 75,
      reachability: 90,
      evidence: 80
    });
    expect(highFit.passed).toBe(true);
    expect(highFit.overallScore).toBeGreaterThanOrEqual(70);
    expect(highFit.rejectionReason).toBeUndefined();
  });

  it("rejects leads with low pain signal", () => {
    const lowPain = evaluate5FactorRubric({
      painStrength: 30,
      icpFit: 50,
      timing: 40,
      reachability: 50,
      evidence: 40
    });
    expect(lowPain.passed).toBe(false);
    expect(lowPain.overallScore).toBeLessThan(70);
    expect(lowPain.rejectionReason).toContain("pain");
  });

  it("generates a valid ProspectDossier conforming to schema", async () => {
    const dossier = await runResearchSwarm({
      domain: "example.com",
      companyName: "Example Corp",
      contactName: "Jordan Smith"
    });

    // Validate with Zod ProspectDossierSchema
    const parseResult = ProspectDossierSchema.safeParse(dossier);
    expect(parseResult.success).toBe(true);

    expect(dossier.company.domain).toBe("example.com");
    expect(dossier.decisionMaker.fullName).toBe("Jordan Smith");
    expect(typeof dossier.recommendedOutreach.lintReport.ste100Compliant).toBe("boolean");
    expect(dossier.recommendedOutreach.lintReport.passed).toBe(true);
  }, 10000);

  it("crafts 3 Dices AI & Amazon Bedrock outreach for AI leads", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Cognitive AI Labs",
      domain: "cognitive.ai",
      brandDescription: "Building autonomous AI agents and enterprise LLM workflows",
      detectedTech: ["React", "FastAPI", "OpenAI", "LangChain"],
      decisionMakerName: "Elena Rostova",
      decisionMakerRole: "Chief Technology Officer",
      latencyMs: 180,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toBe("bedrock rag");
    expect(email.body).toContain("Amazon Bedrock");
    expect(email.body).toContain("Elena");
    expect(email.body).toContain("3 Dices Technology");
    expect(email.body).toContain("Want access to my notes?");
  });

  it("crafts 3 Dices FinOps & AWS Architecture review for slow latency leads", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "CloudScale Commerce",
      domain: "scalecommerce.io",
      brandDescription: "High-volume e-commerce infrastructure",
      detectedTech: ["Next.js", "PostgreSQL", "AWS"],
      decisionMakerName: "Marcus Vance",
      decisionMakerRole: "VP of Engineering",
      latencyMs: 920,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toBe("latency");
    expect(email.body).toContain("920ms");
    expect(email.body).toContain("6-point checklist");
    expect(email.body).toContain("Want me to send the checklist over?");
  });

  it("crafts 3 Dices Security & DMARC hardening for vulnerable domains", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Apex FinTech",
      domain: "apexfin.co",
      brandDescription: "Modern corporate card and payments platform",
      detectedTech: ["React", "Go"],
      decisionMakerName: "Sarah Chen",
      decisionMakerRole: "Head of Infrastructure",
      latencyMs: 210,
      dmarcPolicy: "none"
    });

    expect(email.subject).toBe("dmarc audit");
    expect(email.body).toContain("monitoring-only (p=none)");
    expect(email.body).toContain("SOC 2");
    expect(email.body).toContain("Want me to send them over?");
  });

  it("crafts 3 Dices White-Label Cloud Partner outreach for digital agencies", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Pixelcraft Creative Studio",
      domain: "pixelcraft.agency",
      brandDescription: "Boutique digital agency building custom web apps and brand experiences",
      detectedTech: ["React", "Next.js", "Tailwind"],
      decisionMakerName: "Liam Evans",
      decisionMakerRole: "Managing Director",
      latencyMs: 320,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toBe("client servers");
    expect(email.body).toContain("silent white-label cloud partner for boutique design agencies");
    expect(email.body).toContain("Liam");
    expect(email.body).toContain("Open to seeing our 1-page agency partner breakdown?");
    expect(email.body.split(/\s+/).length).toBeLessThan(120);
  });

  it("crafts 3 Dices Agency Client Speed Audit for slow agency showcase sites", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Vanguard Web Design",
      domain: "vanguarddesign.com",
      brandDescription: "Award-winning web design and Shopify development agency",
      detectedTech: ["Next.js", "Shopify"],
      decisionMakerName: "Chloe Martin",
      decisionMakerRole: "Founder & Creative Director",
      latencyMs: 980,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toBe("site speed");
    expect(email.body).toContain("client showcase");
    expect(email.body).toContain("980ms");
    expect(email.body).toContain("Open to seeing a 60-second speed breakdown for your showcase sites?");
  });

  it("extracts case studies and agency philosophy from HTML", () => {
    const {
      extractPortfolioProjectsFromHtml,
      extractAgencyPhilosophyFromHtml,
      classifyAgencyArchetype
    } = require("./researcher");

    const sampleHtml = `
      <html>
        <head><title>Velour Digital | Luxury E-Commerce & Shopify Agency</title></head>
        <body>
          <h2>Our Philosophy</h2>
          <p>We build obsessively fast, high-converting digital flagships for discerning luxury brands.</p>
          <div class="portfolio">
            <a href="/case-studies/maison-aurora">Maison Aurora</a>
            <a href="/work/atelier-nord">Atelier Nord</a>
          </div>
        </body>
      </html>
    `;

    const projects = extractPortfolioProjectsFromHtml(sampleHtml);
    expect(projects).toContain("Maison Aurora");
    expect(projects).toContain("Atelier Nord");

    const philosophy = extractAgencyPhilosophyFromHtml(sampleHtml);
    expect(philosophy).toContain("high-converting digital flagships");

    const archetype = classifyAgencyArchetype(sampleHtml);
    expect(archetype).toBe("ecommerce_shopify");
  });

  it("crafts bespoke E-Commerce / Shopify Agency outreach with client project", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Velour Digital",
      domain: "velourdigital.com",
      brandDescription: "High-end Shopify Plus e-commerce agency",
      detectedTech: ["Shopify", "Liquid", "React"],
      decisionMakerName: "Siddharth Rao",
      decisionMakerRole: "Managing Director",
      latencyMs: 350,
      dmarcPolicy: "reject",
      agencyArchetype: "ecommerce_shopify",
      featuredProject: "Maison Aurora"
    });

    expect(email.subject).toBe("checkout speed");
    expect(email.body).toContain("Maison Aurora");
    expect(email.body).toContain("database locks");
    expect(email.body).toContain("Am I going in the right direction for your client setups?");
    expect(email.body).toContain("Siddharth");
  });

  it("crafts bespoke WordPress / Content Agency outreach with hosting margin angle", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Summit Web Solutions",
      domain: "summitweb.co.uk",
      brandDescription: "WordPress and digital marketing agency for mid-market brands",
      detectedTech: ["WordPress", "PHP", "MySQL"],
      decisionMakerName: "Oliver Wright",
      decisionMakerRole: "Founder",
      latencyMs: 410,
      dmarcPolicy: "reject",
      agencyArchetype: "wordpress_content",
      featuredProject: "Apex Living"
    });

    expect(email.subject).toBe("hosting margin");
    expect(email.body).toContain("Apex Living");
    expect(email.body).toContain("$250 to $400/mo");
    expect(email.body).toContain("Open to seeing how our agency white-label model works?");
    expect(email.body).toContain("Oliver");
  });
});
