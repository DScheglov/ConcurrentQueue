import { QueueStats } from './types';

export default function printStats(
  subject: string,
  { running, concurrency, waiting }: QueueStats,
) {
  console.info(
    `${subject.padEnd(80)}\t`
    + `| running: ${running}/${concurrency}\t| waiting: ${waiting}`,
  );
}
