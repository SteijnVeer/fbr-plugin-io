import type { infer as ZodInfer, ZodType } from 'zod';
import type { EventData, Socket } from './types';

function defineEventHandler<D extends EventData>(handler: (socket: Socket, data: D) => void) {
  return handler;
}

function createEventHandler<S extends ZodType>(
  schema: S,
  handler: (socket: Socket, data: ZodInfer<S>) => void,
  onInvalid?: (socket: Socket, data: unknown) => void,
) {
  return defineEventHandler<EventData>((socket, data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      onInvalid?.(socket, data);
      return;
    }
    handler(socket, result.data);
  });
}


export { createEventHandler, defineEventHandler };
export default defineEventHandler;
export type { EventData, Socket } from './types';

