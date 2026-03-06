import { simpleFetchHandler } from "@atcute/client";import { KittyAgent } from "./agent.js";
import type { ActorIdentifier, Did, Nsid, RecordKey, ResourceUri } from "@atcute/lexicons";
import type { Records } from "@atcute/lexicons/ambient";
import type { UriString } from "@atproto/syntax";

export class ConstellationClient extends KittyAgent {
    constructor({ userAgent, service }: { userAgent: string; service?: string }) {
        super({
            handler: simpleFetchHandler({
                service: service ?? 'https://constellation.microcosm.blue',
                fetch(input, init) {
                    return fetch(input, {
                        ...init,
                        headers: {
                            ...init?.headers,
                            'User-Agent': userAgent,
                        },
                    });
                },
            })
        })
    }

    async getBacklinks({
        subject,
        source,
        did,
        limit,
        reverse,
        cursor
    }: {
        subject: `at://${ActorIdentifier}/${Nsid}/${RecordKey}` | Did | UriString,
        source: `${(keyof Records) & Nsid}:${string}`,
        did?: Did[],
        limit?: number,
        reverse?: boolean,
        cursor?: string
    }) {
        return await this.getSafe('blue.microcosm.links.getBacklinks', {
            as: 'json',
            params: {
                subject: subject as UriString,
                source,
                did,
                limit,
                reverse,
                cursor
            }
        });
    }

    getAllBacklinks({
        subject,
        source,
        did,
        limit,
        reverse
    }: {
        subject: `at://${ActorIdentifier}/${Nsid}/${RecordKey}` | Did | UriString,
        source: `${(keyof Records) & Nsid}:${string}`,
        did?: Did[],
        limit?: number,
        reverse?: boolean
    }) {
        return this.paginationHelper(
            limit,
            'records',
            async (cursor, limit) => {
                return await this.getBacklinks({
                    subject,
                    source,
                    did,
                    limit,
                    reverse,
                    cursor
                });
            }
        );
    }
}