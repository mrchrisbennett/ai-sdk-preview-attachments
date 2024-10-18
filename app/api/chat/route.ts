import Anthropic from '@anthropic-ai/sdk';
import { StreamingTextResponse, Message } from 'ai';
import { ReadableStream } from 'stream/web';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Make sure this environment variable is set
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: messages.map((message: Message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content
      })),
      stream: true
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta') {
            controller.enqueue(chunk.delta.text);
          }
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
