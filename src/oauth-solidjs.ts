import type { XRPC } from "@atcute/client";
import type { At } from "@atcute/client/lexicons";
import type { KittyAgent } from "./agent.js";
import { BaseStatefulOAuthClient, type Account, type LoginState, LoginStateImpl } from "./oauth-stateful-base.js";
import type { Store } from "./oauth-svelte.js";

namespace Signals {
    export type OnEffectFunction<S, Prev, Next extends Prev = Prev> = (
      input: S,
      prevInput: S | undefined,
      prev: Prev
    ) => Next;
    export type EffectFunction<Prev, Next extends Prev = Prev> = (v: Prev) => Next;
    export interface OnOptions {
      defer?: boolean;
    }
    export interface BaseOptions {
      name?: string;
    }
    export interface EffectOptions extends BaseOptions {}
    export interface MemoOptions<T> extends EffectOptions {
      equals?: false | ((prev: T, next: T) => boolean);
    }
    export type Accessor<T> = () => T;
    export type Setter<in out T> = {
    <U extends T>(
        ...args: undefined extends T ? [] : [value: Exclude<U, Function> | ((prev: T) => U)]
    ): undefined extends T ? undefined : U;
    <U extends T>(value: (prev: T) => U): U;
    <U extends T>(value: Exclude<U, Function>): U;
    <U extends T>(value: Exclude<U, Function> | ((prev: T) => U)): U;
    };
    export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
    export interface SignalOptions<T> extends MemoOptions<T> {
    internal?: boolean;
    }

    export type ReturnTypes<T> = T extends readonly Accessor<unknown>[]
      ? {
          [K in keyof T]: T[K] extends Accessor<infer I> ? I : never;
        }
      : T extends Accessor<infer I>
      ? I
      : never;
    export type AccessorArray<T> = [
      ...Extract<
        {
          [K in keyof T]: Accessor<T[K]>;
        },
        readonly unknown[]
      >
    ];

    export declare function on<S, Next extends Prev, Prev = Next>(
        deps: AccessorArray<S> | Accessor<S>,
        fn: OnEffectFunction<S, undefined | NoInfer<Prev>, Next>,
        options?: OnOptions & {
          defer?: false;
        }
      ): EffectFunction<undefined | NoInfer<Next>, NoInfer<Next>>;      
}

// biome-ignore lint/suspicious/noConstEnum: This enum is never exported
const enum SignalAccess { Read = 0, Write = 1 }

export class StatefulSolidOAuthClient<TClient> extends BaseStatefulOAuthClient<TClient> {
    private _account: Signals.Signal<Account | undefined>;
    private _agent: Signals.Signal<KittyAgent | undefined>;
    private _client: Signals.Signal<TClient | undefined>;

    get account(): Signals.Accessor<Account | undefined> { return this._account[SignalAccess.Read]; }
    readonly user: Signals.Accessor<LoginState<TClient> | undefined>;
    readonly handle: Signals.Accessor<string | undefined>;
    readonly did: Signals.Accessor<At.DID | undefined>;
    readonly pds: Signals.Accessor<string | undefined>;

    protected get internal_account(): Account | undefined { return this._account[SignalAccess.Read](); }
    protected get internal_user(): LoginState<TClient> | undefined { return this.user(); }
    protected get internal_agent(): KittyAgent<XRPC> | undefined { return this._agent[SignalAccess.Read](); }
    protected get internal_client(): TClient | undefined { return this._client[SignalAccess.Read](); }
    protected set internal_account(value: Account | undefined) { this._account[SignalAccess.Write](() => value); }
    protected set internal_agent(value: KittyAgent<XRPC> | undefined) { this._agent[SignalAccess.Write](() => value); }
    protected set internal_client(value: TClient | undefined) { this._client[SignalAccess.Write](() => value); }

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        { createSignal, createMemo, createEffect, on }: {
            createSignal<T>(value: T): Signals.Signal<T>,
            createMemo<Next extends Prev, Prev = Next>(
                fn: Signals.EffectFunction<undefined | NoInfer<Prev>, Next>
            ): Signals.Accessor<Next>,
            createEffect<Next>(
                fn: Signals.EffectFunction<undefined | NoInfer<Next>, Next>
            ): void,
            on<S, Next extends Prev, Prev = Next>(
                deps: Signals.AccessorArray<S> | Signals.Accessor<S>,
                fn: Signals.OnEffectFunction<S, undefined | NoInfer<Prev>, Next>,
            ): Signals.EffectFunction<undefined | NoInfer<Next>, NoInfer<Next>>,
        },
        createClient: (loginState: {
            readonly handle: string;
            readonly did: At.DID;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options, createClient);

        function useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }) {
            const [get, set] = createSignal(initialValue);
            if (key in localStorage) {
                set(options.deserializer(localStorage[key]));
            }

            createEffect(on(get, newValue => {
                localStorage[key] = options.serializer(newValue);
            }));

            return [get, set] as Signals.Signal<T>;
        }
        
        this._account = useLocalStorage<Account | undefined>('user', undefined, {
            deserializer(raw) { return raw === 'null' ? undefined : JSON.parse(raw); },
            serializer(value) { return value === undefined ? 'null' : JSON.stringify(value); },
        });

        this._agent = createSignal<KittyAgent | undefined>(undefined);
        this._client = createSignal<TClient | undefined>(undefined);

        this.user = createMemo(on([
            this._account[SignalAccess.Read],
            this._agent[SignalAccess.Read],
            this._client[SignalAccess.Read]
        ] as const, ([account, agent, client]) => {
            return account && agent && client ? new LoginStateImpl(account, agent, client) : undefined;
        }));

        this.handle = createMemo(on(this._account[SignalAccess.Read], account => account?.handle));
        this.did = createMemo(on(this._account[SignalAccess.Read], account => account?.did));
        this.pds = createMemo(on(this._account[SignalAccess.Read], account => account?.pds));
    }
}
