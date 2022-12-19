import { addCallback, splitArgs } from './callbacks';
import type { AsyncCbFn, Callback } from './types';

type TimeoutErrorConstructor = {
  new(timeout: number, processName?: string): Error;
};

type TimeoutOptions = {
  timeout: number,
  timeoutError?: TimeoutErrorConstructor
};

export class TimeoutError extends Error {
  name = 'TimeoutEror';

  constructor(
    public readonly timeout: number,
    processName: string = 'anonymous function',
  ) {
    super(`${processName} takes longer then ${timeout}ms.`);
  }
}

type TimerId = ReturnType<typeof setTimeout> | null;

export const timeout = <Args extends any[], R>(
  fn: AsyncCbFn<Args, R>,
  options: TimeoutOptions,
  ...args: [...Args, Callback<R>]
) => {
  const TheTimeoutError = options.timeoutError ?? TimeoutError;
  const [justArgs, callback] = splitArgs(args);

  let timerId: TimerId = setTimeout(() => {
    if (timerId == null) return;
    timerId = null;
    callback(new TheTimeoutError!(options.timeout, fn.name));
  }, options.timeout);

  fn(...addCallback(justArgs, (error: unknown, result?: R) => {
    if (timerId == null) return;
    clearTimeout(timerId);
    timerId = null;
    callback(error, result);
  }));
};

export const withTimeout = <Args extends any[], R>(
  fn: AsyncCbFn<Args, R>,
  options: TimeoutOptions,
) => (...args: [...Args, Callback<R>]) => timeout(fn, options, ...args);
