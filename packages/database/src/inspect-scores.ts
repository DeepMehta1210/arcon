import { db } from "./client";
import { contacts, companies } from "./schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const topScored = await db
    .select({
      name: contacts.fullName,
      email: contacts.email,
      title: contacts.title,
      score: contacts.leadScore,
      stage: contacts.pipelineStage,
      customAttributes: contacts.customAttributes,
      company: companies.name,
      domain: companies.domain
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(desc(contacts.leadScore))
    .limit(10);

  console.log("Top scored contacts:");
  for (const c of topScored) {
    console.log(`[Score: ${c.score}] [Stage: ${c.stage}] ${c.name} (${c.email}) at ${c.company} (${c.domain})`);
    console.log("Breakdown:", (c.customAttributes as any)?.qualification?.breakdown);
    console.log("Angle:", (c.customAttributes as any)?.qualification?.intentDetails?.intentAngle);
    console.log("Rejection:", (c.customAttributes as any)?.qualification?.rejectionReason);
    console.log("---");
  }

  const sampleDisqualified = await db
    .select({
      name: contacts.fullName,
      email: contacts.email,
      score: contacts.leadScore,
      stage: contacts.pipelineStage,
      customAttributes: contacts.customAttributes,
      company: companies.name
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.pipelineStage, "disqualified"))
    .limit(5);

  console.log("\nSample Disqualified:");
  for (const c of sampleDisqualified) {
    console.log(`[Score: ${c.score}] ${c.name} (${c.email}) at ${c.company}`);
    console.log("Rejection:", (c.customAttributes as any)?.qualification?.rejectionReason);
  }

  process.exit(0);
}

main();
