import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

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
  },
  {
    name: "missing_clause_detector",
    description: "Identify missing clauses based on the type of legal contract.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The full text of the legal contract" },
        contract_type: { type: "string", description: "The type of legal contract (e.g., 'employment', 'lease', 'sale')" }
      },
      required: ["text", "contract_type"]
    }
  },
  {
    name: "todo_manager",
    description: "Add, list, or remove todo items for follow-up or future reference.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", description: "The action to perform: 'add', 'list', or 'remove'" },
        item: { type: "string", description: "The todo item to add or remove (required for 'add' and 'remove' actions)" },
        id: { type: "string", description: "The ID of the todo item to remove (required for 'remove' action)" }
      },
      required: ["action"]
    }
  },
  {
    name: "extract_legal_info",
    description: "Extract key information from legal text, including clause type and defined terms.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The legal text to analyze" }
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

// Add this interface to define the structure of the extracted legal info
interface LegalClause {
  text: string;
  clause_type: "contract" | "amendment" | "warranty" | "indemnification" | "dispute_resolution" | "termination" | "confidentiality";
  clauses?: Array<{
    term: string;
    definition: string;
  }>;
}

// Modify the extractLegalInfo function
async function extractLegalInfo(legalText: string): Promise<string> {
  console.log("extractLegalInfo called with text:", legalText);
  const extractionPrompt = `Extract key information from the following legal text and return it as a JSON object with the following structure:
  {
    "text": "The full text of the clause",
    "clause_type": "One of: contract, amendment, warranty, indemnification, dispute_resolution, termination, confidentiality",
    "clauses": [
      {
        "term": "A defined term in the clause",
        "definition": "The definition of the term"
      }
    ]
  }

  Legal text:
  ${legalText}

  Please ensure the output is a valid JSON object that matches the structure above.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0,
      system: "You are a legal expert AI assistant. Extract key information from legal texts and return it as a structured JSON object.",
      messages: [{ role: "user", content: extractionPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      try {
        const extractedInfo: LegalClause = JSON.parse(response.content[0].text);
        console.log("Parsed extracted info:", JSON.stringify(extractedInfo, null, 2));
        
        // Store the extracted info in a global variable for other tools to access
        global.extractedLegalInfo = extractedInfo;
        
        // Return the JSON string
        return JSON.stringify(extractedInfo, null, 2);
      } catch (parseError) {
        console.error("Error parsing JSON from AI response:", parseError);
        return JSON.stringify({ error: "Failed to parse AI response as JSON", details: response.content[0].text }, null, 2);
      }
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error extracting legal information:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to extract legal information", details: errorMessage }, null, 2);
  }
}

// Modify the handleToolUse function to include the new extractLegalInfo functionality
export async function handleToolUse({ name, input }: { name: string; input: any }): Promise<string> {
  console.log("handleToolUse called with:", JSON.stringify(input, null, 2));
  let result: string;

  try {
    switch (name) {
      case 'extract_legal_info':
        console.log("Extracting legal info from:", input.text);
        result = await extractLegalInfo(input.text);
        // Wrap the result in a special marker for easy parsing
        result = `[TOOL_RESULT]${result}[/TOOL_RESULT]`;
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
      case 'missing_clause_detector':
        result = await missingClauseDetector(input.text, input.contract_type);
        break;
      case 'todo_manager':
        result = await todoManager(input.action, input.item, input.id);
        break;
      default:
        console.log("Unknown tool:", name);
        result = "Unknown tool";
    }

    console.log("Tool use result:", result);
    return result;
  } catch (error) {
    console.error("Error in handleToolUse:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return `[TOOL_RESULT]${JSON.stringify({ error: "Error in tool use", details: errorMessage }, null, 2)}[/TOOL_RESULT]`;
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
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to review legal text", details: errorMessage }, null, 2);
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
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to draft improved legal text", details: errorMessage }, null, 2);
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
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to plan legal process", details: errorMessage }, null, 2);
  }
}

// Add new functions for the new tools
async function definedTermsChecker(text: string): Promise<string> {
  try {
    // Implementation for defined terms checker
  } catch (error) {
    console.error("Error in defined terms checker:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to check defined terms", details: errorMessage }, null, 2);
  }
}

// Apply the same pattern to all other tool functions
async function jurisdictionIdentifier(text: string): Promise<string> {
  try {
    // Implementation for jurisdiction identifier
  } catch (error) {
    console.error("Error in jurisdiction identifier:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to identify jurisdiction", details: errorMessage }, null, 2);
  }
}

// ... (apply the same error handling pattern to all other tool functions)

async function missingClauseDetector(text: string, contractType: string): Promise<string> {
  console.log("missingClauseDetector called for contract type:", contractType);
  const detectionPrompt = `Analyze the following ${contractType} contract and identify any standard clauses that are missing. Provide a list of missing clauses and brief explanations for why they are typically included in this type of contract.

  Contract text:
  ${text}

  Please return the result as a JSON object with the following structure:
  {
    "missing_clauses": [
      {
        "clause_name": "Name of the missing clause",
        "explanation": "Brief explanation of why this clause is typically included"
      }
    ]
  }`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a legal expert AI assistant. Analyze legal contracts and identify missing standard clauses based on the contract type.",
      messages: [{ role: "user", content: detectionPrompt }],
    }) as AnthropicResponse;
    
    if (response.content && response.content[0] && response.content[0].text) {
      const missingClauses = JSON.parse(response.content[0].text);
      console.log("Missing clauses detected:", JSON.stringify(missingClauses, null, 2));
      return JSON.stringify(missingClauses, null, 2);
    } else {
      console.error("Unexpected response structure:", JSON.stringify(response, null, 2));
      return JSON.stringify({ error: "Unexpected response structure" }, null, 2);
    }
  } catch (error) {
    console.error("Error detecting missing clauses:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to detect missing clauses", details: errorMessage }, null, 2);
  }
}

async function todoManager(action: string, item?: string, id?: string): Promise<string> {
  const todoFilePath = path.join(process.cwd(), 'todos.json');

  async function readTodos(): Promise<{ id: string; item: string }[]> {
    try {
      const data = await fs.readFile(todoFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function writeTodos(todos: { id: string; item: string }[]): Promise<void> {
    await fs.writeFile(todoFilePath, JSON.stringify(todos, null, 2), 'utf-8');
  }

  const todos = await readTodos();

  switch (action) {
    case 'add':
      if (!item) {
        return JSON.stringify({ error: "Item is required for 'add' action" });
      }
      const newId = Date.now().toString();
      todos.push({ id: newId, item });
      await writeTodos(todos);
      return JSON.stringify({ message: "Todo item added", id: newId });

    case 'list':
      return JSON.stringify(todos);

    case 'remove':
      if (!id) {
        return JSON.stringify({ error: "ID is required for 'remove' action" });
      }
      const index = todos.findIndex(todo => todo.id === id);
      if (index === -1) {
        return JSON.stringify({ error: "Todo item not found" });
      }
      todos.splice(index, 1);
      await writeTodos(todos);
      return JSON.stringify({ message: "Todo item removed" });

    default:
      return JSON.stringify({ error: "Invalid action. Use 'add', 'list', or 'remove'." });
  }
}

export async function legal_extractor(input: string): Promise<string> {
  try {
    // Your existing extraction logic here
  } catch (error) {
    console.error("Error extracting legal information:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return JSON.stringify({ error: "Failed to extract legal information", details: errorMessage }, null, 2);
  }
}

// Add a function to get the extracted legal info
export function getExtractedLegalInfo(): LegalClause | null {
  return global.extractedLegalInfo || null;
}

async function someOtherTool(input: string): Promise<string> {
  const extractedInfo = getExtractedLegalInfo();
  if (extractedInfo) {
    // Use the extracted info in your tool's logic
    console.log("Using extracted legal info:", extractedInfo);
    // ... (tool implementation)
  } else {
    console.log("No extracted legal info available");
    // ... (handle the case when no info is available)
  }
  // ... (rest of the tool implementation)
}
