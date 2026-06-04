import fetch from 'node-fetch';

const HEARTBEAT_INTERVAL_MS = 300000;

export function createHeartbeatPinger(healthUrl: string) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let enabled = false;

  function start(): void {
    if (timer) return;
    enabled = true;

    timer = setInterval(async () => {
      try {
        await fetch(healthUrl);
      } catch {
        // ignore heartbeat failures
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stop(): void {
    enabled = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { start, stop };
}
