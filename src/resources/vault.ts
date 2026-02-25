import type { HttpClient } from "../core/http";
import type {
    CreateVaultRequest,
    VaultResponse,
    VaultListResponse,
    OneclawResponse,
} from "../types";

/**
 * Vault resource — create, list, get, and delete encrypted vaults.
 */
export class VaultResource {
    constructor(private readonly http: HttpClient) {}

    /** Create a new vault. */
    async create(
        options: CreateVaultRequest,
    ): Promise<OneclawResponse<VaultResponse>> {
        return this.http.request<VaultResponse>("POST", "/v1/vaults", {
            body: {
                name: options.name,
                description: options.description ?? "",
            },
        });
    }

    /** Fetch a single vault by ID. */
    async get(vaultId: string): Promise<OneclawResponse<VaultResponse>> {
        return this.http.request<VaultResponse>("GET", `/v1/vaults/${vaultId}`);
    }

    /** List all vaults visible to the authenticated identity. */
    async list(): Promise<OneclawResponse<VaultListResponse>> {
        return this.http.request<VaultListResponse>("GET", "/v1/vaults");
    }

    /** Permanently delete a vault and all its secrets. */
    async delete(vaultId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("DELETE", `/v1/vaults/${vaultId}`);
    }
}
