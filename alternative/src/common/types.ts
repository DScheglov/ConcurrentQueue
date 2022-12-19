export type Callback<R> = (error: unknown, result?: R) => void;

export type AsyncCbFn<Args extends any[], R> = (...args: [...Args, Callback<R>]) => void;

export type ArgsOf<T> = T extends (...args: [...infer Args, Callback<any>]) => void ? Args : never;
export type ResultOf<T> = T extends (...args: [...any[], Callback<infer R>]) => void ? R : never;

export type QueueStats = Readonly<{
  running: number;
  waiting: number;
  concurrency: number;
  isDrain: boolean;
}>;

export type QueueFn<Args extends any[], R> =
  & AsyncCbFn<Args, R>
  & {
    pause(): void;
    resume(): void;
    stats(): QueueStats;
  };

export type Listener<Args extends any[], R> = (
  error: unknown,
  result: R | undefined,
  ...args: Args
) => void;

export type SuccessCallback<Args extends any[], R> = (result: R, ...args: Args) => void;
export type FailureCallback<Args extends any[]> = (error: unknown, ...args: Args) => void;
export type DrainCallback = () => void;

export type ObservableAsyncCbFn<Args extends any[], R> =
  & AsyncCbFn<Args, R>
  & {
    subscribe(listener: Listener<Args, R>): () => void;
    unsubscribe(listener: Listener<Args, R>): void;
  };

export type ObserveQueueFn<Args extends any[], R> =
  & ObservableAsyncCbFn<Args, R>
  & QueueFn<Args, R>
  & {
    onSuccess(callback: SuccessCallback<Args, R>): () => void;
    onFailure(callback: FailureCallback<Args>): () => void;
    onDone(callback: Listener<Args, R>): () => void;
    onDrain(callback: DrainCallback): () => void;
  };
