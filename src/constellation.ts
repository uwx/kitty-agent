import { simpleFetchHandler } from "@atcute/client";import { KittyAgent } from "./agent.js";
import type { ActorIdentifier, Did, Nsid, RecordKey, ResourceUri } from "@atcute/lexicons";
import type { Records } from "@atcute/lexicons/ambient";
import type { UriString } from "@atproto/syntax";

export class ConstellationClient extends KittyAgent {
    // Idk why the original paginationHelper is so complicated; it should eventually be replaced with this.
    protected async paginationHelperSimple<
        K extends string,
        T extends { cursor?: string | undefined } & { [k in K]: U[] },
        U
    >(
        limit: number | undefined,
        key: K,
        query: (cursor: string | undefined, limit: number) => Promise<T>
    ): Promise<{ [k in K]: U[]; } & { cursor: string | undefined; }> {
        const PER_PAGE = 100;

        const results: U[] = [];

        let cursor: string | undefined = undefined;
        do {
            const data = await query(
                cursor,
                limit === undefined
                    ? PER_PAGE
                    : limit / PER_PAGE > 1
                        ? PER_PAGE
                        : limit);

            const theseResults = data[key];

            if (limit !== undefined) {
                limit -= theseResults.length;
            }

            results.push(...theseResults);

            cursor = data.cursor;
        } while (cursor);

        return { [key]: results, cursor } as { [k in K]: U[]; } & { cursor: string | undefined; };
    }

    constructor({ userAgent }: { userAgent: string }) {
        super({
            handler: simpleFetchHandler({
                service: 'https://constellation.microcosm.blue',
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

    async getAllBacklinks({
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
        return await this.paginationHelperSimple(
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