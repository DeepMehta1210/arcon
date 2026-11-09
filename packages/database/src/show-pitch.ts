import { db } from "./client";
import { contacts, companies } from "./schema";
import { eq, desc } from "drizzle-orm";
import { buildPitchPrompt, generatePitchFromRawData, type RawPitchData } from "../../agent-core/src/pitch-prompt";

async function main() {
  const list = await db
    .select({
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      linkedin: contacts.linkedinUrl,
      customAttributes: contacts.customAttributes,
      companyName: companies.name,
      domain: companies.domain,
      description: companies.description,
      techStack: companies.techStack
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.pipelineStage, "ready_for_outreach"))
    .orderBy(desc(contacts.leadScore))
    .limit(2);

  for (const c of list) {
    const rawData: RawPitchData = {
      company: {
        name: c.companyName || "Company",
        domain: c.domain || "domain.com",
        description: c.description || undefined,
        techStack: (c.techStack as string[]) || ["AWS", "Node.js", "Docker"],
        hostingEnvironment: "Amazon Web Services (AWS)",
        cloudProvider: "aws"
      },
      decisionMaker: {
        fullName: c.fullName,
        role: c.title || "Founder & CTO",
        email: c.email,
        linkedinUrl: c.linkedin || undefined
      },
      technicalAudit: {
        isAws: true,
        detectedAwsServices: ["Route 53 DNS", "CloudFront CDN", "Application Load Balancer (ALB)"],
        dmarcPolicy: "reject"
      },
      trigger: {
        angle: (c.customAttributes as any)?.qualification?.intentDetails?.intentAngle || "aws_agency_whitelabel",
        signalSummary: (c.customAttributes as any)?.qualification?.intentDetails?.triggerSummary || "B2B digital product agency shipping custom client web builds"
      }
    };

    const prompt = buildPitchPrompt(rawData);
    const pitch = generatePitchFromRawData(rawData);

    console.log("================================================================================");
    console.log(`PROSPECT: ${c.fullName} (${c.email}) at ${c.companyName} [Angle: ${rawData.trigger.angle}]`);
    console.log("================================================================================");
    console.log("\n--- RAW DATA INPUT ---");
    console.log(JSON.stringify(rawData, null, 2));
    console.log("\n--- GENERATED SYSTEM PROMPT ---");
    console.log(prompt.systemPrompt);
    console.log("\n--- GENERATED USER PROMPT ---");
    console.log(prompt.userPrompt);
    console.log("\n--- OUTPUT PITCH EMAIL ---");
    console.log(`SUBJECT: ${pitch.subject}`);
    console.log(`BODY:\n${pitch.body}`);
    console.log(`WORD COUNT: ${pitch.wordCount} words`);
    console.log("================================================================================\n");
  }

  process.exit(0);
}

main();
