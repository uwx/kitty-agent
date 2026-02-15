import type { Did } from "@atcute/lexicons";
import { KittyAgent } from "./agent.js";
import { OAuthClient } from "./oauth.js";
import { getDidAndPds } from "./pds-helpers.js";

export interface LoginState<T> {
    readonly handle: string;
    readonly did: Did;
    readonly pds: string;
    readonly agent: KittyAgent;
    readonly client: T;
}

export interface Account {
    handle: string;
    did: Did;
    pds: string;
}

/** @private */
export class LoginStateImpl<T> implements LoginState<T> {
    constructor(
        private readonly account: Account,
        readonly agent: KittyAgent,
        readonly client: T,
    ) {}

    get handle(): string { return this.account.handle; }
    get did(): Did { return this.account.did; }
    get pds(): string { return this.account.pds; }
}

export abstract class BaseStatefulOAuthClient<TClient> extends OAuthClient {
    protected abstract accessor internal_account: Account | undefined;
    protected abstract get internal_user(): LoginState<TClient> | undefined;
    protected abstract accessor internal_agent: KittyAgent | undefined;
    protected abstract accessor internal_client: TClient | undefined;

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        private readonly createClient: (loginState: {
            readonly handle: string;
            readonly did: Did;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options);
    }

    async authenticateIfNecessary(
        handle: string,
        refreshOnly: boolean,
    ) {
        const account = this.internal_account;

        if (this.internal_user && account && account.handle === handle) {
            return true;
        }

        const { did, pds } = await getDidAndPds(handle);
        this.internal_account = { did, pds, handle };

        console.log('set account:', this.internal_account)

        const oauthAgent = await this.oauthAuthenticateOrRefresh(handle, refreshOnly);
        if (oauthAgent === undefined) return false;

        const agent = new KittyAgent({ handler: oauthAgent });
        this.internal_agent = agent;
        this.internal_client = this.createClient({ did, pds, handle, agent });

        return true;
    }

    revokeSessions() {
        super.revokeSessions();
        this.internal_account = undefined;
    }

    private initialSessionPromise: Promise<void> | undefined;
    async waitForInitialSession() {
        if (!this.initialSessionPromise) {
            this.initialSessionPromise = (async () => {
                const account = this.internal_account;

                if (account) { // automatically sign in if possible
                    const result = await this.authenticateIfNecessary(account.handle, true);
                    console.log(`early authentication complete: ${result}`);
                }
            })();
        }

        await this.initialSessionPromise;
    }

}