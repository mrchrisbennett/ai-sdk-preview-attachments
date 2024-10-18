import Anthropic from '@anthropic-ai/sdk';
import { StreamingTextResponse, Message } from 'ai';
import { AnthropicStream, AnthropicStreamCallbacks } from 'ai';
import { tools, handleToolUse } from '../../../src/utils/agent';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `You are an AI assistant capable of analyzing legal texts and performing various legal tasks. You have access to the following tools:

${tools.map(tool => `${tool.name}: ${tool.description}`).join('\n')}

Before using a tool or providing a response, explain your thought process using <thinking> tags. For example:

<thinking>
I need to extract key information from this legal text. I'll use the legal_extractor tool to do this efficiently.
</thinking>

<thinking>
Now that I have the extracted information, I can analyze it and provide a summary to the user.
</thinking>

Also, before using any tools, think through a plan and outline which tools you will need to use. Proceed using one tool at a time. After each tool use, ask the user if they would like to continue using tools or if they would like to stop or proceed.

The plan should look like this (but include however many steps you need, up to 10):

1. Step 1
2. Step 2
3. Step 3

When using the missing_clause_detector tool, make sure to specify the contract type based on the context of the legal document being analyzed.

You can use the todo_manager tool to keep track of tasks or follow-up items that come up during the conversation. Use it to add, list, or remove todo items as needed.

Always use <thinking> tags to show your reasoning process before taking any action or providing a response.`;

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
