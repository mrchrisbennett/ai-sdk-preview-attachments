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
  // ... (keep the entire handleToolUse function as it is in your provided code)
}

async function extractLegalInfo(legalText: string): Promise<string> {
  // ... (keep the entire extractLegalInfo function as it is in your provided code)
}

async function reviewLegalText(legalText: string, extractedInfo: string): Promise<string> {
  // ... (keep the entire reviewLegalText function as it is in your provided code)
}

async function draftImprovedLegalText(originalText: string, reviewSummary: string): Promise<string> {
  // ... (keep the entire draftImprovedLegalText function as it is in your provided code)
}

async function planLegalProcess(process: string, context: string): Promise<string> {
  // ... (keep the entire planLegalProcess function as it is in your provided code)
}
