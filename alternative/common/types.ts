export type Callback<R> = (error: unknown, result?: R) => void;
export type AsyncCbFn<Args extends any[], R> = (...args: [...Args, Callback<R>]) => void;