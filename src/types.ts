import '@steijnveer/file-based-router/utils';
import type { Server as IoServer, Socket as IoSocket } from 'socket.io';

type IoPluginConfig = {
  eventsDir?: string;
  extensions?: string[];
};

type EventsMap = Record<string, (data?: any) => void>;

type Io<SocketData = any> = IoServer<EventsMap, EventsMap, never, SocketData>;

type Socket<SocketData = any> = IoSocket<EventsMap, EventsMap, never, SocketData>;

declare module '@steijnveer/file-based-router' {
  interface Server {
    _io: Io;
  }
}


export type { EventsMap, Io, IoPluginConfig, Socket };

