import type {
    OneclawClientConfig,
    OneclawResponse,
    PaymentRequirement,
    X402Signer,
} from "../types";
import { errorFromResponse, PaymentRequiredError } from "./errors";

/**
 * Internal HTTP transport used by every resource module.
 * Handles authentication headers, 402 auto-pay, and error mapping.
 */
export class HttpClient {
    private baseUrl: string;
    private token?: string;
    private tokenExpiresAt = 0;
    private signer?: X402Signer;
    private maxAutoPayUsd: number;
    private agentCredentials?: { agentId?: string; apiKey: string };
    private refreshPromise?: Promise<void>;
    private _resolvedAgentId?: string;

    private static readonly REFRESH_BUFFER_MS = 60_000;

    constructor(config: OneclawClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.token = config.token;
        this.signer = config.x402Signer;
        this.maxAutoPayUsd = config.maxAutoPayUsd ?? 0;

        const isAgentKey = config.apiKey?.startsWith("ocv_") || !!config.agentId;
        if (config.apiKey && isAgentKey) {
            this.agentCredentials = {
                agentId: config.agentId,
                apiKey: config.apiKey,
            };
        }
    }

    /** Agent ID resolved from the token exchange (for key-only auth). */
    get resolvedAgentId(): string | undefined {
        return this._resolvedAgentId ?? this.agentCredentials?.agentId;
    }

    /** Replace the current Bearer token (called by auth methods). */
    setToken(token: string): void {
        this.token = token;
        this.tokenExpiresAt = HttpClient.decodeExpiry(token);
    }

    getToken(): string | undefined {
        return this.token;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    private static decodeExpiry(jwt: string): number {
        try {
            const parts = jwt.split(".");
            if (parts.length !== 3) return 0;
            const payload = JSON.parse(
                atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
            );
            return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
        } catch {
            return 0;
        }
    }

    private async ensureToken(): Promise<void> {
        if (!this.agentCredentials) return;
        if (
            this.token &&
            Date.now() < this.tokenExpiresAt - HttpClient.REFRESH_BUFFER_MS
        )
            return;

        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }

        this.refreshPromise = (async () => {
            const body: Record<string, string> = {
                api_key: this.agentCredentials!.apiKey,
            };
            if (this.agentCredentials!.agentId) {
                body.agent_id = this.agentCredentials!.agentId;
            }

            const res = await fetch(`${this.baseUrl}/v1/auth/agent-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error(
                    `Agent token refresh failed: HTTP ${res.status}`,
                );
            }

            const data = (await res.json()) as {
                access_token: string;
                expires_in: number;
                agent_id?: string;
                vault_ids?: string[];
            };
            this.token = data.access_token;
            this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

            if (data.agent_id) {
                this._resolvedAgentId = data.agent_id;
                if (this.agentCredentials && !this.agentCredentials.agentId) {
                    this.agentCredentials.agentId = data.agent_id;
                }
            }
        })().finally(() => {
            this.refreshPromise = undefined;
        });

        await this.refreshPromise;
    }

    /**
     * Perform a typed request against the API and return an envelope.
     * Automatically retries once with an x402 payment header when
     * a signer is configured and the price is within limits.
     */
    async request<T>(
        method: string,
        path: string,
        options: {
            body?: unknown;
            query?: Record<string, string | number | undefined>;
            headers?: Record<string, string>;
        } = {},
    ): Promise<OneclawResponse<T>> {
        await this.ensureToken();
        const url = this.buildUrl(path, options.query);
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...options.headers,
        };
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const init: RequestInit = { method, headers };
        if (options.body !== undefined) {
            init.body = JSON.stringify(options.body);
        }

        let res = await fetch(url, init);

        if (res.status === 402 && this.signer) {
            res = await this.handlePayment(res, url, init);
        }

        if (!res.ok) {
            const err = await errorFromResponse(res);
            return {
                data: null,
                error: {
                    type: err.type,
                    message: err.message,
                    detail: err.detail,
                },
                meta: { status: res.status },
            };
        }

        if (res.status === 204) {
            return {
                data: null as unknown as T,
                error: null,
                meta: { status: 204 },
            };
        }

        const data = (await res.json()) as T;
        return { data, error: null, meta: { status: res.status } };
    }

    /**
     * Same as `request` but throws on error instead of returning an envelope.
     * Convenient for callers that prefer exceptions.
     */
    async requestOrThrow<T>(
        method: string,
        path: string,
        options: {
            body?: unknown;
            query?: Record<string, string | number | undefined>;
            headers?: Record<string, string>;
        } = {},
    ): Promise<T> {
        await this.ensureToken();
        const url = this.buildUrl(path, options.query);
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...options.headers,
        };
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const init: RequestInit = { method, headers };
        if (options.body !== undefined) {
            init.body = JSON.stringify(options.body);
        }

        let res = await fetch(url, init);

        if (res.status === 402 && this.signer) {
            res = await this.handlePayment(res, url, init);
        }

        if (!res.ok) {
            throw await errorFromResponse(res);
        }

        if (res.status === 204) {
            return undefined as unknown as T;
        }

        return (await res.json()) as T;
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private buildUrl(
        path: string,
        query?: Record<string, string | number | undefined>,
    ): string {
        const url = new URL(`${this.baseUrl}${path}`);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v !== undefined) url.searchParams.set(k, String(v));
            }
        }
        return url.toString();
    }

    /**
     * Attempt to sign an x402 payment and retry the original request
     * with the `X-PAYMENT` header attached.
     */
    private async handlePayment(
        originalRes: Response,
        url: string,
        init: RequestInit,
    ): Promise<Response> {
        let requirement: PaymentRequirement;
        try {
            requirement = (await originalRes.json()) as PaymentRequirement;
        } catch {
            return originalRes;
        }

        const accept = requirement.accepts?.[0];
        if (!accept || !this.signer) return originalRes;

        // Prefer maxAmountRequired (atomic); fall back to price (USD) for older servers
        const priceUsd =
            accept.price != null
                ? parseFloat(accept.price)
                : parseFloat(accept.maxAmountRequired) / 1_000_000; // USDC 6 decimals -> USD
        if (Number.isNaN(priceUsd)) {
            return originalRes;
        }
        if (this.maxAutoPayUsd > 0 && priceUsd > this.maxAutoPayUsd) {
            throw new PaymentRequiredError(
                `Payment of $${priceUsd.toFixed(4)} exceeds auto-pay limit of $${this.maxAutoPayUsd}`,
                requirement,
            );
        }
        if (this.maxAutoPayUsd === 0) {
            throw new PaymentRequiredError(
                `Payment of $${priceUsd.toFixed(4)} required. Enable auto-pay via maxAutoPayUsd config.`,
                requirement,
            );
        }

        const signature = await this.signer.signPayment(accept);

        const paymentPayload = {
            x402Version: requirement.x402Version,
            scheme: accept.scheme,
            network: accept.network,
            payload: signature,
        };

        const retryHeaders = {
            ...(init.headers as Record<string, string>),
            "X-PAYMENT": JSON.stringify(paymentPayload),
        };

        return fetch(url, { ...init, headers: retryHeaders });
    }
}
