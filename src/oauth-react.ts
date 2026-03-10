import type { Did } from "@atcute/lexicons";
import type { KittyAgent } from "./agent.js";
import { BaseStatefulOAuthClient, LoginStateImpl, type Account, type LoginState } from "./oauth-stateful-base.js";

type UseSyncExternalStore = <Snapshot>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot,
    getServerSnapshot?: () => Snapshot,
) => Snapshot;

type SignalValues<Args extends readonly Signal<any>[]> = {
    [K in keyof Args]: Args[K] extends Signal<infer T> ? T : never;
};

class Signal<T> {
    private readonly listeners = new Set<(value: T) => void>();

    constructor(
        private _value: T,
        private readonly useSyncExternalStore: UseSyncExternalStore,
    ) {
    }

    subscribe(fn: (value: T) => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    set(value: T): void {
        this._value = value;
        for (const listener of this.listeners) {
            listener(value);
        }
    }

    get value(): T {
        return this._value;
    }

    useSignal(): T {
        const subscribe = (callback: () => void) => {
            this.listeners.add(callback);
            return () => this.listeners.delete(callback);
        };
        const getSnapshot = () => this._value;
        return this.useSyncExternalStore(subscribe, getSnapshot);
    }
    
    static computed<Args extends readonly Signal<any>[], T>(computeFn: (...args: SignalValues<Args>) => T, dependencies: Args): Signal<T> {
        const useSyncExternalStore = dependencies[0].useSyncExternalStore;
        const computedSignal = new Signal<T>(computeFn(...dependencies.map(dep => dep.value) as SignalValues<Args>), useSyncExternalStore);

        for (const dep of dependencies) {
            dep.subscribe(() => {
                computedSignal.set(computeFn(...dependencies.map(dep => dep.value) as SignalValues<Args>));
            });
        }

        return computedSignal;
    }
}

export function useAccount<TClient>(client: StatefulPreactOAuthClient<TClient>): Account | undefined {
    return client.account.useSignal();
}

export function useUser<TClient>(client: StatefulPreactOAuthClient<TClient>): LoginState<TClient> | undefined {
    return client.user.useSignal();
}

export function useHandle<TClient>(client: StatefulPreactOAuthClient<TClient>): string | undefined {
    return client.handle.useSignal();
}

export function useDid<TClient>(client: StatefulPreactOAuthClient<TClient>): Did | undefined {
    return client.did.useSignal();
}

export function usePds<TClient>(client: StatefulPreactOAuthClient<TClient>): string | undefined {
    return client.pds.useSignal();
}

export class StatefulPreactOAuthClient<TClient> extends BaseStatefulOAuthClient<TClient> {
    private _account: Signal<Account | undefined>;
    private _agent: Signal<KittyAgent | undefined>;
    private _client: Signal<TClient | undefined>;

    get account(): Signal<Account | undefined> { return this._account; }
    readonly user: Signal<LoginState<TClient> | undefined>;
    readonly handle: Signal<string | undefined>;
    readonly did: Signal<Did | undefined>;
    readonly pds: Signal<string | undefined>;

    protected get internal_account(): Account | undefined { return this._account.value; }
    protected get internal_user(): LoginState<TClient> | undefined { return this.user.value; }
    protected get internal_agent(): KittyAgent | undefined { return this._agent.value; }
    protected get internal_client(): TClient | undefined { return this._client.value; }
    protected set internal_account(value: Account | undefined) { this._account.set(value); }
    protected set internal_agent(value: KittyAgent | undefined) { this._agent.set(value); }
    protected set internal_client(value: TClient | undefined) { this._client.set(value); }

    constructor(
        options: {
            clientId: string,
            redirectUri: string,
            scope: string,
        },
        useSyncExternalStore: UseSyncExternalStore,
        createClient: (loginState: {
            readonly handle: string;
            readonly did: Did;
            readonly pds: string;
            readonly agent: KittyAgent;
        }) => TClient,
    ) {
        super(options, createClient);

        function useLocalStorage<T>(key: string, initialValue: T, options: { deserializer: (raw: any) => any, serializer: (value: any) => any }): Signal<T> {
            const value = new Signal<T>(initialValue, useSyncExternalStore);
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

        this._agent = new Signal<KittyAgent | undefined>(undefined, useSyncExternalStore);
        this._client = new Signal<TClient | undefined>(undefined, useSyncExternalStore);

        this.user = Signal.computed((account, agent, client) => {
            return account && agent && client ? new LoginStateImpl(account, agent, client) as LoginState<TClient> : undefined;
        }, [this._account, this._agent, this._client] as const);
        this.handle = Signal.computed((account) => account?.handle, [
            this._account,
        ] as const);
        this.did = Signal.computed((account) => account?.did, [
            this._account,
        ] as const);
        this.pds = Signal.computed((account) => account?.pds, [
            this._account,
        ] as const);
    }
}
