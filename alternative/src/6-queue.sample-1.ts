import { readdirSync, readFile } from 'fs';
import { join } from 'path';
import { delay } from './common/delay';
import printStats from './common/print-stats';
import { queue, Callback } from './5-queue.factors';
import observeQueue from './6-queue.observable';

const basePath = join(process.cwd(), '../');

const readLines = observeQueue(queue(
  async (fileName: string, cb: Callback<number>) => {
    printStats(`Analysing ${fileName}`, readLines.stats());

    await delay((1 + (fileName.length % 5)) * 1000);

    readFile(fileName, (error, data) => {
      if (error != null) {
        cb(error);
        return;
      }

      const lines = data.toString('utf-8').split(/\n/).length;
      cb(null, lines);
    });
  },
  {
    concurrency: 3,
  },
));

readLines.onSuccess((lines, filename) => {
  console.log(`Lines in ${filename}: ${lines}`);
});

readLines.onFailure((error, filename) => {
  console.log(`Failure on reading ${filename}:\n`, error);
});

readLines.onDone((error, lines, filename) => {
  const stats = readLines.stats();
  printStats(`Done for ${filename}`, stats);
});

readLines.onDrain(() => {
  console.log('Queue is drain');
});

readdirSync(basePath, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map(({ name }) => join(basePath, name))
  .forEach((fileName) => {
    printStats(`Request ${fileName}`, readLines.stats());
    readLines(fileName, () => {
      // do something usefull here
    });
  });
