import type { HttpClient } from "./http";
import type {
    CreateShareRequest,
    ShareResponse,
    SharedSecretResponse,
    OneclawResponse,
} from "./types";

export interface ShareListResponse {
    shares: ShareResponse[];
}

/**
 * Sharing resource — create time-limited, access-controlled share links
 * for individual secrets.
 *
 * Supports four recipient types:
 * - `user` — direct share to an existing user by UUID
 * - `agent` — direct share to an agent by UUID
 * - `external_email` — invite-by-email; recipient doesn't need an account yet.
 *   When they sign up or log in, the share is automatically claimed.
 * - `anyone_with_link` — anyone with the URL can access the secret
 */
export class SharingResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Create a shareable link for a secret.
     *
     * @example
     * ```ts
     * // Share with an existing user
     * await client.sharing.create(secretId, {
     *   recipient_type: "user",
     *   recipient_id: userId,
     *   expires_at: "2025-04-01T00:00:00Z",
     * });
     *
     * // Invite by email (recipient doesn't need an account)
     * await client.sharing.create(secretId, {
     *   recipient_type: "external_email",
     *   email: "alice@example.com",
     *   expires_at: "2025-04-01T00:00:00Z",
     *   max_access_count: 3,
     * });
     * ```
     */
    async create(
        secretId: string,
        options: CreateShareRequest,
    ): Promise<OneclawResponse<ShareResponse>> {
        return this.http.request<ShareResponse>(
            "POST",
            `/v1/secrets/${secretId}/share`,
            { body: options },
        );
    }

    /**
     * Access a shared secret using its share ID.
     * This is a public endpoint — no authentication required,
     * but the share must not be expired or over its access limit.
     */
    async access(
        shareId: string,
    ): Promise<OneclawResponse<SharedSecretResponse>> {
        return this.http.request<SharedSecretResponse>(
            "GET",
            `/v1/share/${shareId}`,
        );
    }

    /** List shares you have sent (outbound). */
    async listOutbound(): Promise<OneclawResponse<ShareListResponse>> {
        return this.http.request<ShareListResponse>(
            "GET",
            "/v1/shares/outbound",
        );
    }

    /** List shares others have sent to you (inbound). */
    async listInbound(): Promise<OneclawResponse<ShareListResponse>> {
        return this.http.request<ShareListResponse>(
            "GET",
            "/v1/shares/inbound",
        );
    }

    /** Accept an inbound share. */
    async accept(shareId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("POST", `/v1/shares/${shareId}/accept`);
    }

    /** Decline an inbound share. */
    async decline(shareId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("POST", `/v1/shares/${shareId}/decline`);
    }

    /** Revoke an active share link. Only the creator can revoke. */
    async revoke(shareId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("DELETE", `/v1/share/${shareId}`);
    }
}
