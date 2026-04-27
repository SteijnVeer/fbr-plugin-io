import { readdirSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Server as Io } from 'socket.io';
import { pathToFileURL } from 'url';
import './types';

const warn = (message: string) => log.warn(`[io] ${message}`);
const debug = (message: string) => log.debug(`[io] ${message}`);

async function importEvents(eventsDir: string): Promise<[string, Function][]> {
  const eventsDirPath = resolve(eventsDir);
  const files = readdirSync(eventsDirPath, { withFileTypes: true })
    .filter(entry => entry.isFile());
  const events = await Promise.all(files.map(async (file) => {
    const fileName = file.name.replace(extname(file.name), '');
    const module = await import(pathToFileURL(join(eventsDirPath, file.name)).href);
    const allExports = Object.entries(module);
    if (allExports.length === 0) {
      warn(`${file.name} has no exports, skipping.`);
      return [] as [string, Function][];
    }
    const eventHandlers: [string, Function][] = [];
    for (const [exportName, handler] of allExports) {
      if (typeof handler !== 'function') {
        warn(`Export '${exportName}' in ${file.name} is not a function, skipping.`);
        continue;
      }
      if (exportName === 'default' && fileName === 'index') {
        warn(`${file.name} has a default export but is named 'index', skipping.`);
        continue;
      }
      const eventName = fileName === 'index'
        ? exportName
        : exportName === 'default'
          ? fileName
          : `${fileName}:${exportName}`;
      eventHandlers.push([eventName, handler]);
    }
    if (eventHandlers.length === 0)
      warn(`${file.name} has no function exports, skipping.`);
    return eventHandlers;
  }));
  return events.flat();
}
async function ioPlugin() {
  const eventsDir = resolve(
    Fbr.isDev ? Fbr.config.paths.srcDir : Fbr.config.paths.buildDir,
    Fbr.config.io?.eventsDir ?? 'events'
  );
  Fbr.server._io = new Io(Fbr.server._httpServer);
  const allEvents = await importEvents(eventsDir);
  const events = allEvents
    .filter(([eventName]) => eventName !== 'connection');
  const connectionhandlers = allEvents
    .filter(([eventName]) => eventName === 'connection')
    .map(([_, handler]) => handler);
  Fbr.server._io.on('connection', (socket) => {
    debug(`a user connected: ${socket.id}`);
    socket.on('disconnect', () =>
      debug(`(${socket.id}) user disconnected`)
    );
    socket.onAny((event, data) =>
      debug(`(${socket.id}) Received event: ${event} with args: ${JSON.stringify(data)}`)
    );
    socket.onAnyOutgoing((event, data) =>
      debug(`(${socket.id}) Emitting event: ${event} with args: ${JSON.stringify(data)}`)
    );
    for (const [eventName, handler] of events)
      socket.on(eventName, (data) => handler(socket, data ?? null));
    for (const handler of connectionhandlers)
      handler(socket, null);
  });
}


export default ioPlugin;
export type * from './types';
export { ioPlugin };

