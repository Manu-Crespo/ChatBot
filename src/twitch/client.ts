import { Client } from 'tmi.js';

export interface TwitchConfig {
  username: string;
  oauthToken: string;
  channels: string[];
}

export interface ChatMessage {
  channel: string;
  user: string;
  message: string;
  isStreamer: boolean;
}

export function createTwitchClient(config: TwitchConfig) {
  const client = new Client({
    identity: {
      username: config.username,
      password: config.oauthToken,
    },
    channels: config.channels,
    connection: {
      reconnect: true,
      maxReconnectAttempts: Infinity,
      reconnectInterval: 1000,
      maxReconnectInverval: 300000,
    },
  });

  return client;
}
