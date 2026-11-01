import { parentPort, workerData } from "node:worker_threads";
const { moduleUrl, databasePath, claimTime } = workerData;
const { LocalSqliteOutbox } = await import(moduleUrl);
parentPort.postMessage({ ready: true });
parentPort.once("message", () => {
  const repository = new LocalSqliteOutbox(databasePath);
  try {
    const claim = repository.claimNext(claimTime, 30_000, 5);
    parentPort.postMessage({ eventId: claim?.eventId ?? null });
  } finally {
    repository.close();
    parentPort.close();
  }
});
