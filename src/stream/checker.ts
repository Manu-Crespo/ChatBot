import fetch from 'node-fetch';
import type { TwitchAppToken } from './auth.js';
import { getAppAccessToken, isTokenExpired } from './auth.js';

const HELIX_STREAMS_URL = 'https://api.twitch.tv/helix/streams';
const POLL_INTERVAL_MS = 300000;

export interface StreamCheckerConfig {
  clientId: string;
  clientSecret: string;
  channels: string[];
}

export interface StreamState {
  liveChannels: Set<string>;
  fallbackMode: boolean;
}

export function createStreamChecker(config: StreamCheckerConfig) {
  let token: TwitchAppToken | null = null;
  let fallbackMode = !config.clientId || !config.clientSecret;
  let liveChannels = new Set<string>();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let onStreamStart: ((channel: string) => void) | null = null;
  let onStreamEnd: ((channel: string) => void) | null = null;

  async function refreshToken(): Promise<boolean> {
    if (token && !isTokenExpired(token)) return true;

    const newToken = await getAppAccessToken(config.clientId, config.clientSecret);
    if (!newToken) {
      fallbackMode = true;
      return false;
    }

    token = newToken;
    fallbackMode = false;
    return true;
  }

  async function checkStreams(): Promise<void> {
    if (fallbackMode) return;

    const hasValidToken = await refreshToken();
    if (!hasValidToken || !token) return;

    const previousLive = new Set(liveChannels);
    const currentLive = new Set<string>();

    for (const channel of config.channels) {
      try {
        const url = `${HELIX_STREAMS_URL}?user_login=${channel.toLowerCase()}`;
        const res = await fetch(url, {
          headers: {
            'Client-Id': config.clientId,
            Authorization: `Bearer ${token.accessToken}`,
          },
        });

        if (!res.ok) {
          fallbackMode = true;
          return;
        }

        const data = (await res.json()) as { data: Array<unknown> };
        if (data.data.length > 0) {
          currentLive.add(channel);
        }
      } catch {
        fallbackMode = true;
        return;
      }
    }

    liveChannels = currentLive;

    for (const channel of currentLive) {
      if (!previousLive.has(channel)) {
        onStreamStart?.(channel);
      }
    }

    for (const channel of previousLive) {
      if (!currentLive.has(channel)) {
        onStreamEnd?.(channel);
      }
    }
  }

  function startPolling(): void {
    if (pollTimer) return;
    checkStreams();
    pollTimer = setInterval(checkStreams, POLL_INTERVAL_MS);
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function isLive(channel: string): boolean {
    if (fallbackMode) return true;
    return liveChannels.has(channel);
  }

  function onStreamStartCallback(cb: (channel: string) => void): void {
    onStreamStart = cb;
  }

  function onStreamEndCallback(cb: (channel: string) => void): void {
    onStreamEnd = cb;
  }

  return {
    startPolling,
    stopPolling,
    isLive,
    onStreamStart: onStreamStartCallback,
    onStreamEnd: onStreamEndCallback,
    get liveChannels(): ReadonlySet<string> {
      return liveChannels;
    },
    get fallbackMode(): boolean {
      return fallbackMode;
    },
  };
}
