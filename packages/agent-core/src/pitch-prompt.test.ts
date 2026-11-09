import { describe, expect, test } from "bun:test";
import { buildPitchPrompt, generatePitchFromRawData, type RawPitchData } from "./pitch-prompt";

describe("Step 4 Pitch Generation Prompt & Output", () => {
  const sampleRawData: RawPitchData = {
    company: {
      name: "Magora Systems",
      domain: "magora-systems.com",
      description: "B2B digital product development and enterprise cloud architecture.",
      techStack: ["React", "Python", "Go", "AWS", "Docker", "Kubernetes", "PostgreSQL"],
      hostingEnvironment: "Amazon Web Services (AWS)",
      cloudProvider: "aws"
    },
    decisionMaker: {
      fullName: "Pavel Shevtsov",
      role: "Founder & Chief Technology Officer",
      email: "pavel@magora-systems.com",
      linkedinUrl: "https://www.linkedin.com/in/pavelshevtsov"
    },
    technicalAudit: {
      isAws: true,
      detectedAwsServices: ["Route 53 DNS", "CloudFront CDN", "Application Load Balancer (ALB)"],
      directS3AssetLeaks: false,
      dmarcPolicy: "reject"
    },
    trigger: {
      angle: "aws_devops_hiring",
      signalSummary: "Actively recruiting for Senior DevOps & Kubernetes Architect",
      jobTitle: "Senior DevOps & Kubernetes Architect"
    }
  };

  test("builds the standardized prompt embedding raw prospect data", () => {
    const prompt = buildPitchPrompt(sampleRawData);

    expect(prompt.systemPrompt).toContain("Deep Mehta");
    expect(prompt.systemPrompt).toContain("3 Dices Technology");
    expect(prompt.systemPrompt).toContain("Strictly under 80 words");
    expect(prompt.systemPrompt).toContain("Strictly 1 to 3 words, ALL LOWERCASE");
    expect(prompt.systemPrompt).toContain("NEVER ask for time or meetings");

    expect(prompt.userPrompt).toContain("Magora Systems");
    expect(prompt.userPrompt).toContain("magora-systems.com");
    expect(prompt.userPrompt).toContain("Pavel Shevtsov");
    expect(prompt.userPrompt).toContain("Senior DevOps & Kubernetes Architect");
    expect(prompt.userPrompt).toContain("aws_devops_hiring");
  });

  test("generates pitch for aws_devops_hiring conforming to all strict rules", () => {
    const pitch = generatePitchFromRawData(sampleRawData);

    expect(pitch.subject).toBe("devops role");
    expect(pitch.body).toContain("Hi Pavel,");
    expect(pitch.body).toContain("actively recruiting");
    expect(pitch.body).toContain("Senior DevOps & Kubernetes Architect");
    expect(pitch.body).toContain("Am I going in the right direction?");
    expect(pitch.body).toContain("Deep Mehta");
    expect(pitch.wordCount).toBeLessThan(80);
    expect(pitch.wordCount).toBeGreaterThan(35);

    // No meeting/calendar asks
    expect(pitch.body).not.toContain("10-minute");
    expect(pitch.body).not.toContain("hop on a call");
    expect(pitch.body).not.toContain("calendar");
  });

  test("generates pitch for direct S3 asset egress leak under aws_finops_cost", () => {
    const s3Data: RawPitchData = {
      ...sampleRawData,
      technicalAudit: {
        isAws: true,
        directS3AssetLeaks: true,
        leakedS3Bucket: "client-video-assets"
      },
      trigger: {
        angle: "aws_finops_cost",
        signalSummary: "Direct S3 asset egress leak detected without CloudFront"
      }
    };

    const pitch = generatePitchFromRawData(s3Data);
    expect(pitch.subject).toBe("cloud bill");
    expect(pitch.body).toContain("client-video-assets");
    expect(pitch.body).toContain("CloudFront");
    expect(pitch.body).toContain("Is this accurate for your current infrastructure?");
    expect(pitch.wordCount).toBeLessThan(80);
  });

  test("generates pitch for white-label agency partner", () => {
    const agencyData: RawPitchData = {
      ...sampleRawData,
      trigger: {
        angle: "aws_agency_whitelabel",
        signalSummary: "B2B digital agency delivering custom web builds"
      }
    };

    const pitch = generatePitchFromRawData(agencyData);
    expect(pitch.subject).toBe("client servers");
    expect(pitch.body).toContain("silent white-label cloud partner");
    expect(pitch.body).toContain("Open to seeing our 1-page agency partner breakdown?");
    expect(pitch.wordCount).toBeLessThan(80);
  });

  test("generates pitch for private Bedrock AI workload", () => {
    const aiData: RawPitchData = {
      ...sampleRawData,
      trigger: {
        angle: "ai_bedrock_vpc",
        signalSummary: "Deploying production LLM capabilities"
      }
    };

    const pitch = generatePitchFromRawData(aiData);
    expect(pitch.subject).toBe("bedrock rag");
    expect(pitch.body).toContain("Amazon Bedrock");
    expect(pitch.body).toContain("VPC");
    expect(pitch.body).toContain("Want access to our VPC architecture notes?");
    expect(pitch.wordCount).toBeLessThan(80);
  });
});
