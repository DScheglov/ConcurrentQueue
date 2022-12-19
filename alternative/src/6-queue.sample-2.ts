import { createHash } from 'crypto';
import { readdirSync, readFile } from 'fs';
import { join } from 'path';
import { delay } from './common/delay';
import printStats from './common/print-stats';
import { queue, Callback } from './5-queue.factors';
import observeQueue from './6-queue.observable';

const basePath = join(process.cwd(), './');

const readFileToBuf = observeQueue(queue(
  async (fileName: string, cb: Callback<Buffer>) => {
    printStats(`readFileToBuf: ${fileName}`, readFileToBuf.stats());

    await delay((1 + (fileName.length % 5)) * 1000);

    readFile(fileName, (error, data) => {
      if (error != null) {
        cb(error);
        return;
      }

      cb(null, data);
    });
  },
  {
    concurrency: 5,
  },
));

readFileToBuf.onSuccess((data, filename) => {
  console.log(`readFileToBuf: Bytes in ${filename}: ${data.byteLength}`);
});

readFileToBuf.onFailure((error, filename) => {
  console.log(`readFileToBuf: Failure on reading ${filename}:\n`, error);
});

readFileToBuf.onDone((error, lines, filename) => {
  const stats = readFileToBuf.stats();
  printStats(`readFileToBuf: Done for ${filename}`, stats);
});

readFileToBuf.onDrain(() => {
  console.log('readFileToBuf: Queue is drain');
});

const readLines = observeQueue(queue(
  async (fileName: string, data: Buffer, cb: Callback<number>) => {
    printStats(`readLines: ${fileName}`, readLines.stats());

    await delay((1 + (fileName.length % 7)) * 100);

    const lines = data.toString('utf-8').split(/\n/).length;
    cb(null, lines);
  },
  { concurrency: 3 },
));

readLines.onSuccess((lines, filename) => {
  console.log(`readLines: Lines in ${filename}: ${lines}`);
});

readLines.onFailure((error, filename) => {
  console.log(`readLines: Failure on processing ${filename}:\n`, error);
});

readLines.onDone((error, lines, filename) => {
  const stats = readLines.stats();
  printStats(`readLines: Done for ${filename}`, stats);
});

readLines.onDrain(() => {
  console.log('readLines: Queue is drain');
});

const calcHash = observeQueue(queue(
  async (fileName: string, data: Buffer, cb: Callback<string>) => {
    printStats(`calcHash: ${fileName}`, calcHash.stats());

    await delay((1 + (fileName.length % 13)) * 100);

    const sha256 = createHash('sha256').update(data).digest().toString('hex');
    cb(null, sha256);
  },
  { concurrency: 1 },
));

calcHash.onSuccess((hash, filename) => {
  console.log(`calcHash: Hash of ${filename}:\n\t${hash}`);
});

calcHash.onFailure((error, filename) => {
  console.log(`calcHash: Failure on processing ${filename}:\n`, error);
});

calcHash.onDone((error, hash, filename) => {
  const stats = calcHash.stats();
  printStats(`calcHash: Done for ${filename}`, stats);
});

calcHash.onDrain(() => {
  console.log('calcHash: Queue is drain');
});

// piping readFileToBuf to readLines
readFileToBuf.onSuccess((data, filename) => readLines(filename, data, () => {}));

// piping readFileToBuf to caclHash
readFileToBuf.onSuccess((data, filename) => calcHash(filename, data, () => {}));

readdirSync(basePath, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map(({ name }) => join(basePath, name))
  .forEach((fileName) => {
    printStats(`Start for ${fileName}`, readFileToBuf.stats());
    readFileToBuf(fileName, () => {});
  });
