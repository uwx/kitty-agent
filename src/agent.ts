/* eslint-disable @typescript-eslint/no-empty-object-type */

import { CredentialManager, simpleFetchHandler, Client, type ClientOptions, type CallRequestOptions, type ClientResponse, type ProcedureRequestOptions, type QueryRequestOptions, type SuccessClientResponse } from "@atcute/client";
import { AtUri } from "@atproto/syntax";
import { getDidAndPds } from "./pds-helpers.js";
import { resolveHandleAnonymously } from "./handles/resolve.js";
import type { Records, XRPCProcedures, XRPCQueries } from "@atcute/lexicons/ambient";
import type { XRPCQueryMetadata, XRPCProcedureMetadata } from "@atcute/lexicons/validations";
import type { HasRequiredKeys, Namespaced } from "./type-helpers.js";
import type { ComAtprotoRepoApplyWrites, ComAtprotoRepoCreateRecord, ComAtprotoRepoDeleteRecord, ComAtprotoRepoGetRecord, ComAtprotoRepoListRecords, ComAtprotoRepoPutRecord, ComAtprotoSyncGetBlob } from '@atcute/atproto';
import type { ActorIdentifier, Blob, CanonicalResourceUri, Cid, Did, ResourceUri } from "@atcute/lexicons";
import * as v from '@atcute/lexicons/validations';

interface GetRecordParams<K extends keyof Records> extends ComAtprotoRepoGetRecord.$params { collection: K; }
interface ListRecordsParams<K extends keyof Records> extends ComAtprotoRepoListRecords.$params { collection: K; }
interface PutRecordInput<K extends keyof Records> extends ComAtprotoRepoPutRecord.$input { collection: K; record: v.InferInput<Records[K]>; }
interface CreateRecordInput<K extends keyof Records> extends ComAtprotoRepoCreateRecord.$input { collection: K; record: v.InferInput<Records[K]>; }
interface DeleteRecordInput<K extends keyof Records> extends ComAtprotoRepoDeleteRecord.$input { collection: K; }

interface GetRecordOutput<K extends keyof Records> {
    cid?: Cid;
    readonly uri: AtUri;
    value: v.InferInput<Records[K]>;
}

interface ListRecordsOutput<K extends keyof Records> {
    records: {
        cid: Cid;
        readonly uri: AtUri;
        value: v.InferInput<Records[K]>;
    }[];
    cursor?: string | undefined;
}

export class XRPCError extends Error {
    kind: string;
    constructor(kind: string, message: string) {
        super(message);
        this.kind = kind;
    }
}

export function isInvalidSwapError(err: unknown) {
    return err instanceof XRPCError && err.kind === 'InvalidSwap';
}

export function isRecordNotFoundError(err: unknown) {
    return err instanceof XRPCError && err.kind === 'RecordNotFound';
}

interface Record {
    uri: ResourceUri;
    value: { [key: string]: unknown };
}
type TypedRecord<K extends keyof Records, R> = Omit<R, keyof Record> & {
    readonly uri: AtUri;
    value: v.InferInput<Records[K]>;
};

type OutputOf<T> = T extends { output: infer U; } ? U : void;

// WARNING: Evil TypeScript crimes
// This spread array nonsense allows .query and .call to have 1-3
// parameters based on only the generic type.
//
// This cannot be done with overloads to my knowledge.
type ParamsThenData<T>
    = T extends { params: infer U }
        ? T extends { input: infer V }
            ? [params: U, data: V]
            : [params: U]
        : T extends { input: infer W }
            ? [params: undefined, data: W]
            : [];

type DataThenParams<T>
    = T extends { input: infer U }
        ? T extends { params: infer V }
            ? [data: U, params: V]
            : [data: U]
        : T extends { params: infer W }
            ? [data: undefined, params: W]
            : [];

export class KittyAgent {
    public readonly xrpc: Client;

    constructor(opts: ClientOptions | Client) {
        this.xrpc = opts instanceof Client ? opts as Client : new Client(opts) as Client;
    }

    /**
     * Gets a read-only client for bsky.social PDSes.
     */
    static createUnauthed(service = 'https://bsky.social'): KittyAgent {
        return new KittyAgent({ handler: simpleFetchHandler({ service }) });
    }

    /**
     * Gets a read-only client for the Bluesky AppView.
     */
    static createAppview(service = 'https://api.bsky.app'): KittyAgent {
        return new KittyAgent({ handler: simpleFetchHandler({ service }) });
    }

    private static readonly pdsAgentCache = new Map<Did, KittyAgent>();

    /**
     * Gets a read-only client for the PDS hosting a specific account via handle or DID.
     */
    static async getOrCreatePds(handleOrDid: string) {
        const did = await resolveHandleAnonymously(handleOrDid);

        const existingAgent = KittyAgent.pdsAgentCache.get(did);
        if (existingAgent) return existingAgent;

        const didAndPds = await getDidAndPds(did);
        const agent = KittyAgent.createUnauthed(didAndPds.pds);

        KittyAgent.pdsAgentCache.set(did, agent);
        return agent;
    }

    /**
     * Gets an authenticated client for the PDS hosting a specific account via handle or DID.
     */
    static async createPdsWithCredentials(handleOrDid: string) {
        const { did, pds } = await getDidAndPds(handleOrDid);

        const manager = new CredentialManager({ service: pds });
        const agent = new KittyAgent({ handler: manager });

        return { did, manager, agent };
    }

	/**
	 * clones this XRPC client
	 * @param opts options to merge with
	 * @returns the cloned XRPC client
	 */
	clone({ handler = this.xrpc.handler, proxy = this.xrpc.proxy }: Partial<ClientOptions> = {}): KittyAgent {
		return new KittyAgent({ handler, proxy });
	}

	/**
	 * performs an XRPC query request (HTTP GET)
	 * @param name NSID of the query
	 * @param options query options
	 */
	get<TName extends keyof XRPCQueries, TInit extends QueryRequestOptions<XRPCQueries[TName]>>(
		name: TName,
		...options: HasRequiredKeys<TInit> extends true ? [init: TInit] : [init?: TInit]
	): Promise<ClientResponse<XRPCQueries[TName], TInit>> {
        return this.xrpc.get(name, ...options);
    }

	/**
	 * performs an XRPC procedure request (HTTP POST)
	 * @param name NSID of the procedure
	 * @param options procedure options
	 */
	post<TName extends keyof XRPCProcedures, TInit extends ProcedureRequestOptions<XRPCProcedures[TName]>>(
		name: TName,
		...options: HasRequiredKeys<TInit> extends true ? [init: TInit] : [init?: TInit]
	): Promise<ClientResponse<XRPCProcedures[TName], TInit>> {
        return this.xrpc.post(name, ...options);
    }

	/**
	 * performs an XRPC query request (HTTP GET)
	 * @param name NSID of the query
	 * @param options query options
	 */
	async getSafe<TName extends keyof XRPCQueries, TInit extends QueryRequestOptions<XRPCQueries[TName]>>(
		name: TName,
		...options: HasRequiredKeys<TInit> extends true ? [init: TInit] : [init?: TInit]
	): Promise<SuccessClientResponse<XRPCQueries[TName], TInit>['data']> {
        const response = await this.get(name, ...options as any);
        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }
        return response.data;
    }

	/**
	 * performs an XRPC procedure request (HTTP POST)
	 * @param name NSID of the procedure
	 * @param options procedure options
	 */
	async postSafe<TName extends keyof XRPCProcedures, TInit extends ProcedureRequestOptions<XRPCProcedures[TName]>>(
		name: TName,
		...options: HasRequiredKeys<TInit> extends true ? [init: TInit] : [init?: TInit]
	): Promise<SuccessClientResponse<XRPCProcedures[TName], TInit>['data']> {
        const response = await this.post(name, ...options as any);
        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }
        return response.data;
    }

	/**
	 * performs an XRPC call with schema validation
	 * @param schema the lexicon schema for the endpoint, or a namespace containing mainSchema
	 * @param options call options
	 */
	call<TMeta extends XRPCQueryMetadata | XRPCProcedureMetadata, TInit extends CallRequestOptions<TMeta>>(
		schema: TMeta | Namespaced<TMeta>,
		...options: HasRequiredKeys<TInit> extends true ? [init: TInit] : [init?: TInit]
	): Promise<ClientResponse<TMeta, TInit>> {
        return this.xrpc.call(schema, ...options);
    }

    private makeRecordTyped<
        K extends keyof Records,
        R extends Record
    >(
        record: R
    ): TypedRecord<K, R> {
        let memoizedAtUri: AtUri | undefined;
        const uri = record.uri; // closure variable
        return {
            ...record,
            value: record.value as v.InferInput<Records[K]>,
            get uri() {
                return memoizedAtUri ??= new AtUri(uri);
            }
        };
    }

    private makeRecordsTyped<
        K extends keyof Records,
        R extends Record,
        T extends { records: R[] } = { records: R[] },
    >(value: T): Omit<T, 'records'> & { records: TypedRecord<K, R>[] } {
        return {
            ...value,
            records: value.records.map(this.makeRecordTyped.bind(this))
        };
    }

    async getRecord<K extends keyof Records>(params: GetRecordParams<K>): Promise<GetRecordOutput<K>> {
        const response = await this.xrpc.get('com.atproto.repo.getRecord', {
            params: {
                repo: params.repo,
                collection: params.collection,
                rkey: params.rkey,
            }
        });

        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }

        return this.makeRecordTyped<K, {
            uri: ResourceUri;
            value: globalThis.Record<string, unknown>;
            cid?: string | undefined;
        }>(response.data);
    }

    async getBlob(params: ComAtprotoSyncGetBlob.$params | { did: Did, cid: Blob }): Promise<Uint8Array | string> {
        if (typeof params.cid !== 'string') {
            params = {
                cid: params.cid.ref.$link,
                did: params.did,
            } satisfies ComAtprotoSyncGetBlob.$params;
        }

        const data = await this.get('com.atproto.sync.getBlob', {
            as: 'bytes',
            params: params as ComAtprotoSyncGetBlob.$params
        });

        if (!data.ok) {
            throw new XRPCError(data.data?.error || 'Unknown', data.data?.message || 'An unknown error occurred');
        }

        return data.data;
    }

    /**
     * Atcute likes to return blobs as text sometimes. I don't know why yet. This returns them as binary if that
     * happens.
     */
    async getBlobAsBinary(params: ComAtprotoSyncGetBlob.$params | { did: Did, cid: Blob }) {
        let blob: string | Uint8Array = await this.getBlob(params);

        if (typeof blob === 'string') blob = new TextEncoder().encode(blob);

        return blob;
    }

    /**
     * Atcute likes to return blobs as text sometimes. I don't know why yet. This returns them as text no matter what,
     * and also allows you to specify an encoding.
     */
    async getBlobAsText(params: ComAtprotoSyncGetBlob.$params | { did: Did, cid: Blob }, encoding?: string) {
        let blob: string | Uint8Array = await this.getBlob(params);

        if (typeof blob !== 'string') blob = new TextDecoder(encoding).decode(blob);

        return blob;
    }

    async tryGetRecord<K extends keyof Records>(params: GetRecordParams<K>) {
        try {
            return await this.getRecord(params);
        } catch (err) {
            if (!isRecordNotFoundError(err)) throw err;
            return {
                uri: undefined,
                value: undefined,
                cid: undefined,
            };
        }
    }

    async list<K extends keyof Records>(params: ListRecordsParams<K>): Promise<ListRecordsOutput<K>> {
        const response = await this.get('com.atproto.repo.listRecords', {
            as: 'json',
            params
        });

        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }

        return this.makeRecordsTyped<K, {
            uri: ResourceUri;
            value: globalThis.Record<string, unknown>;
            cid: string;
        }>(response.data);
    }

    async put<K extends keyof Records>(params: PutRecordInput<K>) {
        const data = await this.post('com.atproto.repo.putRecord', {
            input: params
        });

        if (!data.ok) {
            throw new XRPCError(data.data?.error || 'Unknown', data.data?.message || 'An unknown error occurred');
        }

        return data.data;
    }

    async uploadBlob(buf: Uint8Array | globalThis.Blob) {
        const data = await this.post('com.atproto.repo.uploadBlob', {
            input: buf
        });

        if (!data.ok) {
            throw new XRPCError(data.data?.error || 'Unknown', data.data?.message || 'An unknown error occurred');
        }

        return data.data.blob;
    }

    async trySwap<K extends keyof Records>(params: PutRecordInput<K>) {
        try {
            await this.put(params);
            return true;
        } catch (err) {
            if (!isInvalidSwapError(err)) {
                throw err;
            }
            return false;
        }
    }

    async create<K extends keyof Records>(params: CreateRecordInput<K>) {
        const data = await this.post('com.atproto.repo.createRecord', {
            input: params
        });

        if (!data.ok) {
            throw new XRPCError(data.data?.error || 'Unknown', data.data?.message || 'An unknown error occurred');
        }

        return data.data;
    }

    async delete<K extends keyof Records>(params: DeleteRecordInput<K>) {
        const data = await this.post('com.atproto.repo.deleteRecord', {
            input: params
        });

        if (!data.ok) {
            throw new XRPCError(data.data?.error || 'Unknown', data.data?.message || 'An unknown error occurred');
        }

        return data.data;
    }

    private async paginationHelper<
        K extends string,
        T extends { cursor?: string | undefined },
        U
    >(
        limit: number | undefined,
        key: K,
        query: (cursor: string | undefined, limit: number) => Promise<T>,
        getResults: (t: T) => U[],
        resultsEqual: (a: U, b: U) => boolean,
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

            const theseResults = getResults(data);

            if (!theseResults.length ||
                theseResults.every(
                    e => results.find(e1 => resultsEqual(e1, e))
                )
            ) {
                break;
            }

            if (limit !== undefined) {
                limit -= theseResults.length;
            }

            results.push(...theseResults);

            cursor = data.cursor;

            if (!cursor) break;
        } while (cursor);

        return { [key]: results, cursor } as { [k in K]: U[]; } & { cursor: string | undefined; };
    }

    async paginatedList<K extends keyof Records>(params: {
        repo: ActorIdentifier,
        collection: K,
        reverse?: boolean,
        limit?: number;
    }): Promise<ListRecordsOutput<K>> {
        const data = this.makeRecordsTyped<K, ComAtprotoRepoListRecords.$output['records'][0]>(await this.paginationHelper(
            params.limit,
            'records',
            async (cursor, limit) => {
                const response = await this.get('com.atproto.repo.listRecords', {
                    as: 'json',
                    params: {
                        repo: params.repo,
                        collection: params.collection,
                        limit,
                        reverse: params.reverse ?? true,
                        cursor
                    }
                });

                if (!response.ok) {
                    throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
                }

                return response.data;
            },
            output => output.records,
            (a, b) => a.uri === b.uri,
        ));

        return data as ListRecordsOutput<K>;
    }

    async paginatedListBlobs(params: {
        did: Did,
        limit?: number;
    }) {
        return await this.paginationHelper(
            params.limit,
            'cids',
            async (cursor, limit) => {
                const response = await this.get('com.atproto.sync.listBlobs', {
                    as: 'json',
                    params: {
                        did: params.did,
                        limit,
                        cursor
                    }
                });

                if (!response.ok) {
                    throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
                }

                return response.data;
            },
            output => output.cids,
            (a, b) => a === b,
        );
    }

    async paginatedListRepos(params: {
        did: Did,
        limit?: number;
    }) {
        return await this.paginationHelper(
            params.limit,
            'repos',
            async (cursor, limit) => {
                const response = await this.get('com.atproto.sync.listRepos', {
                    as: 'json',
                    params: {
                        // did: params.did,
                        limit,
                        cursor
                    }
                });

                if (!response.ok) {
                    throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
                }

                return response.data;
            },
            output => output.repos,
            (a, b) => a.did === b.did,
        );
    }

    async batchWrite(params: ComAtprotoRepoApplyWrites.$input) {
        const response = await this.post('com.atproto.repo.applyWrites', {
            input: params
        });

        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }

        return response.data;
    }

    async resolveHandle(handle: `${string}.${string}`): Promise<Did> {
        if (handle.startsWith('did:')) return handle as Did;

        const response = await this.get('com.atproto.identity.resolveHandle', {
            params: {
                handle
            }
        });

        if (!response.ok) {
            throw new XRPCError(response.data?.error || 'Unknown', response.data?.message || 'An unknown error occurred');
        }

        return response.data.did;
    }
}
