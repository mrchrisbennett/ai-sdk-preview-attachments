import Anthropic from '@anthropic-ai/sdk';
import { StreamingTextResponse, Message } from 'ai';
import { AnthropicStream, AnthropicStreamCallbacks } from 'ai';
import { tools, handleToolUse, ToolUse } from '../../../src/utils/agent';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `You are an AI assistant capable of analyzing legal texts and performing various legal tasks. You have access to the following tools:

${tools.map(tool => `${tool.name}: ${tool.description}`).join('\n')}

When you need to use a tool, output the exact string "[USE_TOOL]" followed by the tool name and the input in JSON format. For example:

[USE_TOOL]legal_extractor{"text": "This is a sample legal text..."}

After using the tool, incorporate its result into your response without mentioning the tool explicitly. Provide a natural language summary of the extracted information or the task performed.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    const anthropicMessages = messages.map((message: Message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content
    }));

    let fullResponse = '';
    let toolCallBuffer = '';
    let isCollectingToolCall = false;
    let shouldSkipTokens = false;

    const callbacks: AnthropicStreamCallbacks = {
      onStart: () => {
        console.log("Stream started");
      },
      onToken: async (token: string) => {
        console.log("Token received:", token);
        
        if (token.includes('[USE_TOOL]')) {
          isCollectingToolCall = true;
          toolCallBuffer = '';
          shouldSkipTokens = true;
          return;
        }
        
        if (isCollectingToolCall) {
          toolCallBuffer += token;
          
          if (toolCallBuffer.includes('}')) {
            isCollectingToolCall = false;
            const toolCallMatch = toolCallBuffer.match(/\[USE_TOOL\](\w+)(.*)/);
            if (toolCallMatch) {
              const [, toolName, toolInput] = toolCallMatch;
              console.log(`Tool call detected: ${toolName}`);
              try {
                const parsedInput = JSON.parse(toolInput);
                const result = await handleToolUse({ name: toolName, input: parsedInput } as ToolUse);
                console.log("Tool call result:", result);
                // Don't add the result directly to fullResponse
                // Instead, let the model incorporate it naturally
              } catch (error) {
                console.error("Error in tool call:", error);
                // Don't add error message to fullResponse
              }
            }
            shouldSkipTokens = false;
          }
        } else if (!shouldSkipTokens) {
          fullResponse += token;
        }
      },
      onCompletion: (completion: string) => {
        console.log("Completion received:", completion);
      },
      onFinal: (completion: string) => {
        console.log("Final completion:", fullResponse);
      },
    };

    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: anthropicMessages,
      system: systemPrompt,
      stream: true,
    });

    const stream = AnthropicStream(response, callbacks);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
