import type { Message } from '../groq/client.js';

const MAX_CONTEXT_SIZE = 6;

export function createContextManager() {
  const contexts = new Map<string, Message[]>();

  function getContext(userId: string): Message[] {
    return contexts.get(userId) ?? [];
  }

  function addToContext(userId: string, message: Message): void {
    const context = contexts.get(userId) ?? [];
    context.push(message);

    if (context.length > MAX_CONTEXT_SIZE) {
      context.splice(0, context.length - MAX_CONTEXT_SIZE);
    }

    contexts.set(userId, context);
  }

  function clearAll(): void {
    contexts.clear();
  }

  return { getContext, addToContext, clearAll };
}
