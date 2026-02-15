import { getDidDocument, getPdsEndpoint } from './handles/did-document.js';
import type { Did } from "@atcute/lexicons";
import { resolveHandleAnonymously } from "./handles/resolve.js";
import type { DidDocument } from '@atcute/identity';

const didPdsCache = new Map<string, { did: Did; pds: string, didDocument: DidDocument }>();

export async function getDidAndPds(handleOrDid: string): Promise<{ did: Did; pds: string, didDocument: DidDocument }> {
    if (didPdsCache.has(handleOrDid)) {
        return didPdsCache.get(handleOrDid)!;
    }

    const did = await resolveHandleAnonymously(handleOrDid);
    const didDocument = await getDidDocument(did);
    const pds = getPdsEndpoint(didDocument);
    if (!pds) throw new Error(`No PDS for ${handleOrDid} (${did})!`);

    didPdsCache.set(handleOrDid, { did, pds, didDocument });

    return { did, pds, didDocument };
}
