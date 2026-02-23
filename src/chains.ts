import type { HttpClient } from "./http";
import type {
    ChainResponse,
    ChainListResponse,
    CreateChainRequest,
    UpdateChainRequest,
    OneclawResponse,
} from "./types";

/**
 * Chains resource — list supported blockchains and manage chain configuration.
 *
 * Public endpoints let any authenticated user list enabled chains.
 * Admin endpoints allow adding, updating (e.g. setting an RPC URL), and removing chains.
 */
export class ChainsResource {
    constructor(private readonly http: HttpClient) {}

    /** List all enabled chains. */
    async list(): Promise<OneclawResponse<ChainListResponse>> {
        return this.http.request<ChainListResponse>("GET", "/v1/chains");
    }

    /** Get a chain by name (e.g. "base") or numeric chain ID (e.g. "8453"). */
    async get(identifier: string): Promise<OneclawResponse<ChainResponse>> {
        return this.http.request<ChainResponse>(
            "GET",
            `/v1/chains/${identifier}`,
        );
    }

    // ── Admin ──────────────────────────────────────────────────────

    /** List all chains including disabled ones (admin). */
    async adminList(): Promise<OneclawResponse<ChainListResponse>> {
        return this.http.request<ChainListResponse>("GET", "/v1/admin/chains");
    }

    /** Add a new chain to the registry (admin). */
    async create(
        chain: CreateChainRequest,
    ): Promise<OneclawResponse<ChainResponse>> {
        return this.http.request<ChainResponse>("POST", "/v1/admin/chains", {
            body: chain,
        });
    }

    /** Update chain configuration, e.g. set an RPC URL (admin). */
    async update(
        chainId: string,
        update: UpdateChainRequest,
    ): Promise<OneclawResponse<ChainResponse>> {
        return this.http.request<ChainResponse>(
            "PUT",
            `/v1/admin/chains/${chainId}`,
            { body: update },
        );
    }

    /** Remove a chain from the registry (admin). */
    async delete(chainId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("DELETE", `/v1/admin/chains/${chainId}`);
    }
}
