import type { At } from "@atcute/client/lexicons";
import type { KittyAgent } from "./agent.js";

export class SampleAuthenticatedClient {
    constructor(private readonly loginState: {
        readonly handle: string;
        readonly did: At.DID;
        readonly pds: string;
        readonly agent: KittyAgent;
    }) {}

    protected get agent(): KittyAgent {
        return this.loginState.agent;
    }

    protected get user() {
        return this.loginState;
    }
}