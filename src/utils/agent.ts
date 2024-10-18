import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: {
      [key: string]: {
        type: string;
        description: string;
      };
    };
    required: string[];
  };
}

// Add new tools to this array
export const tools: Tool[] = [
  // ... (existing tools)
  {
    name: "defined_terms_checker",
    description: "Ensure all defined terms are properly introduced and consistently used.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for defined terms" }
      },
      required: ["text"]
    }
  },
  {
    name: "jurisdiction_identifier",
    description: "Recognize and flag jurisdiction-specific language or requirements.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for jurisdiction-specific language" }
      },
      required: ["text"]
    }
  },
  {
    name: "legal_citation_validator",
    description: "Check the format and accuracy of legal citations.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to validate citations" }
      },
      required: ["text"]
    }
  },
  {
    name: "ambiguity_detector",
    description: "Highlight potentially ambiguous phrases or clauses.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for ambiguities" }
      },
      required: ["text"]
    }
  },
  {
    name: "conflict_checker",
    description: "Identify conflicting statements within the document.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for conflicts" }
      },
      required: ["text"]
    }
  },
  {
    name: "precedent_matcher",
    description: "Find similar clauses or language from a database of precedents.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to match against precedents" }
      },
      required: ["text"]
    }
  },
  {
    name: "legal_jargon_simplifier",
    description: "Suggest plain language alternatives for complex legal terms.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to simplify" }
      },
      required: ["text"]
    }
  },
  {
    name: "compliance_checker",
    description: "Verify if the document meets specific regulatory requirements.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for compliance" },
        regulation: { type: "string", description: "The specific regulation to check against" }
      },
      required: ["text", "regulation"]
    }
  },
  {
    name: "risk_phrase_identifier",
    description: "Flag phrases that may increase legal risk.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to check for risk phrases" }
      },
      required: ["text"]
    }
  },
  {
    name: "signature_block_formatter",
    description: "Properly format and place signature blocks.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to format signature blocks" }
      },
      required: ["text"]
    }
  },
  {
    name: "governing_law_verifier",
    description: "Ensure the governing law clause is appropriate and consistent.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to verify governing law" }
      },
      required: ["text"]
    }
  }
];

export interface ToolUse {
  name: string;
  input: {
    [key: string]: string;
  };
}

// Add this near the top of the file
interface AnthropicResponse {
  content: Array<{
    text: string;
    // Add other properties as needed
  }>;
  // Add other properties from the response as needed
}

export async function handleToolUse(toolUse: ToolUse): Promise<string> {
  console.log("handleToolUse called with:", JSON.stringify(toolUse, null, 2));
  const { name, input } = toolUse;
  let result: string;

  try {
    switch (name) {
      case 'extract_legal_info':
        console.log("Extracting legal info from:", input.text);
        result = await extractLegalInfo(input.text);
        break;
      case 'review_legal_text':
        console.log("Reviewing legal text:", input.text);
        result = await reviewLegalText(input.text, input.extractedInfo);
        break;
      case 'draft_improved_legal_text':
        console.log("Drafting improved legal text");
        result = await draftImprovedLegalText(input.originalText, input.reviewSummary);
        break;
      case 'plan_legal_process':
        console.log("Planning legal process:", input.process);
        result = await planLegalProcess(input.process, input.context);
        break;
      case 'defined_terms_checker':
        result = await definedTermsChecker(input.text);
        break;
      case 'jurisdiction_identifier':
        result = await jurisdictionIdentifier(input.text);
        break;
      case 'legal_citation_validator':
        result = await legalCitationValidator(input.text);
        break;
      case 'ambiguity_detector':
        result = await ambiguityDetector(input.text);
        break;
      case 'conflict_checker':
        result = await conflictChecker(input.text);
        break;
      case 'precedent_matcher':
        result = await precedentMatcher(input.text);
        break;
      case 'legal_jargon_simplifier':
        result = await legalJargonSimplifier(input.text);
        break;
      case 'compliance_checker':
        result = await complianceChecker(input.text, input.regulation);
        break;
      case 'risk_phrase_identifier':
        result = await riskPhraseIdentifier(input.text);
        break;
      case 'signature_block_formatter':
        result = await signatureBlockFormatter(input.text);
        break;
      case 'governing_law_verifier':
        result = await governingLawVerifier(input.text);
        break;
      default:
        console.log("Unknown tool:", name);
        result = "Unknown tool";
    }

    console.log("Tool use result:", result);
    return result;
  } catch (error) {
    console.error("Error in handleToolUse:", error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function extractLegalInfo(legalText: string): Promise<string> {
  console.log("extractLegalInfo called with text:", legalText);
  const extractionPrompt = `Extract key information from the following legal text and return it as a JSON object with the following structure:
  {
    "parties": [],
    "terms": [],
    "dates": [],
    "obligations": []
  }

  Legal text:
  ${legalText}

  Please ensure the output is a valid JSON object.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0,
      system: "You are a legal expert AI assistant. Extract key information from legal texts and return it as a structured JSON object.",
      messages: [{ role: "user", content: extractionPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      const extractedInfo = JSON.parse(response.content[0].text);
      console.log("Parsed extracted info:", JSON.stringify(extractedInfo, null, 2));
      return JSON.stringify(extractedInfo, null, 2);
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error extracting legal information:", error);
    return JSON.stringify({ error: "Failed to extract legal information", details: error.message }, null, 2);
  }
}

async function reviewLegalText(legalText: string, extractedInfo: string): Promise<string> {
  console.log("reviewLegalText called with text:", legalText);
  const reviewPrompt = `Review the following legal text and extracted information. Provide a summary of the review, including any potential issues or improvements:

  Legal text:
  ${legalText}

  Extracted information:
  ${extractedInfo}

  Please provide a detailed review summary.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a legal expert AI assistant. Review legal texts and provide detailed summaries and suggestions for improvement.",
      messages: [{ role: "user", content: reviewPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      console.log("Review summary:", response.content[0].text);
      return response.content[0].text;
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error reviewing legal text:", error);
    return JSON.stringify({ error: "Failed to review legal text", details: error.message }, null, 2);
  }
}

async function draftImprovedLegalText(originalText: string, reviewSummary: string): Promise<string> {
  console.log("draftImprovedLegalText called");
  const draftPrompt = `Based on the original legal text and the review summary, draft an improved version of the legal text:

  Original text:
  ${originalText}

  Review summary:
  ${reviewSummary}

  Please provide the improved legal text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0.3,
      system: "You are a legal expert AI assistant. Draft improved versions of legal texts based on reviews and suggestions.",
      messages: [{ role: "user", content: draftPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      console.log("Improved legal text drafted");
      return response.content[0].text;
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error drafting improved legal text:", error);
    return JSON.stringify({ error: "Failed to draft improved legal text", details: error.message }, null, 2);
  }
}

async function planLegalProcess(process: string, context: string): Promise<string> {
  console.log("planLegalProcess called for process:", process);
  const planningPrompt = `Create a detailed plan for the following legal process, considering the given context:

  Process: ${process}
  Context: ${context}

  Please provide a step-by-step plan with explanations for each step.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a legal expert AI assistant. Create detailed plans for legal processes based on given contexts.",
      messages: [{ role: "user", content: planningPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      console.log("Legal process plan created");
      return response.content[0].text;
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error planning legal process:", error);
    return JSON.stringify({ error: "Failed to plan legal process", details: error.message }, null, 2);
  }
}

// Add new functions for the new tools
async function definedTermsChecker(text: string): Promise<string> {
  // Implementation for defined terms checker
}

async function jurisdictionIdentifier(text: string): Promise<string> {
  // Implementation for jurisdiction identifier
}

async function legalCitationValidator(text: string): Promise<string> {
  // Implementation for legal citation validator
}

async function ambiguityDetector(text: string): Promise<string> {
  // Implementation for ambiguity detector
}

async function conflictChecker(text: string): Promise<string> {
  // Implementation for conflict checker
}

async function precedentMatcher(text: string): Promise<string> {
  // Implementation for precedent matcher
}

async function legalJargonSimplifier(text: string): Promise<string> {
  // Implementation for legal jargon simplifier
}

async function complianceChecker(text: string, regulation: string): Promise<string> {
  // Implementation for compliance checker
}

async function riskPhraseIdentifier(text: string): Promise<string> {
  // Implementation for risk phrase identifier
}

async function signatureBlockFormatter(text: string): Promise<string> {
  // Implementation for signature block formatter
}

async function governingLawVerifier(text: string): Promise<string> {
  // Implementation for governing law verifier
}
