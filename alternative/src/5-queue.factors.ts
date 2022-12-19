import { addCallback, splitArgs } from './common/callbacks';
import { TimeoutError, withTimeout } from './common/timeout';
import type { AsyncCbFn, Callback, QueueStats } from './common/types';

export { Callback, AsyncCbFn };

type Task<R> = {
  run: () => void,
  priority: number,
  expires: number | null,
  callback: Callback<R>;
  factor: any;
};

export type QueueOptions<Args extends any[]> = {
  concurrency?: number;
  deferredStart?: boolean;
  paused?: boolean;
  waitingTimeout?: number;
  processTimeout?: number;
  getPriority?: (...args: Args) => number;
  getFactor?: (...args: Args) => any;
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
    processTimeout,
    getPriority,
    getFactor,
  } = options;
  let {
    paused = false,
  } = options;
  const isPrioritized = typeof getPriority === 'function';
  const hasFactor = typeof getFactor === 'function';
  const queues = new Map<any, Array<Task<R>>>();
  const waiting: Array<Task<R>>[] = [];
  let running = 0;

  if (processTimeout) {
    // eslint-disable-next-line no-param-reassign
    fn = withTimeout(fn, { timeout: processTimeout });
  }

  const isExpired = ({ expires }: Task<R>, now: number = Date.now()) => (
    expires != null && expires < now
  );

  const extractNextTask = () => {
    const tasks = waiting.shift();
    if (tasks == null) return null;

    const task = tasks.shift();

    if (tasks.length > 0) {
      waiting.push(tasks);
    } else if (task != null) queues.delete(task.factor);

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
    const tasks = queues.get(task.factor) ?? [];
    tasks.push(task);
    tasks.sort(byPriorityDesc);

    if (!queues.has(task.factor)) {
      queues.set(task.factor, tasks);
      waiting.push(tasks);
    }

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

    const factor = hasFactor ? getFactor(...justArgs) : 0;

    addTask({
      run, priority, expires, callback, factor,
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
    waiting: waiting.reduce((total, tasks) => total + tasks.length, 0),
    concurrency,
    get isDrain() {
      return this.running === 0 && this.waiting === 0;
    },
  });

  return queueFn;
};
