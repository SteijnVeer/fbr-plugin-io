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
// fbr.config.ts
import ioPlugin from '@steijnveer/fbr-plugin-io';
import defineConfig from '@steijnveer/file-based-router/defineConfig';

export default defineConfig({
  plugins: [ioPlugin],
  io: {
    eventsDir: 'events', // relative to the paths dir, default: 'events'
  },
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

The Socket.io server instance is available via the `Fbr.server` global:

```typescript
import type { Io } from '@steijnveer/fbr-plugin-io';

// Emit to all connected clients
Fbr.server._io.emit('broadcast', { message: 'Hello everyone!' });

// Access specific rooms
Fbr.server._io.to('room-name').emit('room:message', { text: 'Hello room!' });
```

## Configuration

Configure the plugin via `Fbr.Config` augmentation in `fbr.config.ts`:

```typescript
io?: {
  eventsDir?: string; // Directory for event handler files, relative to paths.srcDir (default: 'events')
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
type EventData = Record<string, any> | null;
type EventHandler = (socket: Socket, data: EventData) => void;
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

## Event Handler Helpers

The plugin ships a `defineEventHandler` subpath export with two helpers for writing typed, safe event handlers.

### `defineEventHandler`

A no-op identity wrapper that gives TypeScript the correct inferred type for the handler's `data` argument:

```typescript
import { defineEventHandler } from '@steijnveer/fbr-plugin-io/defineEventHandler';

export const message = defineEventHandler<{ text: string }>((socket, data) => {
  // data is typed as { text: string }
  socket.emit('message:response', { echo: data.text });
});
```

### `createEventHandler`

Wraps a handler with Zod runtime validation. The handler is only called when parsing succeeds; invalid data is silently ignored by default.

```typescript
import { createEventHandler } from '@steijnveer/fbr-plugin-io/defineEventHandler';
import { z } from 'zod';

export const message = createEventHandler(
  z.object({ text: z.string() }),
  (socket, data) => {
    // data is fully typed as { text: string }
    socket.emit('message:response', { echo: data.text });
  },
);
```

Provide an optional `onInvalid` callback to handle validation failures:

```typescript
export const message = createEventHandler(
  z.object({ text: z.string() }),
  (socket, data) => {
    socket.emit('message:response', { echo: data.text });
  },
  (socket, raw) => {
    socket.emit('error', { message: 'Invalid payload' });
  },
);
```

**Signature:**

```typescript
createEventHandler(schema: ZodType, handler: (socket, data) => void, onInvalid?: (socket, data: unknown) => void)
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
