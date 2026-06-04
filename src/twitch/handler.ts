import type Client from 'tmi.js';
import type { ChatMessage } from './client.js';
import { parseCommand } from './commands.js';
import { canSendMessage, registerSentMessage } from './ratelimiter.js';

export type MessageCallback = (msg: ChatMessage) => Promise<string | null>;

export function setupMessageHandler(
  client: Client,
  onBotCommand: MessageCallback,
  streamerNames: string[],
): void {
  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    const channelName = channel.replace('#', '');
    const user = tags.username ?? 'unknown';
    const isStreamer = streamerNames.includes(user.toLowerCase());

    const parsed = parseCommand(message);
    if (!parsed.isBotCommand) return;

    if (!canSendMessage()) {
      return;
    }

    const chatMsg: ChatMessage = {
      channel: channelName,
      user,
      message: parsed.text,
      isStreamer,
    };

    onBotCommand(chatMsg).then((response) => {
      if (response) {
        registerSentMessage();
        client.say(channel, response).catch(() => {});
      }
    });
  });
}
