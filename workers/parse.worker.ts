import { runParse } from './handlers';
import type { ParseOp, ParseRequests } from './handlers';

export interface WorkerRequest {
    id: number;
    op: ParseOp;
    payload: ParseRequests[ParseOp];
}

export type WorkerResponse =
    | { id: number; type: 'progress'; processed: number; total: number }
    | { id: number; type: 'result'; value: unknown }
    | { id: number; type: 'error'; message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const { id, op, payload } = event.data;
    try {
        const value = runParse(op, payload as never, (processed, total) => {
            self.postMessage({ id, type: 'progress', processed, total } satisfies WorkerResponse);
        });
        self.postMessage({ id, type: 'result', value } satisfies WorkerResponse);
    } catch (error) {
        self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : String(error) } satisfies WorkerResponse);
    }
};
