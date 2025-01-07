import type { At } from "@atcute/client/lexicons";
import type { KittyAgent } from "./agent.js";
import { OAuthClient } from "./oauth.js";
import { getDidAndPds } from "./pds-helpers.js";
import { BaseStatefulOAuthClient, LoginStateImpl, type Account, type LoginState } from "./oauth-stateful-base.js";
import type { XRPC } from "@atcute/client";

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

        /**
         * Get the current value from a store.
         */
        get?: (this: void) => T;
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
            if ('get' in store && store.get) {
                return store.get();
            }

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

class SvelteAccessor {
    constructor(
        private readonly createWritableStore: <T>(value: T) => Store.Writable<T>,
        private readonly createDerivedStore: <T, S extends Store.Readable<any>[]>(stores: S, callback: (values: Store.StoresValues<S>) => T) => Store.Readable<T>,
    ) {}
    
    writable<T>(initialValue: T) {
        return new WritableEx(this.createWritableStore(initialValue));
    }

    derived<T, S extends Store.Readable<any>[]>(stores: S, callback: (values: Store.StoresValues<S>) => T): ReadableEx<T> {
        return new ReadableEx(this.createDerivedStore(stores, callback));
    }
}

export class StatefulSvelteOAuthClient<TClient> extends BaseStatefulOAuthClient<TClient> {
    private _account: WritableEx<Account | undefined>;
    private _agent: WritableEx<KittyAgent | undefined>;
    private _client: WritableEx<TClient | undefined>;

    get account(): ReadableEx<Account | undefined> { return this._account; }
    readonly user: ReadableEx<LoginState<TClient> | undefined>;
    readonly handle: ReadableEx<string | undefined>;
    readonly did: ReadableEx<At.DID | undefined>;
    readonly pds: ReadableEx<string | undefined>;
    
    protected get internal_account(): Account | undefined { return this._account.get(); }
    protected get internal_user(): LoginState<TClient> | undefined { return this.user.get(); }
    protected get internal_agent(): KittyAgent<XRPC> | undefined { return this._agent.get(); }
    protected get internal_client(): TClient | undefined { return this._client.get(); }
    protected set internal_account(value: Account | undefined) { this._account.set(value); }
    protected set internal_agent(value: KittyAgent<XRPC> | undefined) { this._agent.set(value); }
    protected set internal_client(value: TClient | undefined) { this._client.set(value); }

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        svelte: {
            createWritableStore: <T>(value: T) => Store.Writable<T>,
            createDerivedStore: <T, S extends Store.Readable<any>[]>(stores: S, callback: (values: Store.StoresValues<S>) => T) => Store.Readable<T>,
        },
        createClient: (loginState: {
            readonly handle: string;
            readonly did: At.DID;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options, createClient);

        const svelteAccessor = new SvelteAccessor(svelte.createWritableStore, svelte.createDerivedStore);

        function useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }): WritableEx<T> {
            const value = svelteAccessor.writable(initialValue);
            if (key in localStorage) {
                value.set(options.deserializer(localStorage[key]));
            }
        
            value.subscribe(newValue => {
                localStorage[key] = options.serializer(newValue);
            });
        
            return value;
        }
        
        this._account = useLocalStorage<Account | undefined>('user', undefined, {
            deserializer(raw) { return raw === 'null' ? undefined : JSON.parse(raw); },
            serializer(value) { return value === undefined ? 'null' : JSON.stringify(value); },
        });

        this._agent = svelteAccessor.writable<KittyAgent | undefined>(undefined);
        this._client = svelteAccessor.writable<TClient | undefined>(undefined);

        this.user = svelteAccessor.derived([this._account, this._agent, this._client] as const, ([account, agent, client]) => {
            return account && agent && client ? new LoginStateImpl(account, agent, client) : undefined;
        });
        this.handle = svelteAccessor.derived([this._account], ([account]) => account?.handle);
        this.did = svelteAccessor.derived([this._account], ([account]) => account?.did);
        this.pds = svelteAccessor.derived([this._account], ([account]) => account?.pds);
    }
}
