import { runParse } from '../workers/handlers';
import type { ParseOp, ParseRequests, ParseResults, ProgressCallback } from '../workers/handlers';
import type { WorkerRequest, WorkerResponse } from '../workers/parse.worker';

interface Pending {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: ProgressCallback;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

const failAll = (error: Error) => {
    pending.forEach(p => p.reject(error));
    pending.clear();
    worker?.terminate();
    worker = null;
};

const getWorker = (): Worker => {
    if (worker) return worker;
    const created = new Worker(new URL('../workers/parse.worker.ts', import.meta.url), { type: 'module' });
    created.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const entry = pending.get(message.id);
        if (!entry) return;
        if (message.type === 'progress') {
            entry.onProgress?.(message.processed, message.total);
            return;
        }
        pending.delete(message.id);
        if (message.type === 'result') entry.resolve(message.value);
        else entry.reject(new Error(message.message));
    };
    created.onerror = (event) => failAll(new Error(event.message || 'The import worker crashed.'));
    worker = created;
    return created;
};

/**
 * Runs a parsing job off the main thread. The window stays responsive while a very large
 * export is read; `onProgress` reports (processed, total) where the job supports it.
 * Without Worker support (unit tests) the same code runs inline.
 */
export const parseInWorker = <Op extends ParseOp>(
    op: Op,
    payload: ParseRequests[Op],
    onProgress?: ProgressCallback
): Promise<ParseResults[Op]> => {
    if (typeof Worker === 'undefined') {
        return new Promise((resolve, reject) => {
            try {
                resolve(runParse(op, payload, onProgress));
            } catch (error) {
                reject(error);
            }
        });
    }
    return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject, onProgress });
        getWorker().postMessage({ id, op, payload } satisfies WorkerRequest);
    });
};
