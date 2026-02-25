import type { HttpClient } from "../core/http";
import type {
    UsageSummaryResponse,
    UsageHistoryResponse,
    OneclawResponse,
} from "../types";

/**
 * Billing resource — view API usage summaries and per-request history.
 */
export class BillingResource {
    constructor(private readonly http: HttpClient) {}

    /** Get the current month's usage summary (free tier remaining, costs). */
    async usage(): Promise<OneclawResponse<UsageSummaryResponse>> {
        return this.http.request<UsageSummaryResponse>(
            "GET",
            "/v1/billing/usage",
        );
    }

    /**
     * Get per-request usage history.
     * @param limit Maximum number of events to return (1–200, default 50).
     */
    async history(
        limit?: number,
    ): Promise<OneclawResponse<UsageHistoryResponse>> {
        return this.http.request<UsageHistoryResponse>(
            "GET",
            "/v1/billing/history",
            {
                query: limit !== undefined ? { limit } : undefined,
            },
        );
    }
}
