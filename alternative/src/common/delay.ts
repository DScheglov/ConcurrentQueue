export const delay = (ms: number = 0, indication: boolean = false) => {
  if (indication) console.log('.');
  const intervalId = indication ? setInterval(console.log, 500, '.') : null;
  return new Promise(
    (resolve) => setTimeout(() => {
      if (intervalId != null) clearInterval(intervalId);
      resolve(undefined);
    }, ms),
  );
};
