import type { HttpClient } from "../core/http";
import type {
    PutSecretRequest,
    SecretResponse,
    SecretMetadataResponse,
    SecretListResponse,
    OneclawResponse,
} from "../types";

export interface SetSecretOptions {
    type?: string;
    metadata?: Record<string, unknown>;
    expires_at?: string;
    rotation_policy?: Record<string, unknown>;
    max_access_count?: number;
}

export interface GetSecretOptions {
    /** Reason for accessing this secret (logged in the audit trail). */
    reason?: string;
}

/**
 * Secrets resource — store, retrieve, list, rotate, and delete secrets
 * within a vault.
 */
export class SecretsResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Store or update a secret at the given path inside a vault.
     * Returns the secret metadata (without the plaintext value).
     */
    async set(
        vaultId: string,
        key: string,
        value: string,
        options: SetSecretOptions = {},
    ): Promise<OneclawResponse<SecretMetadataResponse>> {
        const body: PutSecretRequest = {
            type: options.type ?? "generic",
            value,
            metadata: options.metadata,
            expires_at: options.expires_at,
            rotation_policy: options.rotation_policy,
            max_access_count: options.max_access_count,
        };
        return this.http.request<SecretMetadataResponse>(
            "PUT",
            `/v1/vaults/${vaultId}/secrets/${key}`,
            { body },
        );
    }

    /**
     * Retrieve a decrypted secret value.
     * May return a `PaymentRequiredError` (402) or `ApprovalRequiredError`
     * depending on access policies.
     */
    async get(
        vaultId: string,
        key: string,
        _options?: GetSecretOptions,
    ): Promise<OneclawResponse<SecretResponse>> {
        return this.http.request<SecretResponse>(
            "GET",
            `/v1/vaults/${vaultId}/secrets/${key}`,
        );
    }

    /** Delete a secret from a vault. */
    async delete(vaultId: string, key: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>(
            "DELETE",
            `/v1/vaults/${vaultId}/secrets/${key}`,
        );
    }

    /** List secret keys (metadata only, no plaintext values). */
    async list(
        vaultId: string,
        prefix?: string,
    ): Promise<OneclawResponse<SecretListResponse>> {
        return this.http.request<SecretListResponse>(
            "GET",
            `/v1/vaults/${vaultId}/secrets`,
            { query: prefix ? { prefix } : undefined },
        );
    }

    /**
     * Rotate a secret by writing a new value at the same path.
     * This increments the version and overwrites the previous value.
     */
    async rotate(
        vaultId: string,
        key: string,
        newValue: string,
        options: SetSecretOptions = {},
    ): Promise<OneclawResponse<SecretMetadataResponse>> {
        return this.set(vaultId, key, newValue, options);
    }
}
