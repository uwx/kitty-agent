import type { Did } from "@atcute/lexicons";
import type { KittyAgent } from "./agent.js";
import { BaseStatefulOAuthClient, LoginStateImpl, type Account, type LoginState } from "./oauth-stateful-base.js";
import type { Client } from "@atcute/client";

namespace PreactSignals {
    export declare const BRAND_SYMBOL: unique symbol;
    export type Node = {
        _source: Signal;
        _prevSource?: Node;
        _nextSource?: Node;
        _target: Computed | Effect;
        _prevTarget?: Node;
        _nextTarget?: Node;
        _version: number;
        _rollbackNode?: Node;
    };
    /**
     * Combine multiple value updates into one "commit" at the end of the provided callback.
     *
     * Batches can be nested and changes are only flushed once the outermost batch callback
     * completes.
     *
     * Accessing a signal that has been modified within a batch will reflect its updated
     * value.
     *
     * @param fn The callback function.
     * @returns The value returned by the callback.
     */
    export declare function batch<T>(fn: () => T): T;
    /**
     * Run a callback function that can access signal values without
     * subscribing to the signal updates.
     *
     * @param fn The callback function.
     * @returns The value returned by the callback.
     */
    export declare function untracked<T>(fn: () => T): T;
    /**
     * The base class for plain and computed signals.
     */
    export declare class Signal<T = any> {
        constructor(value?: T, options?: SignalOptions<T>);
        subscribe(fn: (value: T) => void): () => void;
        name?: string;
        valueOf(): T;
        toString(): string;
        toJSON(): T;
        peek(): T;
        brand: typeof BRAND_SYMBOL;
        get value(): T;
        set value(value: T);
    }
    export interface SignalOptions<T = any> {
        watched?: (this: Signal<T>) => void;
        unwatched?: (this: Signal<T>) => void;
        name?: string;
    }
    /**
     * Create a new plain signal.
     *
     * @param value The initial value for the signal.
     * @returns A new signal.
     */
    export declare function signal<T>(value: T, options?: SignalOptions<T>): Signal<T>;
    export declare function signal<T = undefined>(): Signal<T | undefined>;
    /**
     * The base class for computed signals.
     */
    export declare class Computed<T = any> extends Signal<T> {
        _fn: () => T;
        _sources?: Node;
        _globalVersion: number;
        _flags: number;
        constructor(fn: () => T, options?: SignalOptions<T>);
        _notify(): void;
        get value(): T;
    }
    /**
     * An interface for read-only signals.
     */
    export interface ReadonlySignal<T = any> {
        readonly value: T;
        peek(): T;
        subscribe(fn: (value: T) => void): () => void;
        valueOf(): T;
        toString(): string;
        toJSON(): T;
        brand: typeof BRAND_SYMBOL;
    }
    /**
     * Create a new signal that is computed based on the values of other signals.
     *
     * The returned computed signal is read-only, and its value is automatically
     * updated when any signals accessed from within the callback function change.
     *
     * @param fn The effect callback.
     * @returns A new read-only signal.
     */
    export declare function computed<T>(fn: () => T, options?: SignalOptions<T>): ReadonlySignal<T>;
    export type EffectFn = ((this: {
        dispose: () => void;
    }) => void | (() => void)) | (() => void | (() => void));
    /**
     * The base class for reactive effects.
     */
    export declare class Effect {
        _fn?: EffectFn;
        _cleanup?: () => void;
        _sources?: Node;
        _nextBatchedEffect?: Effect;
        _flags: number;
        _debugCallback?: () => void;
        name?: string;
        constructor(fn: EffectFn, options?: EffectOptions);
        _callback(): void;
        _start(): () => void;
        _notify(): void;
        _dispose(): void;
        dispose(): void;
    }
    export interface EffectOptions {
        name?: string;
    }
    /**
     * Create an effect to run arbitrary code in response to signal changes.
     *
     * An effect tracks which signals are accessed within the given callback
     * function `fn`, and re-runs the callback when those signals change.
     *
     * The callback may return a cleanup function. The cleanup function gets
     * run once, either when the callback is next called or when the effect
     * gets disposed, whichever happens first.
     *
     * @param fn The effect callback.
     * @returns A function for disposing the effect.
     */
    export declare function effect(fn: EffectFn, options?: EffectOptions): () => void;
    export declare function action<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn): (...args: TArgs) => TReturn;
    /** Models should only contain signals, actions, and nested objects containing only signals and actions. */
    export type ValidateModel<TModel> = {
        [Key in keyof TModel]: TModel[Key] extends ReadonlySignal<unknown> ? TModel[Key] : TModel[Key] extends (...args: any[]) => any ? TModel[Key] : TModel[Key] extends object ? ValidateModel<TModel[Key]> : `Property ${Key extends string ? `'${Key}' ` : ""}is not a Signal, Action, or an object that contains only Signals and Actions.`;
    };
    export type Model<TModel> = ValidateModel<TModel> & Disposable;
    export type ModelFactory<TModel, TFactoryArgs extends any[] = []> = (...args: TFactoryArgs) => ValidateModel<TModel>;
    export type ModelConstructor<TModel, TFactoryArgs extends any[] = []> = new (...args: TFactoryArgs) => Model<TModel>;
    export declare function createModel<TModel, TFactoryArgs extends any[] = []>(modelFactory: ModelFactory<TModel, TFactoryArgs>): ModelConstructor<TModel, TFactoryArgs>;
}

export class StatefulPreactOAuthClient<TClient> extends BaseStatefulOAuthClient<TClient> {
    private _account: PreactSignals.Signal<Account | undefined>;
    private _agent: PreactSignals.Signal<KittyAgent | undefined>;
    private _client: PreactSignals.Signal<TClient | undefined>;

    get account(): PreactSignals.ReadonlySignal<Account | undefined> { return this._account; }
    readonly user: PreactSignals.ReadonlySignal<LoginState<TClient> | undefined>;
    readonly handle: PreactSignals.ReadonlySignal<string | undefined>;
    readonly did: PreactSignals.ReadonlySignal<Did | undefined>;
    readonly pds: PreactSignals.ReadonlySignal<string | undefined>;
    protected get internal_account(): Account | undefined { return this._account.value; }
    protected get internal_user(): LoginState<TClient> | undefined { return this.user.value; }
    protected get internal_agent(): KittyAgent | undefined { return this._agent.value; }
    protected get internal_client(): TClient | undefined { return this._client.value; }
    protected set internal_account(value: Account | undefined) { this._account.value = value; }
    protected set internal_agent(value: KittyAgent | undefined) { this._agent.value = value; }
    protected set internal_client(value: TClient | undefined) { this._client.value = value; }

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        preact: {
            signal: typeof PreactSignals.signal,
            computed: typeof PreactSignals.computed,
        },
        createClient: (loginState: {
            readonly handle: string;
            readonly did: Did;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options, createClient);

        function useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }): PreactSignals.Signal<T> {
            const value = preact.signal(initialValue, { name: `localStorage:${key}` });
            if (key in localStorage) {
                value.value = options.deserializer(localStorage[key]);
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

        this._agent = preact.signal<KittyAgent | undefined>(undefined, { name: 'agent' });
        this._client = preact.signal<TClient | undefined>(undefined, { name: 'client' });

        this.user = preact.computed(() => {
            const account = this._account.value;
            const agent = this._agent.value;
            const client = this._client.value;
            return account && agent && client ? new LoginStateImpl(account, agent, client) : undefined;
        }, {
            name: 'user',
        });
        this.handle = preact.computed(() => this._account.value?.handle, {
            name: 'handle',
        });
        this.did = preact.computed(() => this._account.value?.did, {
            name: 'did',
        });
        this.pds = preact.computed(() => this._account.value?.pds, {
            name: 'pds',
        });
    }
}
