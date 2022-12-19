import observeCalls from './common/obseerve-calls';
import {
  QueueFn,
  Listener,
  SuccessCallback,
  FailureCallback,
  DrainCallback,
  ObserveQueueFn,
  Callback,
} from './common/types';

export const successListener = <Args extends any[], R>(
  callback: SuccessCallback<Args, R>,
): Listener<Args, R> => (
    error: unknown,
    result: R | undefined,
    ...args: Args
  ) => (
    error == null ? callback(result!, ...args) : undefined
  );

export const failureListener = <Args extends any[], R>(
  callback: FailureCallback<Args>,
): Listener<Args, R> => (
    error: unknown,
    result: R | undefined,
    ...args: Args
  ) => (
    error != null ? callback(error, ...args) : undefined
  );

export const drainListener = (
  queueFn: QueueFn<any, any>,
  callback: DrainCallback,
) => () => (queueFn.stats().isDrain ? callback() : undefined);

const observeQueue = <Args extends any[], R, P>(
  queueFn: QueueFn<Args, R> & P,
): ObserveQueueFn<Args, R> & P => {
  const observedCallsFn = observeCalls(queueFn);
  const observeQueueFn = (...args: [...Args, Callback<R>]) => observedCallsFn(...args);

  Object.assign(observeQueueFn, observedCallsFn, queueFn);

  observeQueueFn.onSuccess = (
    callback: SuccessCallback<Args, R>,
  ): () => void => observedCallsFn.subscribe(successListener(callback));

  observeQueueFn.onFailure = (
    callback: FailureCallback<Args>,
  ): () => void => observedCallsFn.subscribe(failureListener(callback));

  observeQueueFn.onDrain = (
    callback: DrainCallback,
  ): () => void => observedCallsFn.subscribe(drainListener(queueFn, callback));

  observeQueueFn.onDone = observedCallsFn.subscribe;

  return observeQueueFn as ObserveQueueFn<Args, R> & P;
};

export default observeQueue;
