import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { parse } from 'node:url';

export function createTtsServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/tts' });
  const channelClients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req) => {
    const url = parse(req.url ?? '', true);
    const channel = (url.query.channel as string ?? '').toLowerCase();

    if (!channel) {
      ws.close(4000, 'channel query parameter required');
      return;
    }

    const clients = channelClients.get(channel) ?? new Set();
    clients.add(ws);
    channelClients.set(channel, clients);

    ws.on('close', () => {
      clients.delete(ws);
      if (clients.size === 0) {
        channelClients.delete(channel);
      }
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  function sendTts(channel: string, text: string): void {
    const clients = channelClients.get(channel.toLowerCase());
    if (!clients || clients.size === 0) return;

    const payload = JSON.stringify({ type: 'tts', text });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  return { sendTts, wss };
}
