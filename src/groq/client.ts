import Groq from 'groq-sdk';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SYSTEM_PROMPT_PATH = resolve('prompts/Davy.md');
const MAX_CHARS = 500;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function truncateResponse(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;

  const truncated = content.slice(0, maxChars);

  // Prioridad 1: último signo de puntuación que cierra una oración
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );

  if (lastSentenceEnd > maxChars * 0.4) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  // Prioridad 2: último espacio (no cortar palabras)
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace);
  }

  // Último recurso: palabra única más larga que el límite
  return truncated;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

async function loadSystemPrompt(): Promise<string> {
  try {
    return await readFile(SYSTEM_PROMPT_PATH, 'utf-8');
  } catch {
    return 'Eres un bot carismático de Twitch. Respondes de forma breve y directa.';
  }
}

export async function createGroqClient(config: GroqConfig) {
  const groq = new Groq({ apiKey: config.apiKey });
  const model = config.model ?? 'llama-3.1-8b-instant';
  const systemPrompt = await loadSystemPrompt();

  async function generateResponse(userMessage: string, context: Message[]): Promise<string | null> {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...context,
      { role: 'user', content: userMessage },
    ];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages,
          max_tokens: 200,
          temperature: 0.8,
        });

        const content = completion.choices[0]?.message?.content ?? '';
        return truncateResponse(content, MAX_CHARS);
      } catch (err: unknown) {
        const isRateLimit = err instanceof Error && (err.message.includes('rate_limit') || err.message.includes('429'));

        if (isRateLimit && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }

        console.error(`Groq API error (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
        return null;
      }
    }

    return null;
  }

  return { generateResponse };
}
