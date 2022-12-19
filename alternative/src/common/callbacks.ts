import { Callback } from './types';

export const splitArgs = <Args extends any[], R>(args: [...Args, Callback<R>]): [Args, Callback<R>] => [
  args.slice(0, -1) as Args,
  args[args.length - 1],
];

export const addCallback = <Args extends any[], R>(
  args: Args,
  cb: Callback<R>,
): [...Args, Callback<R>] => [...args, cb];
