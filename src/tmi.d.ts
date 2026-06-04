declare module 'tmi.js' {
  interface ClientOptions {
    identity?: {
      username?: string;
      password?: string;
    };
    channels?: string[];
    connection?: {
      reconnect?: boolean;
      maxReconnectAttempts?: number;
      reconnectInterval?: number;
      maxReconnectInverval?: number;
    };
  }

  interface ChatUserstate {
    username?: string;
    'user-id'?: string;
    badges?: Record<string, string>;
    [key: string]: unknown;
  }

  class Client {
    constructor(opts: ClientOptions);
    connect(): Promise<[string, number]>;
    disconnect(): Promise<[string, number]>;
    say(channel: string, message: string): Promise<[string, string]>;
    on(event: 'message', listener: (channel: string, userstate: ChatUserstate, message: string, self: boolean) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export default Client;
}
