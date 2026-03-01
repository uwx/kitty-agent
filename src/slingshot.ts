import { simpleFetchHandler } from "@atcute/client";
import { KittyAgent } from "./agent.js";

export class SlingshotClient extends KittyAgent {
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
                service: 'https://slingshot.microcosm.blue',
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
        });
    }
}