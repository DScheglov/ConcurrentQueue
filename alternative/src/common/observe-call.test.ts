import {
  describe, expect, it, jest,
} from '@jest/globals';
import observeCalls from './obseerve-calls';
import { Callback } from './types';

describe('observeCalls', () => {
  it('allows returns a function', () => {
    expect(typeof observeCalls(() => {})).toBe('function');
  });

  it('copies all static props from wrapped functioon', () => {
    const fn = () => {};
    fn.someProperty = Symbol('some property');

    expect(observeCalls(fn).someProperty).toBe(fn.someProperty);
  });

  it('returning function could be used in the same way as original one', () => {
    const id = (value: number, cb: Callback<number>) => cb(null, value);

    const oid = observeCalls(id);
    const cb = jest.fn();

    oid(1, cb);
    id(1, cb);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenNthCalledWith(1, null, 1);
    expect(cb).toHaveBeenNthCalledWith(2, null, 1);
  });

  it('allows to subscribe for calls', () => {
    const oid = observeCalls(
      (value: number, cb: Callback<number>) => cb(null, value),
    );
    const cb = jest.fn();
    const unsubscribe = oid.subscribe(cb);

    oid(1, () => {});
    oid(2, () => {});
    oid(3, () => {});

    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb).toHaveBeenNthCalledWith(1, null, 1, 1);
    expect(cb).toHaveBeenNthCalledWith(2, null, 2, 2);
    expect(cb).toHaveBeenNthCalledWith(3, null, 3, 3);

    unsubscribe();
  });

  it('allows to unsubscribe for calls', () => {
    const oid = observeCalls(
      (value: number, cb: Callback<number>) => cb(null, value),
    );
    const cb = jest.fn();
    const unsubscribe = oid.subscribe(cb);

    oid(1, () => {});
    oid(2, () => {});
    unsubscribe();
    oid(3, () => {});

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenNthCalledWith(1, null, 1, 1);
    expect(cb).toHaveBeenNthCalledWith(2, null, 2, 2);
  });

  it('allows to subscribe for calls several times', () => {
    const oid = observeCalls(
      (value: number, cb: Callback<number>) => cb(null, value),
    );
    const cb1 = jest.fn();
    const unsubscribe1 = oid.subscribe(cb1);
    const cb2 = jest.fn();
    const unsubscribe2 = oid.subscribe(cb2);

    oid(1, () => {});

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb1).toHaveBeenNthCalledWith(1, null, 1, 1);

    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenNthCalledWith(1, null, 1, 1);

    unsubscribe1();
    unsubscribe2();
  });
});
