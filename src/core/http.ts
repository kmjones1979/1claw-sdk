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
    private signer?: X402Signer;
    private maxAutoPayUsd: number;

    constructor(config: OneclawClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.token = config.token;
        this.signer = config.x402Signer;
        this.maxAutoPayUsd = config.maxAutoPayUsd ?? 0;
    }

    /** Replace the current Bearer token (called by auth methods). */
    setToken(token: string): void {
        this.token = token;
    }

    getToken(): string | undefined {
        return this.token;
    }

    getBaseUrl(): string {
        return this.baseUrl;
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

        const price = parseFloat(accept.price);
        if (this.maxAutoPayUsd > 0 && price > this.maxAutoPayUsd) {
            throw new PaymentRequiredError(
                `Payment of $${price} exceeds auto-pay limit of $${this.maxAutoPayUsd}`,
                requirement,
            );
        }
        if (this.maxAutoPayUsd === 0) {
            throw new PaymentRequiredError(
                `Payment of $${price} required. Enable auto-pay via maxAutoPayUsd config.`,
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
