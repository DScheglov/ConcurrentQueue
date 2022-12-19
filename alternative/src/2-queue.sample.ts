import { readdirSync, readFile } from 'fs';
import { join, parse } from 'path';
import { delay } from './common/delay';
import printStats from './common/print-stats';
import { queue, Callback } from './2-queue.priorities';
// import { queue, Callback } from './3-queue.pause';
// import { queue, Callback } from './4-queue.timeouts';
// import { queue, Callback } from './5-queue.factors';

const basePath = join(process.cwd(), '../');

const readLines = queue(
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
    deferredStart: false,
    getPriority(fileName) {
      const { name, ext } = parse(fileName);
      if (name === 'LICENSE') return 300;
      if (name.startsWith('.')) return 200;
      if (ext === '.md') return 100;
      return 10;
    },
  },
);

readdirSync(basePath, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map(({ name }) => join(basePath, name))
  .forEach((fileName) => {
    printStats(`Request ${fileName}`, readLines.stats());
    readLines(fileName, (error, lines) => {
      if (error != null) {
        console.log(`Failure on reading ${fileName}`, error);
      } else {
        console.log(`Lines in ${fileName}: ${lines}`);
      }

      const stats = readLines.stats();
      printStats(`Done for ${fileName}`, stats);

      if (stats.isDrain) {
        console.log('Queue is drain');
      }
    });
  });
