import { parseResourceUri, type ResourceUri } from '@atcute/lexicons';

export function rkey(uri: ResourceUri | { uri: ResourceUri }) {
    if (typeof uri !== 'string') uri = uri.uri;
    const result = parseResourceUri(uri);
    if (!result.ok) throw new Error(`Invalid resource URI: ${uri}`);
    return result.value.rkey;
}
