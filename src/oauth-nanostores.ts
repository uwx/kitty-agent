import type { At } from "@atcute/client/lexicons";
import type { KittyAgent } from "./agent.js";
import { OAuthClient } from "./oauth.js";
import { getDidAndPds } from "./pds-helpers.js";
import { BaseStatefulOAuthClient, LoginStateImpl, type Account, type LoginState } from "./oauth-stateful-base.js";
import type { XRPC } from "@atcute/client";

export namespace Nanostores {
    export namespace Atom {
        export type AllKeys<T> = T extends any ? keyof T : never;

        type Primitive = boolean | number | string;

        export type ReadonlyIfObject<Value> = Value extends undefined
            ? Value
            : Value extends (...args: any) => any
            ? Value
            : Value extends Primitive
            ? Value
            : Value extends object
            ? Readonly<Value>
            : Value;

        /**
         * Store object.
         */
        export interface ReadableAtom<Value = any> {
            /**
             * Get store value.
             *
             * In contrast with {@link ReadableAtom#value} this value will be always
             * initialized even if store had no listeners.
             *
             * ```js
             * $store.get()
             * ```
             *
             * @returns Store value.
             */
            get(): Value;

            /**
             * Listeners count.
             */
            readonly lc: number;

            /**
             * Subscribe to store changes.
             *
             * In contrast with {@link Store#subscribe} it do not call listener
             * immediately.
             *
             * @param listener Callback with store value and old value.
             * @returns Function to remove listener.
             */
            listen(listener: (value: ReadonlyIfObject<Value>, oldValue: ReadonlyIfObject<Value>) => void): () => void;

            /**
             * Low-level method to notify listeners about changes in the store.
             *
             * Can cause unexpected behaviour when combined with frontend frameworks
             * that perform equality checks for values, such as React.
             */
            notify(oldValue?: ReadonlyIfObject<Value>): void;

            /**
             * Unbind all listeners.
             */
            off(): void;

            /**
             * Subscribe to store changes and call listener immediately.
             *
             * ```
             * import { $router } from '../store'
             *
             * $router.subscribe(page => {
             *   console.log(page)
             * })
             * ```
             *
             * @param listener Callback with store value and old value.
             * @returns Function to remove listener.
             */
            subscribe(listener: (value: ReadonlyIfObject<Value>, oldValue?: ReadonlyIfObject<Value>) => void): () => void;

            /**
             * Low-level method to read store’s value without calling `onStart`.
             *
             * Try to use only {@link ReadableAtom#get}.
             * Without subscribers, value can be undefined.
             */
            readonly value: undefined | Value;
        }

        /**
         * Store with a way to manually change the value.
         */
        export interface WritableAtom<Value = any> extends ReadableAtom<Value> {
            /**
             * Change store value.
             *
             * ```js
             * $router.set({ path: location.pathname, page: parse(location.pathname) })
             * ```
             *
             * @param newValue New store value.
             */
            set(newValue: Value): void;
        }

        // biome-ignore lint/complexity/noUselessTypeConstraint: imported code
        export interface PreinitializedWritableAtom<Value extends any> extends WritableAtom<Value> {
            readonly value: Value;
        }

        export type Atom<Value = any> = ReadableAtom<Value> | WritableAtom<Value>;

        export declare let notifyId: number;
        /**
         * Create store with atomic value. It could be a string or an object, which you
         * will replace completely.
         *
         * If you want to change keys in the object inside store, use {@link map}.
         *
         * ```js
         * import { atom, onMount } from 'nanostores'
         *
         * // Initial value
         * export const $router = atom({ path: '', page: 'home' })
         *
         * function parse () {
         *   $router.set({ path: location.pathname, page: parse(location.pathname) })
         * }
         *
         * // Listen for URL changes on first store’s listener.
         * onMount($router, () => {
         *   parse()
         *   window.addEventListener('popstate', parse)
         *   return () => {
         *     window.removeEventListener('popstate', parse)
         *   }
         * })
         * ```
         *
         * @param initialValue Initial value of the store.
         * @returns The store object with methods to subscribe.
         */
        
        // biome-ignore lint/complexity/noBannedTypes: imported code
        export type atom = <Value, StoreExt = {}>(
            ...args: undefined extends Value ? [] | [Value] : [Value]
        ) => PreinitializedWritableAtom<Value> & StoreExt;
    }

    export namespace Map {
        type AllKeys<T> = Nanostores.Atom.AllKeys<T>;
        type ReadableAtom<Value = any> = Nanostores.Atom.ReadableAtom<Value>;
        type ReadonlyIfObject<Value> = Nanostores.Atom.ReadonlyIfObject<Value>;
        type WritableAtom<Value = any> = Nanostores.Atom.WritableAtom<Value>;

        type KeyofBase = keyof any

        type Get<T, K extends KeyofBase> = Extract<T, { [K1 in K]: any }>[K]

        export type WritableStore<Value = any> =
            | (Value extends object ? MapStore<Value> : never)
            | WritableAtom<Value>

        export type Store<Value = any> = ReadableAtom<Value> | WritableStore<Value>

        export type AnyStore<Value = any> = {
            get(): Value
            readonly value: undefined | Value
        }

        export type StoreValue<SomeStore> = SomeStore extends {
            get(): infer Value
        }
            ? Value
            : any

        export type BaseMapStore<Value = any> = {
            setKey: (key: any, value: any) => any
        } & WritableAtom<Value>

        export type MapStoreKeys<SomeStore> = SomeStore extends {
            setKey: (key: infer K, ...args: any[]) => any
        }
            ? K
            : AllKeys<StoreValue<SomeStore>>

        export interface MapStore<Value extends object = any>
            extends WritableAtom<Value> {
            /**
             * Subscribe to store changes.
             *
             * In contrast with {@link Store#subscribe} it do not call listener
             * immediately.
             *
             * @param listener Callback with store value and old value.
             * @param changedKey Key that was changed. Will present only if `setKey`
             *                   has been used to change a store.
             * @returns Function to remove listener.
             */
            listen(
                listener: (
                    value: ReadonlyIfObject<Value>,
                    oldValue: ReadonlyIfObject<Value>,
                    changedKey: AllKeys<Value>
                ) => void
            ): () => void

            /**
             * Low-level method to notify listeners about changes in the store.
             *
             * Can cause unexpected behaviour when combined with frontend frameworks
             * that perform equality checks for values, such as React.
             */
            notify(oldValue?: ReadonlyIfObject<Value>, changedKey?: AllKeys<Value>): void

            /**
             * Change store value.
             *
             * ```js
             * $settings.set({ theme: 'dark' })
             * ```
             *
             * Operation is atomic, subscribers will be notified once with the new value.
             * `changedKey` will be undefined
             *
             * @param newValue New store value.
             */
            set(newValue: Value): void

            /**
             * Change key in store value.
             *
             * ```js
             * $settings.setKey('theme', 'dark')
             * ```
             *
             * To delete key set `undefined`.
             *
             * ```js
             * $settings.setKey('theme', undefined)
             * ```
             *
             * @param key The key name.
             * @param value New value.
             */
            setKey<Key extends AllKeys<Value>>(
                key: Key,
                value: Get<Value, Key> | Value[Key]
            ): void

            /**
             * Subscribe to store changes and call listener immediately.
             *
             * ```
             * import { $router } from '../store'
             *
             * $router.subscribe(page => {
             *   console.log(page)
             * })
             * ```
             *
             * @param listener Callback with store value and old value.
             * @param changedKey Key that was changed. Will present only
             *                   if `setKey` has been used to change a store.
             * @returns Function to remove listener.
             */
            subscribe(
                listener: (
                    value: ReadonlyIfObject<Value>,
                    oldValue: ReadonlyIfObject<Value> | undefined,
                    changedKey: AllKeys<Value> | undefined
                ) => void
            ): () => void
        }

        export interface PreinitializedMapStore<Value extends object = any>
            extends MapStore<Value> {
            readonly value: Value
        }

        /**
         * Create map store. Map store is a store with key-value object
         * as a store value.
         *
         * @param init Initialize store and return store destructor.
         * @returns The store object with methods to subscribe.
         */
        
        // biome-ignore lint/complexity/noBannedTypes: imported code
        export type map = <Value extends object, StoreExt extends object = {}>(
            value?: Value
        ) => PreinitializedMapStore<Value> & StoreExt;
    }

    export namespace Task {
        export interface Task<Value> extends Promise<Value> {
            t: true
        }
    }

    export namespace Computed {
        type ReadableAtom<Value = any> = Nanostores.Atom.ReadableAtom<Value>;

        type AnyStore<Value = any> = Nanostores.Map.AnyStore<Value>;
        type Store<Value = any> = Nanostores.Map.Store<Value>;
        type StoreValue<SomeStore> = Nanostores.Map.StoreValue<SomeStore>;

        type Task<Value> = Nanostores.Task.Task<Value>;

        export type StoreValues<Stores extends AnyStore[]> = {
            [Index in keyof Stores]: StoreValue<Stores[Index]>
        }

        type A = ReadableAtom<number>
        type B = ReadableAtom<string>

        type C = (...values: StoreValues<[A, B]>) => void

        export interface computed {
            // biome-ignore lint/complexity/noUselessTypeConstraint: imported code
            <Value extends any, OriginStore extends Store>(
                stores: OriginStore,
                cb: (value: StoreValue<OriginStore>) => Task<Value>
            ): ReadableAtom<undefined | Value>
            // biome-ignore lint/complexity/noUselessTypeConstraint: imported code
            <Value extends any, OriginStores extends AnyStore[]>(
                stores: [...OriginStores],
                cb: (...values: StoreValues<OriginStores>) => Task<Value>
            ): ReadableAtom<undefined | Value>
            // biome-ignore lint/complexity/noUselessTypeConstraint: imported code
            <Value extends any, OriginStore extends Store>(
                stores: OriginStore,
                cb: (value: StoreValue<OriginStore>) => Value
            ): ReadableAtom<Value>
            /**
             * Create derived store, which use generates value from another stores.
             *
             * ```js
             * import { computed } from 'nanostores'
             *
             * import { $users } from './users.js'
             *
             * export const $admins = computed($users, users => {
             *   return users.filter(user => user.isAdmin)
             * })
             * ```
             *
             * An async function can be evaluated by using {@link task}.
             *
             * ```js
             * import { computed, task } from 'nanostores'
             *
             * import { $userId } from './users.js'
             *
             * export const $user = computed($userId, userId => task(async () => {
             *   const response = await fetch(`https://my-api/users/${userId}`)
             *   return response.json()
             * }))
             * ```
             */
            // biome-ignore lint/complexity/noUselessTypeConstraint: imported code
            <Value extends any, OriginStores extends AnyStore[]>(
                stores: [...OriginStores],
                cb: (...values: StoreValues<OriginStores>) => Task<Value> | Value
            ): ReadableAtom<Value>
        }

    }
}

export class StatefulSvelteOAuthClient<TClient> extends BaseStatefulOAuthClient<TClient> {
    private _account: Nanostores.Atom.WritableAtom<Account | undefined>;
    private _agent: Nanostores.Atom.WritableAtom<KittyAgent | undefined>;
    private _client: Nanostores.Atom.WritableAtom<TClient | undefined>;

    get account(): Nanostores.Atom.ReadableAtom<Account | undefined> { return this._account; }
    readonly user: Nanostores.Atom.ReadableAtom<LoginState<TClient> | undefined>;
    readonly handle: Nanostores.Atom.ReadableAtom<string | undefined>;
    readonly did: Nanostores.Atom.ReadableAtom<At.DID | undefined>;
    readonly pds: Nanostores.Atom.ReadableAtom<string | undefined>;

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
        nanostores: {
            atom: Nanostores.Atom.atom,
            computed: Nanostores.Computed.computed,
        },
        createClient: (loginState: {
            readonly handle: string;
            readonly did: At.DID;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options, createClient);

        function useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }): Nanostores.Atom.WritableAtom<T> {
            const value = nanostores.atom(initialValue);
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

        this._agent = nanostores.atom<KittyAgent | undefined>(undefined);
        this._client = nanostores.atom<TClient | undefined>(undefined);

        this.user = nanostores.computed([this._account, this._agent, this._client] as const, (account, agent, client) => {
            return account && agent && client ? new LoginStateImpl(account, agent, client) : undefined;
        });
        this.handle = nanostores.computed([this._account], (account) => account?.handle);
        this.did = nanostores.computed([this._account], (account) => account?.did);
        this.pds = nanostores.computed([this._account], (account) => account?.pds);
    }
}
