import type { ChatMessage } from '../twitch/client.js';

export function createTtsManager() {
  const ttsEnabled = new Map<string, boolean>();

  function isEnabled(channel: string): boolean {
    return ttsEnabled.get(channel.toLowerCase()) ?? false;
  }

  function toggle(channel: string): boolean {
    const key = channel.toLowerCase();
    const current = ttsEnabled.get(key) ?? false;
    ttsEnabled.set(key, !current);
    return !current;
  }

  function handleTtsCommand(msg: ChatMessage): string | null {
    if (!msg.isStreamer) return null;

    const enabled = toggle(msg.channel);
    return enabled ? 'TTS activado' : 'TTS desactivado';
  }

  return { isEnabled, toggle, handleTtsCommand };
}
