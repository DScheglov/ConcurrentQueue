import { addCallback, splitArgs } from './callbacks';
import {
  AsyncCbFn, Callback, Listener, ObservableAsyncCbFn,
} from './types';

const observeCalls = <
  Args extends any[],
  R,
  P,
>(fn: AsyncCbFn<Args, R> & P): ObservableAsyncCbFn<Args, R> & P => {
  const listeners: Array<Listener<Args, R>> = [];

  const observableFn = (...args: [...Args, Callback<R>]) => {
    const [justArgs, callback] = splitArgs(args);
    fn(...addCallback(justArgs, (error: unknown, result?: R) => {
      callback(error, result);
      listeners.forEach(
        (listener) => listener(error, result, ...justArgs),
      );
    }));
  };

  Object.assign(observableFn, fn);

  const unsubscribe = (listener: Listener<Args, R>) => {
    const index = listeners.indexOf(listener);
    if (index < 0) return;
    listeners.splice(index, 1);
  };

  observableFn.subscribe = (listener: Listener<Args, R>) => {
    listeners.push(listener);
    return () => unsubscribe(listener);
  };

  observableFn.unsubscribe = unsubscribe;

  return observableFn as ObservableAsyncCbFn<Args, R> & P;
};

export default observeCalls;
