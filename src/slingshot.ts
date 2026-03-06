import { simpleFetchHandler } from "@atcute/client";
import { KittyAgent } from "./agent.js";

export class SlingshotClient extends KittyAgent {
    constructor({ service, userAgent }: { service?: string; userAgent: string }) {
        super({
            handler: simpleFetchHandler({
                service: service ?? 'https://slingshot.microcosm.blue',
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