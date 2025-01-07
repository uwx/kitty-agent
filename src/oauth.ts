import type { At } from '@atcute/client/lexicons';
import { configureOAuth, createAuthorizationUrl, deleteStoredSession, finalizeAuthorization, getSession, listStoredSessions, OAuthUserAgent, resolveFromIdentity, type Session } from '@atcute/oauth-browser-client';
import { KittyAgent } from './index.js';
import { resolveHandleAnonymously } from './handles/resolve.js';
import { getDidAndPds } from './pds-helpers.js';

class OAuthClient {
    private readonly scope: string;

    constructor({ clientId, redirectUri, scope }: {
        clientId: string,
        redirectUri: string,
        scope: string,
    }) {
        configureOAuth({
            metadata: {
                client_id: clientId,
                redirect_uri: redirectUri,
            },
        });
        this.scope = scope;
    }

    async oauthAuthenticate(handle: string) {
        const { identity, metadata } = await resolveFromIdentity(handle);
    
        // passing `identity` is optional,
        // it allows for the login form to be autofilled with the user's handle or DID
        const authUrl = await createAuthorizationUrl({
            metadata,
            identity,
            scope: this.scope,
        });
    
        console.log(authUrl);
    
        // recommended to wait for the browser to persist local storage before proceeding
        await new Promise(resolve => setTimeout(resolve, 200));
    
        // redirect the user to sign in and authorize the app
        document.location.href = authUrl.toString();
    
        // Time out after 100 seconds if the redirect doesn't go through for some reason
        await new Promise(reject => setTimeout(reject, 100000));
    
        throw new Error('Unreachable code');
    }

    async oauthAuthenticateOrRefresh(
        handle: string,
        refreshOnly: boolean,
    ) {
        let session: Session | undefined;
        try {
            session = await getSession(
                await resolveHandleAnonymously(handle),
                { allowStale: false },
            );
        } catch (err) {
            console.warn('Could not refresh session:', err);
        }
    
        console.log('seession', session);
    
        if (refreshOnly && !session) return undefined;
    
        if (!session) {
            await this.oauthAuthenticate(handle); // will not return
            throw new Error('Should never happen');
        }
    
        const oauthAgent = new OAuthUserAgent(session);
    
        return oauthAgent;
    }

    revokeSessions() {
        for (const session of listStoredSessions()) {
            deleteStoredSession(session);
        }
    }
}

export interface LoginState<T> {
    readonly handle: string;
    readonly did: At.DID;
    readonly pds: string;
    readonly agent: KittyAgent;
    readonly client: T;
}

export interface Account {
    handle: string;
    did: At.DID;
    pds: string;
}

export namespace Store {
    /** Callback to inform of a value updates. */
    export type Subscriber<T> = (value: T) => void;

    /** Unsubscribes from value updates. */
    export type Unsubscriber = () => void;

    /** Callback to update a value. */
    export type Updater<T> = (value: T) => T;

    /** Readable interface for subscribing. */
    export interface Readable<T> {
        /**
         * Subscribe on value changes.
         * @param run subscription callback
         * @param invalidate cleanup callback
         */
        subscribe(this: void, run: Subscriber<T>, invalidate?: () => void): Unsubscriber;
    }

    /** Writable interface for both updating and subscribing. */
    export interface Writable<T> extends Readable<T> {
        /**
         * Update value using callback and inform subscribers.
         * @param updater callback
         */
        update(this: void, updater: Updater<T>): void;
    }
    
    /** One or more values from `Readable` stores. */
    export type StoresValues<T> =
        T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };
}

/** Convenience class for readable stores that adds a .get() method. */
class ReadableEx<T, TStore extends Store.Readable<T> = Store.Readable<T>> implements Store.Readable<T> {
    constructor(protected readonly store: TStore) {
        this.subscribe = (run: Store.Subscriber<T>, invalidate?: () => void): Store.Unsubscriber => {
            return store.subscribe(run, invalidate);
        };

        this.get = (): T => {
            let value: T;
            const unsub = store.subscribe(avalue => value = avalue);
            unsub();
            return value!;
        };
    }

    subscribe: (this: void, run: Store.Subscriber<T>, invalidate?: () => void) => Store.Unsubscriber;

    /**
     * Get the current value from a store by subscribing and immediately unsubscribing.
     * Reimplementation of `svelte/store` `get()`.
     */
    get: (this: void) => T;
}

/** Convenience class for writable stores that adds a .get() method. */
class WritableEx<T> extends ReadableEx<T, Store.Writable<T>> implements Store.Writable<T> {
    constructor(store: Store.Writable<T>) {
        super(store);

        this.update = (updater: Store.Updater<T>): void => {
            return this.store.update(updater);
        };

        this.set = (value: T): void => {
            return this.store.update(() => value);
        };
    }

    update: (this: void, updater: Store.Updater<T>) => void;
    
    /**
     * Set value and inform subscribers.
     * @param value to set
     */
    set: (this: void, value: T) => void;
}

class LoginStateImpl<T> implements LoginState<T> {
    constructor(
        private readonly account: Account,
        readonly agent: KittyAgent,
        readonly client: T,
    ) {}

    get handle(): string { return this.account.handle; }
    get did(): At.DID { return this.account.did; }
    get pds(): string { return this.account.pds; }
}

export class StatefulOAuthClient<TClient> extends OAuthClient {
    private _account: WritableEx<Account | undefined>;
    private _agent: WritableEx<KittyAgent | undefined>;
    private _client: WritableEx<TClient | undefined>;

    get account(): ReadableEx<Account | undefined> { return this._account; }
    readonly user: ReadableEx<LoginState<TClient> | undefined>;
    readonly handle: ReadableEx<string | undefined>;
    readonly did: ReadableEx<At.DID | undefined>;
    readonly pds: ReadableEx<string | undefined>;

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        private readonly createWritableStore: <T>(value: T) => Store.Writable<T>,
        private readonly createDerivedStore: <T, S extends Store.Readable<any>[]>(stores: S, callback: (values: Store.StoresValues<S>) => T) => Store.Readable<T>,
        private readonly createClient: (loginState: {
            readonly handle: string;
            readonly did: At.DID;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options);

        // TODO computations created outside a `createRoot` or `render` will never be disposed
        // use createContext/useContext?
        this._account = this.useLocalStorage<Account | undefined>('user', undefined, {
            deserializer(raw) { return raw === 'null' ? undefined : JSON.parse(raw); },
            serializer(value) { return value === undefined ? 'null' : JSON.stringify(value); },
        });

        this._agent = this.writable<KittyAgent | undefined>(undefined);
        this._client = this.writable<TClient | undefined>(undefined);

        this.user = this.derived([this._account, this._agent, this._client] as const, ([account, agent, client]) => {
            return account && agent && client ? new LoginStateImpl(account, agent, client) : undefined;
        });
        this.handle = this.derived([this._account], ([account]) => account?.handle);
        this.did = this.derived([this._account], ([account]) => account?.did);
        this.pds = this.derived([this._account], ([account]) => account?.pds);
    }

    private useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }): WritableEx<T> {
        let value = this.writable(initialValue);
        if (key in localStorage) {
            value.set(options.deserializer(localStorage[key]));
        }
    
        value.subscribe(newValue => {
            localStorage[key] = options.serializer(newValue);
        });
    
        return value;
    }
    
    private writable<T>(initialValue: T) {
        return new WritableEx(this.createWritableStore(initialValue));
    }

    private derived<T, S extends Store.Readable<any>[]>(stores: S, callback: (values: Store.StoresValues<S>) => T): ReadableEx<T> {
        return new ReadableEx(this.createDerivedStore(stores, callback));
    }

    async authenticateIfNecessary(
        handle: string,
        refreshOnly: boolean,
    ) {
        const account = this._account.get();

        if (this.user.get() && account && account.handle === handle) {
            return true;
        }

        const { did, pds } = await getDidAndPds(handle);
        this._account.set({ did, pds, handle });

        console.log(`set account: ${this._account.get()}`)

        const oauthAgent = await this.oauthAuthenticateOrRefresh(handle, refreshOnly);
        if (oauthAgent === undefined) return false;

        const agent = new KittyAgent({ handler: oauthAgent });
        this._agent.set(agent);
        this._client.set(this.createClient({ did, pds, handle, agent }));

        return true;
    }
    
    initialSessionPromise: Promise<void> | undefined;
    async waitForInitialSession() {
        if (!this.initialSessionPromise) {
            this.initialSessionPromise = (async () => {
                const account = this._account.get();

                if (account) { // automatically sign in if possible
                    const result = await this.authenticateIfNecessary(account.handle, true);
                    console.log(`early authentication complete: ${result}`);
                }
            })();
        }
    
        await this.initialSessionPromise;
    }

    revokeSessions() {
        super.revokeSessions();
        this._account.set(undefined);
    }
}

function isTokenUsable({ token }: Session): boolean {
    const expires = token.expires_at;
    return expires == null || Date.now() + 60_000 <= expires;
}
