import type { HttpClient } from "../core/http";
import type { AuditQuery, AuditEventsResponse, OneclawResponse } from "../types";

/**
 * Audit resource — query the immutable audit log of all vault operations.
 */
export class AuditResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Query audit events with optional filters.
     *
     * @example
     * ```ts
     * const events = await client.audit.query({
     *   resource_id: vaultId,
     *   action: "secret.read",
     *   limit: 25,
     * });
     * ```
     */
    async query(
        filters: AuditQuery = {},
    ): Promise<OneclawResponse<AuditEventsResponse>> {
        const query: Record<string, string | number | undefined> = {};
        if (filters.resource_id) query.resource_id = filters.resource_id;
        if (filters.actor_id) query.actor_id = filters.actor_id;
        if (filters.action) query.action = filters.action;
        if (filters.from) query.from = filters.from;
        if (filters.to) query.to = filters.to;
        if (filters.limit !== undefined) query.limit = filters.limit;
        if (filters.offset !== undefined) query.offset = filters.offset;

        return this.http.request<AuditEventsResponse>(
            "GET",
            "/v1/audit/events",
            {
                query,
            },
        );
    }
}
