const BOT_PREFIX = '@bot';

export interface ParsedCommand {
  isBotCommand: boolean;
  text: string;
}

export function parseCommand(message: string): ParsedCommand {
  const trimmed = message.trim().toLowerCase();

  if (!trimmed.startsWith(BOT_PREFIX)) {
    return { isBotCommand: false, text: '' };
  }

  const text = message.trim().slice(BOT_PREFIX.length).trim();
  return { isBotCommand: true, text };
}
