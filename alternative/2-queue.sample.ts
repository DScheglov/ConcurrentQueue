import { readdirSync, readFile } from "fs";
import { join, parse } from "path";
import { delay } from "./common/delay";
import { queue, Callback } from "./2-queue.priorities";
// import { queue, Callback } from "./3-queue.pause";
// import { queue, Callback } from "./4-queue.timeouts";
// import { queue, Callback } from "./5-queue.factors";

const basePath = join(__dirname, "../");

const readLines = queue(
  async function _readLines(fileName: string, cb: Callback<number>) {
    /** ----- DEBUG BLOCK ----- */
    const { running, concurrency, waiting } = readLines.stats();
    console.info(
      `Analysing ${fileName.padEnd(60)}\t` +
      `| running: ${running}/${concurrency}\t| waiting: ${waiting}`
    );

    await delay(2000);
    /** ----- END of DEBUG BLOCK ----- */

    readFile(fileName, (error, data) => {
      if (error != null) {
        cb(error);
        return;
      }

      const lines = data.toString("utf-8").split(/\n/).length;
      cb(null, lines);
    });
  },
  {
    concurrency: 3, 
    deferredStart: false, 
    getPriority(fileName) {
      const { name, ext } = parse(fileName);
      if (name === 'LICENSE') return 300;
      if (name.startsWith(".")) return 200;
      if (ext === '.md') return 100;
      return 10;
    },
  },
);

readdirSync(basePath, { withFileTypes: true })
  .filter(dirent =>  dirent.isFile())
  .map(({ name }) => join(basePath, name))
  .forEach(fileName => {
    const { running, concurrency, waiting } = readLines.stats();
    console.info(
      `Request ${fileName.padEnd(60)}\t` +
      `| running: ${running}/${concurrency}\t| waiting: ${waiting}`
    );
    readLines(fileName, (error, lines) => {
      if (error != null) {
        console.log(`Failure on reading ${fileName}`, error);
      } else {
        console.log(`Lines in ${fileName}: ${lines}`);
      }

      const { running, concurrency, waiting, isDrain } = readLines.stats();

      console.info(
        `Done for ${fileName.padEnd(60)}\t` +
        `| running: ${running}/${concurrency}\t| waiting: ${waiting}`
      );

      if (isDrain) {
        console.log("Queue is drain");
      }
    });
})