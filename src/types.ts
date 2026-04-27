import type { } from '@steijnveer/file-based-router';
import type { Server as IoServer, Socket as IoSocket } from 'socket.io';

type EventData = Record<string, any> | null;

type EventsMap = Record<string, (data?: EventData) => void>;

type Io<SocketData = any> = IoServer<EventsMap, EventsMap, never, SocketData>;

type Socket<SocketData = any> = IoSocket<EventsMap, EventsMap, never, SocketData>;

declare global {
  namespace Fbr {
    interface Server {
      _io: Io;
    }
    interface Config {
      io?: {
        /** Directory containing event handler files, relative to `paths.srcDir`. Default: `'events'` */
        eventsDir?: string;
      };
    }
  }
}


export type { EventData, EventsMap, Io, Socket };

