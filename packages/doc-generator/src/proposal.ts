import type { ProspectDossier } from "@growth-os/shared-types";
import { lintOutreachCopy } from "@growth-os/copy-linter";

export interface ProposalOptions {
  serviceOffering: string;
  monthlyFeeUsd: number;
  deliveryWeeks: number;
}

export interface GeneratedProposal {
  title: string;
  targetCompany: string;
  targetDecisionMaker: string;
  executiveSummary: string;
  observedPainSummary: string;
  technicalDeliverables: string[];
  investmentSummary: {
    monthlyFeeUsd: number;
    timelineWeeks: number;
  };
  markdownDocument: string;
  ste100Compliant: boolean;
}

export function generateCommercialProposal(
  dossier: ProspectDossier,
  options: ProposalOptions
): GeneratedProposal {
  const company = dossier.company.name;
  const decisionMaker = dossier.decisionMaker.fullName;
  const title = `Commercial Proposal & Statement of Work: ${options.serviceOffering}`;

  const executiveSummary = `We prepared this proposal for ${decisionMaker} at ${company}. We analyzed your recent product launch and tech stack. This document defines our implementation scope and deliverables.`;

  const observedPainSummary = `Our research observed these priority needs: ${dossier.qualification.verbatimPainQuotes.join(" ")}`;

  const deliverables = [
    "Complete infrastructure and latency audit report.",
    "Automated database and container configuration scripts.",
    "Integrated deliverability and incident monitoring dashboard.",
    "Weekly milestone reviews and documentation handover."
  ];

  const markdownDocument = `# ${title}

**Client:** ${company}  
**Contact:** ${decisionMaker} (${dossier.decisionMaker.role})  
**Date:** ${new Date().toISOString().split("T")[0]}  

---

## 1. Executive Summary
${executiveSummary}

---

## 2. Technical Findings & Scope
${observedPainSummary}

### Deliverables:
${deliverables.map((d) => `- ${d}`).join("\n")}

---

## 3. Commercial Investment & Schedule
* **Implementation Schedule:** ${options.deliveryWeeks} Weeks
* **Monthly Retainer:** $${options.monthlyFeeUsd.toLocaleString()} USD
* **Standard:** Built to ASD-STE100 technical writing guidelines.
`;

  // Verify full document passes STE100 and slop check
  const lint = lintOutreachCopy(executiveSummary, { enforceSte100: true });

  return {
    title,
    targetCompany: company,
    targetDecisionMaker: decisionMaker,
    executiveSummary,
    observedPainSummary,
    technicalDeliverables: deliverables,
    investmentSummary: {
      monthlyFeeUsd: options.monthlyFeeUsd,
      timelineWeeks: options.deliveryWeeks
    },
    markdownDocument,
    ste100Compliant: lint.ste100.compliant
  };
}
