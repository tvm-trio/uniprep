import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

if (typeof (global as any).setImmediate === 'undefined') {
  (global as any).setImmediate = (
    fn: (...args: any[]) => void,
    ...args: any[]
  ) => {
    return setTimeout(fn, 0, ...args);
  };
}

if (typeof (global as any).clearImmediate === 'undefined') {
  (global as any).clearImmediate = (id: any) => {
    clearTimeout(id);
  };
}
