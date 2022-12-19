import { readdirSync, readFile } from 'fs';
import { join } from 'path';
import { queue } from './1-queue.concurrency';
// import { queue } from "./2-queue.priorities";
// import { queue } from "./3-queue.pause";
// import { queue } from "./4-queue.timeouts";
// import { queue } from "./5-queue.factors";

const basePath = join(process.cwd(), '../');

const read = queue(readFile, { concurrency: 3 });

readdirSync(basePath, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map(({ name }) => join(basePath, name))
  .forEach((fileName) => read(fileName, (error, data) => {
    if (error != null) {
      console.log(`Failure on reading ${fileName}`, error);
    } else {
      const lines = data!.toString('utf8').split(/\n/).length;
      console.log(`Lines in ${fileName}: ${lines}`);
    }
  }));
