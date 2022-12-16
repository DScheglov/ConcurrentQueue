import { addCallback, splitArgs } from "./common/callbacks";
import type { AsyncCbFn, Callback } from "./common/types";

export { Callback, AsyncCbFn };

type Task = {
  run: () => void,
}

export type QueueOptions = {
  concurrency?: number;
  deferredStart?: boolean;
}

export const queue = <Args extends any[], R>(
  fn: AsyncCbFn<Args, R>,
  { 
    concurrency = 1, 
    deferredStart = false,
  }: QueueOptions = {}
) => {
  const waiting: Array<Task> = [];
  let running = 0;

  const extractNextTask = () => waiting.shift();

  const next = () => {
    if (running >= concurrency || waiting.length === 0) return;

    const task = extractNextTask();

    if (task == null) {
      setTimeout(next, 0);
      return;
    }

    task.run();
  }

  const start = () => deferredStart ? setTimeout(next, 0) : next();

  const addTask = (task: Task) => {
    waiting.push(task);
    start();
  }

  const queueFn = (...args: [...Args, Callback<R>]) => {
    const [justArgs, callback] = splitArgs(args);

    const run = () => {
      running++;
      fn(...addCallback(justArgs, (error: unknown, result?: R) => {
        running--;
        callback(error, result);
        next();
      }));
    };

    addTask({ run });
  }

  queueFn.stats = () => ({
    running,
    waiting: waiting.length,
    concurrency,
    get isDrain() {
      return this.running === 0 && this.waiting === 0;
    },
  });

  return queueFn;
}