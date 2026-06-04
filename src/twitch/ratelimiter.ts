const MAX_MESSAGES = 18;
const WINDOW_MS = 30000;

const messageTimestamps: number[] = [];

export function canSendMessage(): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  while (messageTimestamps.length > 0 && messageTimestamps[0] < windowStart) {
    messageTimestamps.shift();
  }

  return messageTimestamps.length < MAX_MESSAGES;
}

export function registerSentMessage(): void {
  messageTimestamps.push(Date.now());
}
