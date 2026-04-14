# @steijnveer/fbr-plugin-io

Socket.io integration plugin for [@steijnveer/file-based-router](https://github.com/steijnveer/file-based-router)

## Overview

This plugin adds Socket.io support to your file-based-router application with automatic event handler discovery and registration. Define your Socket.io event handlers in files, and the plugin will automatically load and register them.

## Installation

```bash
npm install @steijnveer/fbr-plugin-io
```

## Quick Start

### 1. Configure the plugin

```typescript
// '/fbr.config.ts'
import ioPlugin from '@steijnveer/fbr-plugin-io';
import defineConfig from '@steijnveer/file-based-router/defineConfig';

export default defineConfig({
  plugins: [
    ioPlugin({
      eventsDir: 'src\\events',  // Directory containing event handlers
      extensions: ['.ts', '.js'] // File extensions to load
    })
  ]
});
```

### 2. Create event handlers

Create event handler files in your events directory (default: `src/events`):

**src/events/message.ts**
```typescript
import type { Socket } from '@steijnveer/fbr-plugin-io';

// Export named functions - function name becomes the event name
export function message(socket: Socket, data: { text: string }) {
  log('Received message:', data.text);
  socket.emit('message:response', { echo: data.text });
}
```

**src/events/chat.ts**
```typescript
import type { Socket } from '@steijnveer/fbr-plugin-io';

export function join(socket: Socket, data: { room: string }) {
  socket.join(data.room);
  socket.to(data.room).emit('user:joined', { id: socket.id });
}

export function leave(socket: Socket, data: { room: string }) {
  socket.leave(data.room);
  socket.to(data.room).emit('user:left', { id: socket.id });
}
```

**src/events/index.ts** (for connection handlers)
```typescript
import type { Socket } from '@steijnveer/fbr-plugin-io';

// Special 'connection' event handlers
export function connection(socket: Socket) {
  log('User connected: ' + socket.id);
  socket.emit('welcome', { message: 'Welcome to the server!' });
}
```

### 3. Access Socket.io server instance

The Socket.io server instance is available on your server object:

```typescript
import type { Io } from '@steijnveer/fbr-plugin-io';

// Emit to all connected clients
server._io.emit('broadcast', { message: 'Hello everyone!' });

// Access specific rooms
server._io.to('room-name').emit('room:message', { text: 'Hello room!' });
```

## Configuration

### Plugin Options

```typescript
interface IoPluginConfig {
  eventsDir?: string;    // Directory containing event handlers (default: 'src\\events')
  extensions?: string[]; // File extensions to load (default: ['.ts', '.js'])
}
```

## Event Handler Conventions

### Event Naming

- **File name becomes event prefix**: `message.ts` → `message` event
- **Named exports**: Use function name as event name
  - `export function join()` in `chat.ts` → `chat:join` event
- **Default exports**: Use file name as event name
  - `export default function()` in `message.ts` → `message` event
- **index.ts**: Exports use direct function names
  - `export function connection()` in `index.ts` → `connection` event

### Event Handler Signature

```typescript
type EventHandler = (socket: Socket, data: any) => void;
```

- **socket**: The Socket.io socket instance for the connected client
- **data**: The data sent from the client (null if no data provided)

### Special Events

- **connection**: Handlers named `connection` are executed when a client connects
- These handlers run after other event listeners are attached to the socket

## Examples

### Broadcasting to all clients

**src/events/admin.ts**
```typescript
import type { Socket } from '@steijnveer/fbr-plugin-io';

export function announce(socket: Socket, data: { message: string }) {
  // Broadcast to all clients including sender
  socket.server.emit('announcement', { message: data.message });
}
```

### Room-based chat

**src/events/room.ts**
```typescript
import type { Socket } from '@steijnveer/fbr-plugin-io';

export function join(socket: Socket, data: { roomId: string }) {
  socket.join(data.roomId);
  socket.to(data.roomId).emit('room:userJoined', { 
    userId: socket.id,
    roomId: data.roomId 
  });
}

export function message(socket: Socket, data: { roomId: string, text: string }) {
  socket.to(data.roomId).emit('room:message', {
    userId: socket.id,
    text: data.text,
    timestamp: Date.now()
  });
}
```

## TypeScript Support

The plugin includes full TypeScript support with type definitions:

```typescript
import type { 
  Socket,      // Socket.io socket instance with type safety
  Io,          // Socket.io server instance
  EventsMap,   // Event name to handler mapping
  IoPluginConfig // Plugin configuration options
} from '@steijnveer/fbr-plugin-io';
```

## Client-Side Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>
  <script>
    const socket = io();
    
    // Listen for events
    socket.on('welcome', (data) => {
      console.log(data.message);
    });
    
    // Emit events (matches your handler in message.ts)
    socket.emit('message', { text: 'Hello server!' });
    
    // Listen for responses
    socket.on('message:response', (data) => {
      console.log('Echo:', data.echo);
    });
  </script>
</body>
</html>
```

## Debug Logging

The plugin includes built-in debug logging for:
- User connections/disconnections
- All incoming events with data
- All outgoing events with data

Logs include the socket ID for easy debugging.

## License

MIT
