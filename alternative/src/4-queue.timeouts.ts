import { addCallback, splitArgs } from './common/callbacks';
import { TimeoutError } from './common/timeout';
import type { AsyncCbFn, Callback, QueueStats } from './common/types';

export { Callback, AsyncCbFn };

type Task<R> = {
  run: () => void,
  priority: number,
  expires: number | null,
  callback: Callback<R>;
};

export type QueueOptions<Args extends any[]> = {
  concurrency?: number;
  deferredStart?: boolean;
  paused?: boolean;
  waitingTimeout?: number;
  getPriority?: (...args: Args) => number;
};

const byPriorityDesc = (
  itemA: { priority: number },
  itemB: { priority: number },
) => itemB.priority - itemA.priority;

export const queue = <Args extends any[], R>(
  fn: AsyncCbFn<Args, R>,
  options: QueueOptions<Args> = {},
) => {
  const {
    concurrency = 1,
    deferredStart = false,
    waitingTimeout,
    getPriority,
  } = options;
  let {
    paused = false,
  } = options;
  const isPrioritized = typeof getPriority === 'function';
  const waiting: Array<Task<R>> = [];
  let running = 0;

  const isExpired = ({ expires }: Task<R>, now: number = Date.now()) => (
    expires != null && expires < now
  );

  const extractNextTask = () => {
    const task = waiting.shift();

    if (task != null && isExpired(task)) {
      task.callback(
        new TimeoutError(waitingTimeout!, `Waiting in queue(${fn.name})`),
      );
      return null;
    }

    return task;
  };

  const next = () => {
    if (running >= concurrency || waiting.length === 0 || paused) return;

    const task = extractNextTask();

    if (task == null) {
      setTimeout(next, 0);
      return;
    }

    task.run();
  };

  const start = () => (deferredStart ? setTimeout(next, 0) : next());

  const addTask = (task: Task<R>) => {
    waiting.push(task);
    if (isPrioritized) waiting.sort(byPriorityDesc);
    start();
  };

  const queueFn = (...args: [...Args, Callback<R>]) => {
    const [justArgs, callback] = splitArgs(args);

    const run = () => {
      running += 1;
      fn(...addCallback(justArgs, (error: unknown, result?: R) => {
        running -= 1;
        callback(error, result);
        next();
      }));
    };

    const priority = isPrioritized ? getPriority(...justArgs) : 0;

    const expires = waitingTimeout != null ? Date.now() + waitingTimeout : null;

    addTask({
      run, priority, expires, callback,
    });
  };

  queueFn.pause = () => {
    paused = true;
  };

  queueFn.resume = () => {
    if (!paused) return;
    paused = false;
    start();
  };

  queueFn.stats = (): QueueStats => ({
    running,
    waiting: waiting.length,
    concurrency,
    get isDrain() {
      return this.running === 0 && this.waiting === 0;
    },
  });

  return queueFn;
};
