import { describe, expect, test } from "bun:test";
import { qualifyLead, batchQualifyLeads, type LeadQualificationInput } from "./qualification-gate";

describe("Step 3 Qualification & Verification Gate", () => {
  test("Gate 0: immediately disqualifies negative industries (print, signage, plumbing, auto repair)", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "London Print & Signage Ltd",
        domain: "londonprintshop.co.uk",
        description: "Commercial printing, wedding invitations, banners, and car wraps in London."
      },
      contact: {
        fullName: "John Smith",
        email: "john@londonprintshop.co.uk",
        verificationStatus: "socket_valid",
        linkedinUrl: "https://linkedin.com/in/johnsmith"
      }
    };

    const result = qualifyLead(input);
    expect(result.score).toBe(0);
    expect(result.stage).toBe("disqualified");
    expect(result.passed).toBe(false);
    expect(result.rejectionReason).toContain("Negative industry match");
  });

  test("Dimension 1: immediately disqualifies dead, parked, or for-sale domains", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "FinTech Cloud Solutions",
        domain: "fintechcloud-sedo.com",
        description: "This domain is for sale on Sedo. Buy this domain now."
      },
      contact: {
        fullName: "Alex Miller",
        email: "alex@fintechcloud-sedo.com",
        verificationStatus: "socket_valid"
      }
    };

    const result = qualifyLead(input);
    expect(result.score).toBe(0);
    expect(result.stage).toBe("disqualified");
    expect(result.passed).toBe(false);
    expect(result.rejectionReason).toContain("parked, expired, or for sale");
  });

  test("Dimension 2: caps score at 35 and disqualifies when no authentic human decision maker exists", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "Acme Cloud Services",
        domain: "acmecloud.io",
        description: "Modern cloud platform building microservices.",
        techStack: ["AWS", "Docker", "Kubernetes", "PostgreSQL"]
      },
      contact: {
        fullName: "Engineering Leadership", // Not a real human name
        email: "info@acmecloud.io",
        emailCandidates: ["info@acmecloud.io", "support@acmecloud.io"],
        verificationStatus: "socket_valid"
      },
      trigger: {
        source: "remoteok",
        headline: "Hiring Senior DevOps Engineer"
      }
    };

    const result = qualifyLead(input);
    expect(result.score).toBeLessThanOrEqual(35);
    expect(result.stage).toBe("disqualified");
    expect(result.passed).toBe(false);
    expect(result.rejectionReason).toContain("No verified personal founder or executive identified");
    expect(result.breakdown.reachability).toBe(0);
  });

  test("Qualifies Tier-1 lead with hiring DevOps trigger as ready_for_outreach (Score >= 80)", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "Magora Systems",
        domain: "magora-systems.com",
        description: "B2B digital product development and enterprise cloud architecture.",
        techStack: ["React", "Python", "Go", "AWS", "Kubernetes", "Docker", "PostgreSQL"]
      },
      contact: {
        fullName: "Pavel Shevtsov",
        title: "Founder & Chief Technology Officer",
        email: "pavel@magora-systems.com",
        emailCandidates: ["pavel@magora-systems.com", "pshevtsov@magora-systems.com"],
        verificationStatus: "socket_valid",
        linkedinUrl: "https://www.linkedin.com/in/pavelshevtsov",
        phone: "+442071838642"
      },
      trigger: {
        source: "remoteok",
        headline: "Hiring Senior DevOps & Kubernetes Architect",
        signalType: "hiring"
      },
      cloudAudit: {
        isAws: true,
        cloudProvider: "aws",
        detectedAwsServices: ["Route 53 DNS", "CloudFront CDN", "Application Load Balancer (ALB)"]
      }
    };

    const result = qualifyLead(input);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.stage).toBe("ready_for_outreach");
    expect(result.passed).toBe(true);
    expect(result.intentDetails.intentAngle).toBe("aws_devops_hiring");
    expect(result.intentDetails.isHiringDevOps).toBe(true);
    expect(result.breakdown.domainHealth).toBe(15);
    expect(result.breakdown.reachability).toBe(35); // 25 (socket) + 10 (linkedin) + 5 (phone) = max 35
    expect(result.breakdown.intentPain).toBe(30);   // hiring devops = 30
    expect(result.breakdown.icpTechFit).toBe(15);   // >= 3 modern tech matches
  });

  test("Correctly assigns FinOps trigger when S3 direct asset leak is detected", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "Scale Media",
        domain: "scalemedia.co",
        description: "High-traffic media portal delivering streaming content.",
        techStack: ["AWS", "Node.js", "Redis"]
      },
      contact: {
        fullName: "Sarah Jenkins",
        title: "VP of Engineering",
        email: "sarah@scalemedia.co",
        verificationStatus: "socket_valid",
        linkedinUrl: "https://linkedin.com/in/sarahjenkins"
      },
      cloudAudit: {
        isAws: true,
        cloudProvider: "aws",
        finOps: {
          directS3AssetLeaks: true,
          leakedS3Buckets: ["scalemedia-video-assets"],
          uncachedOrigin: true,
          costOptimizationAngle: "Route S3 assets through CloudFront edge",
          estimatedSavingsPercent: 45
        }
      }
    };

    const result = qualifyLead(input);
    expect(result.intentDetails.intentAngle).toBe("aws_finops_cost");
    expect(result.intentDetails.hasS3Leak).toBe(true);
    expect(result.breakdown.intentPain).toBe(25);
  });

  test("Classifies lead with catch-all email and agency profile into needs_manual_review (60-79 pts)", () => {
    const input: LeadQualificationInput = {
      company: {
        name: "Velocita Studio",
        domain: "velocitastudio.design",
        description: "Boutique digital creative agency designing high-end digital products.",
        techStack: ["Next.js", "TypeScript"]
      },
      contact: {
        fullName: "Marcus Gitau",
        title: "Creative Director & Co-Founder",
        email: "marcus@velocitastudio.design",
        verificationStatus: "catch_all", // Catch-all server
        linkedinUrl: "https://www.linkedin.com/search/results/all/?keywords=Marcus%20Gitau" // Search link, not direct /in/
      }
    };

    const result = qualifyLead(input);
    // Domain (15) + Reachability (18 email + 4 search linkedin = 22) + Intent Agency (20) + ICP (10) = 67
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(80);
    expect(result.stage).toBe("needs_manual_review");
    expect(result.passed).toBe(false);
    expect(result.rejectionReason).toContain("qualifies for manual review");
  });

  test("Batch qualifies multiple leads efficiently", () => {
    const leads: LeadQualificationInput[] = [
      {
        company: { name: "Good Co", domain: "goodco.io" },
        contact: {
          fullName: "David Clark",
          email: "david@goodco.io",
          verificationStatus: "socket_valid",
          linkedinUrl: "https://linkedin.com/in/davidclark"
        },
        trigger: { headline: "Hiring DevOps" }
      },
      {
        company: { name: "Print Shop", domain: "badprint.com", description: "Printing and signage" },
        contact: { fullName: "Dan Print", email: "dan@badprint.com" }
      }
    ];

    const results = batchQualifyLeads(leads);
    expect(results.length).toBe(2);
    expect(results[0].stage).toBe("ready_for_outreach");
    expect(results[1].stage).toBe("disqualified");
  });
});
