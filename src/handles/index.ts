import type { Did } from "@atcute/lexicons";

export const isDid = (did: string): did is Did => {
	return /^did:([a-z]+):([a-zA-Z0-9._:%-]*[a-zA-Z0-9._-])$/.test(did);
};
