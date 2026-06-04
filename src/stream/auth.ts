import fetch from 'node-fetch';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export interface TwitchAppToken {
  accessToken: string;
  expiresAt: number;
}

export async function getAppAccessToken(clientId: string, clientSecret: string): Promise<TwitchAppToken | null> {
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });

    const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, { method: 'POST' });

    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: TwitchAppToken): boolean {
  return Date.now() >= token.expiresAt - 60000;
}
