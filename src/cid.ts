// import { sha256 } from '@noble/hashes/sha256';
import { type Cid, type CidLink, fromCidLink } from '@atcute/cid';
import type { At } from '@atcute/client/lexicons';

export async function isCidMatching(data: ArrayBufferLike, blob: At.Blob) {
    const cid = fromCidLink(blob.ref);
    const digest = cid.digest.contents;

    const actualDigest = new Uint8Array(await crypto.subtle.digest('sha-256', data));

    return isEqualBytes(digest, actualDigest);
}

// https://stackoverflow.com/a/77736145
function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
    if (typeof indexedDB !== 'undefined' && indexedDB.cmp) {
        return indexedDB.cmp(bytes1, bytes2) === 0;
    }

    if (bytes1.length !== bytes2.length) {
        return false;
    }

    for (let i = 0; i < bytes1.length; i++) {
        if (bytes1[i] !== bytes2[i]) {
            return false;
        }
    }

    return true;
}

export function getSha256(cidOrBlob: At.Blob | CidLink | Cid) {
    if ('ref' in cidOrBlob) cidOrBlob = fromCidLink(cidOrBlob.ref);
    if ('$link' in cidOrBlob) cidOrBlob = fromCidLink(cidOrBlob);
    return arrayToHex(cidOrBlob.digest.contents);
}

// https://stackoverflow.com/a/39225475
function arrayToHex(arr: Iterable<number> | ArrayLike<number>) {
    return Array.from(arr).map(numberToHex).join('');
}

function numberToHex(i: number) {
    return i.toString(16).padStart(2, '0');
}  

