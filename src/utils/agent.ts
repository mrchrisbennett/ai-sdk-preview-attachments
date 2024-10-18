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

export const tools: Tool[] = [
  // ... (keep all the tool definitions as they are in your provided code)
];

export interface ToolUse {
  name: string;
  input: {
    [key: string]: string;
  };
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
      default:
        console.log("Unknown tool:", name);
        result = "Unknown tool";
    }

    console.log("Tool use result:", result);
    return result;
  } catch (error) {
    console.error("Error in handleToolUse:", error);
    return `Error: ${error.message}`;
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
    });
    
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
    });
    
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
    });
    
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
    });
    
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
