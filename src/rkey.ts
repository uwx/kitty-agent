import type { At } from '@atcute/client/lexicons';

export function rkey(uri: At.Uri | { uri: At.Uri }) {
    if (typeof uri !== 'string') uri = uri.uri;
    return uri.slice(uri.lastIndexOf('/') + 1);
}
