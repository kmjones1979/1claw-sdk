import type { HttpClient } from "../core/http";
import type {
    CreateApiKeyRequest,
    ApiKeyCreatedResponse,
    ApiKeyListResponse,
    OneclawResponse,
} from "../types";

/**
 * ApiKeys resource — create, list, and revoke personal API keys
 * for human users.
 */
export class ApiKeysResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Create a new API key. Returns the full key string once — store it
     * securely as it cannot be retrieved again.
     */
    async create(
        options: CreateApiKeyRequest,
    ): Promise<OneclawResponse<ApiKeyCreatedResponse>> {
        return this.http.request<ApiKeyCreatedResponse>(
            "POST",
            "/v1/auth/api-keys",
            { body: options },
        );
    }

    /** List all API keys for the current user (keys are masked). */
    async list(): Promise<OneclawResponse<ApiKeyListResponse>> {
        return this.http.request<ApiKeyListResponse>(
            "GET",
            "/v1/auth/api-keys",
        );
    }

    /** Revoke (deactivate) an API key by its ID. */
    async revoke(keyId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("DELETE", `/v1/auth/api-keys/${keyId}`);
    }
}
