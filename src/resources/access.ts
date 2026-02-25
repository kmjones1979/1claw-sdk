import type { HttpClient } from "../core/http";
import type {
    CreatePolicyRequest,
    UpdatePolicyRequest,
    PolicyResponse,
    PolicyListResponse,
    OneclawResponse,
} from "../types";

export interface GrantOptions {
    /** Glob pattern for which secret paths the grant covers (default: "**"). */
    secretPathPattern?: string;
    /** Additional conditions (e.g. IP allow-list, time windows). */
    conditions?: Record<string, unknown>;
    /** ISO-8601 expiry for the grant. */
    expires_at?: string;
}

/**
 * Access resource — manage vault access policies (grants) for
 * humans and agents.
 */
export class AccessResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Grant a human user access to a vault.
     * @param permissions - e.g. ["read"], ["read", "write"]
     */
    async grantHuman(
        vaultId: string,
        userId: string,
        permissions: string[],
        options: GrantOptions = {},
    ): Promise<OneclawResponse<PolicyResponse>> {
        const body: CreatePolicyRequest = {
            secret_path_pattern: options.secretPathPattern ?? "**",
            principal_type: "user",
            principal_id: userId,
            permissions,
            conditions: options.conditions,
            expires_at: options.expires_at,
        };
        return this.http.request<PolicyResponse>(
            "POST",
            `/v1/vaults/${vaultId}/policies`,
            { body },
        );
    }

    /**
     * Grant an agent access to a vault.
     * @param permissions - e.g. ["read"], ["read", "write"]
     */
    async grantAgent(
        vaultId: string,
        agentId: string,
        permissions: string[],
        options: GrantOptions = {},
    ): Promise<OneclawResponse<PolicyResponse>> {
        const body: CreatePolicyRequest = {
            secret_path_pattern: options.secretPathPattern ?? "**",
            principal_type: "agent",
            principal_id: agentId,
            permissions,
            conditions: options.conditions,
            expires_at: options.expires_at,
        };
        return this.http.request<PolicyResponse>(
            "POST",
            `/v1/vaults/${vaultId}/policies`,
            { body },
        );
    }

    /** Update an existing policy's permissions and/or conditions. */
    async update(
        vaultId: string,
        policyId: string,
        update: UpdatePolicyRequest,
    ): Promise<OneclawResponse<PolicyResponse>> {
        return this.http.request<PolicyResponse>(
            "PUT",
            `/v1/vaults/${vaultId}/policies/${policyId}`,
            { body: update },
        );
    }

    /** Revoke a specific access policy by its ID. */
    async revoke(
        vaultId: string,
        policyId: string,
    ): Promise<OneclawResponse<void>> {
        return this.http.request<void>(
            "DELETE",
            `/v1/vaults/${vaultId}/policies/${policyId}`,
        );
    }

    /** List all access grants (policies) on a vault. */
    async listGrants(
        vaultId: string,
    ): Promise<OneclawResponse<PolicyListResponse>> {
        return this.http.request<PolicyListResponse>(
            "GET",
            `/v1/vaults/${vaultId}/policies`,
        );
    }
}
