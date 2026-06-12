import 'dotenv/config';
import { createTwitchClient } from './twitch/client.js';
import { setupMessageHandler } from './twitch/handler.js';
import { createGroqClient } from './groq/client.js';
import { createContextManager } from './context/manager.js';
import { createStreamChecker } from './stream/checker.js';
import { createHealthServer } from './health/server.js';
import { createHeartbeatPinger } from './health/heartbeat.js';
import { createTtsServer } from './tts/server.js';
import { createTtsManager } from './tts/manager.js';

async function main() {
  const {
    GROQ_API_KEY,
    TWITCH_USERNAME,
    TWITCH_OAUTH_TOKEN,
    TWITCH_CHANNELS,
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    PORT: PORT_STR,
  } = process.env;

  const PORT = parseInt(PORT_STR ?? '10000', 10);
  const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';

  if (!GROQ_API_KEY || !TWITCH_USERNAME || !TWITCH_OAUTH_TOKEN || !TWITCH_CHANNELS) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const channels = TWITCH_CHANNELS.split(',').map((c) => c.trim().toLowerCase());
  const streamerNames = [...channels];

  const twitchConfig = {
    username: TWITCH_USERNAME,
    oauthToken: TWITCH_OAUTH_TOKEN,
    channels,
  };

  const groq = await createGroqClient({ apiKey: GROQ_API_KEY, model: GROQ_MODEL });
  const context = createContextManager();
  const ttsManager = createTtsManager();

  const health = createHealthServer(PORT);
  const ttsServer = createTtsServer(health.server);
  const heartbeatPinger = createHeartbeatPinger(`http://localhost:${PORT}/health`);

  const streamChecker = createStreamChecker({
    clientId: TWITCH_CLIENT_ID ?? '',
    clientSecret: TWITCH_CLIENT_SECRET ?? '',
    channels,
  });

  streamChecker.onStreamEnd(() => {
    context.clearAll();
    heartbeatPinger.stop();
    console.log('Stream ended: context cleared, heartbeat stopped');
  });

  streamChecker.onStreamStart(() => {
    heartbeatPinger.start();
    console.log('Stream started: heartbeat enabled');
  });

  if (TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET) {
    streamChecker.startPolling();
  }

  if (streamChecker.fallbackMode) {
    heartbeatPinger.start();
  }

  const twitchClient = createTwitchClient(twitchConfig);

  const bypassStreamCheck = process.env.BYPASS_STREAM_CHECK === 'true';

  setupMessageHandler(
    twitchClient,
    async (msg) => {
      console.log(`Message received from ${msg.user} on ${msg.channel}: "${msg.message}"`);

      if (msg.message.trim() === 'tts') {
        return ttsManager.handleTtsCommand(msg);
      }

      if (!bypassStreamCheck && !streamChecker.isLive(msg.channel)) {
        console.log(`Blocked: stream is offline for ${msg.channel}`);
        return null;
      }

      console.log(`Processing message from ${msg.user}: "${msg.message}"`);
      const userContext = context.getContext(msg.user);
      const messageWithUser = `${msg.user} dice: ${msg.message}`;
      const response = await groq.generateResponse(messageWithUser, userContext);

      if (response) {
        context.addToContext(msg.user, { role: 'user', content: messageWithUser });
        context.addToContext(msg.user, { role: 'assistant', content: response });
        console.log(`Responding to ${msg.user}: "${response}"`);
      } else {
        console.log(`No response generated for ${msg.user} (rate limit or error)`);
      }

      if (response && ttsManager.isEnabled(msg.channel)) {
        ttsServer.sendTts(msg.channel, response);
      }

      return response;
    },
    streamerNames,
  );

  try {
    await twitchClient.connect();
    console.log(`Connected to Twitch as ${TWITCH_USERNAME}, channels: ${channels.join(', ')}`);
  } catch (err) {
    console.error('Failed to connect to Twitch:', err);
    process.exit(1);
  }

  process.on('SIGTERM', () => shutdown(twitchClient, health.server));
  process.on('SIGINT', () => shutdown(twitchClient, health.server));
}

async function shutdown(twitchClient: ReturnType<typeof createTwitchClient>, server: ReturnType<typeof createHealthServer>['server']) {
  console.log('Shutting down gracefully...');
  try {
    await twitchClient.disconnect();
  } catch {}
  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
