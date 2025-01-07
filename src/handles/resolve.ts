import type { At } from "@atcute/client/lexicons";
import { isDid } from "./index.js";
import { resolveHandleViaDoH } from "./doh.js";
import { resolveHandleViaHttp } from "./http.js";

const didCache = new Map<string, At.DID>();
export async function resolveHandleAnonymously(handle: string) {
    if (isDid(handle)) return handle;
    if (didCache.has(handle)) {
        return didCache.get(handle)!;
    }

    const results = await Promise.allSettled([
        resolveHandleViaHttp(handle),
        resolveHandleViaDoH(handle),
    ]);

    const did = results
        .find(p => p.status === 'fulfilled')
        ?.value;

    if (did === undefined) {
        throw results;
    }

    didCache.set(handle, did);

    return did;
}
