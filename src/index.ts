import type { Server } from '@steijnveer/file-based-router';
import { readdirSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Server as Io } from 'socket.io';
import { pathToFileURL } from 'url';
import type { IoPluginConfig } from './types';

async function importEvents(eventsDir: string, extensions: string[]): Promise<[string, Function][]> {
  const eventsDirPath = resolve(eventsDir);
  const files = readdirSync(eventsDirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && extensions.includes(extname(entry.name)));
  const events = await Promise.all(files.map(async (file) => {
    const fileName = file.name.replace(extname(file.name), '');
    const module = await import(pathToFileURL(join(eventsDirPath, fileName)).href);
    const eventHandlers = Object.entries(module)
      .filter(([_, handler]) => typeof handler === 'function');
    return fileName === 'index'
      ? eventHandlers as [string, Function][]
      : eventHandlers.map(([exportName, handler]) => [
        exportName === 'default'
          ? fileName
          : `${fileName}:${exportName}`, handler
        ] as [string, Function]);
  }));
  return events.flat();
}
function ioPlugin({ eventsDir, extensions }: IoPluginConfig = {}) {
  const eventsPromise = importEvents(eventsDir ?? 'src\\events', extensions ?? ['.ts', '.js']);
  return async (server: Server) => {
    server._io = new Io(server._httpServer);
    const allEvents = await eventsPromise;
    const events = allEvents
      .filter(([eventName]) => eventName !== 'connection');
    const connectionhandlers = allEvents
      .filter(([eventName]) => eventName === 'connection')
      .map(([_, handler]) => handler);
    server._io.on('connection', (socket) => {
      log.debug(`a user connected: ${socket.id}`);
      socket.on('disconnect', () => {
        log.debug(`(${socket.id}) user disconnected`);
      });
      socket.onAny((event, data) => {
        log.debug(`(${socket.id}) Received event: ${event} with args: ${JSON.stringify(data)}`);
      });
      socket.onAnyOutgoing((event, data) => {
        log.debug(`(${socket.id}) Emitting event: ${event} with args: ${JSON.stringify(data)}`);
      });
      for (const [eventName, handler] of events)
        socket.on(eventName, (data) => handler(socket, data ?? null));
      for (const handler of connectionhandlers)
        handler(socket, null);
    });
  };
}


export default ioPlugin;
export type * from './types';
export { ioPlugin };

