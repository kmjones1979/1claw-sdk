import type { HttpClient } from "../core/http";
import type {
    PaymentRequirement,
    PaymentReceipt,
    X402Signer,
    SecretResponse,
    OneclawResponse,
} from "../types";
import { PaymentRequiredError, errorFromResponse } from "../core/errors";

/**
 * x402 resource — interact with the x402 payment protocol.
 *
 * The x402 protocol enables HTTP 402 micropayments: when free-tier
 * limits are exceeded, the API returns a 402 with payment instructions.
 * This resource provides methods to inspect, pay, and verify those
 * payment flows.
 */
export class X402Resource {
    constructor(
        private readonly http: HttpClient,
        private readonly signer?: X402Signer,
    ) {}

    /**
     * Probe a resource path to get its x402 payment requirement
     * without executing the request. Returns `null` if the resource
     * does not require payment (free-tier is not exhausted).
     */
    async getPaymentRequirement(
        resourcePath: string,
    ): Promise<PaymentRequirement | null> {
        const url = `${this.http.getBaseUrl()}${resourcePath}`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        const token = this.http.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, {
            method: "GET",
            headers,
        });

        if (res.status === 402) {
            return (await res.json()) as PaymentRequirement;
        }
        return null;
    }

    /**
     * Sign and submit a payment for a given requirement.
     * Requires an `X402Signer` to be configured on the client or passed here.
     *
     * @returns The payment payload string to attach as `X-PAYMENT` header.
     */
    async pay(
        requirement: PaymentRequirement,
        signer?: X402Signer,
    ): Promise<string> {
        const activeSigner = signer ?? this.signer;
        if (!activeSigner) {
            throw new Error(
                "No x402 signer configured. Pass one to createClient({ x402Signer }) " +
                    "or to x402.pay(requirement, signer).",
            );
        }

        const accept = requirement.accepts[0];
        if (!accept) {
            throw new Error(
                "Payment requirement has no accepted payment methods",
            );
        }

        const signature = await activeSigner.signPayment(accept);
        const payload = {
            x402Version: requirement.x402Version,
            scheme: accept.scheme,
            network: accept.network,
            payload: signature,
        };

        return JSON.stringify(payload);
    }

    /**
     * Verify that a payment receipt is valid by re-requesting the resource
     * with the payment header and checking for a successful response.
     */
    async verifyReceipt(
        resourcePath: string,
        receipt: PaymentReceipt,
    ): Promise<boolean> {
        const url = `${this.http.getBaseUrl()}${resourcePath}`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "X-PAYMENT": JSON.stringify(receipt),
        };
        const token = this.http.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { method: "GET", headers });
        return res.ok;
    }

    /**
     * Convenience method: pay for and then fetch a secret in one call.
     * Handles the full 402 flow: request → receive 402 → sign payment →
     * retry with payment header → return decrypted secret.
     */
    async withPayment(
        vaultId: string,
        key: string,
        signer?: X402Signer,
    ): Promise<OneclawResponse<SecretResponse>> {
        const path = `/v1/vaults/${vaultId}/secrets/${key}`;
        const url = `${this.http.getBaseUrl()}${path}`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        const token = this.http.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const firstAttempt = await fetch(url, { method: "GET", headers });

        if (firstAttempt.status !== 402) {
            if (!firstAttempt.ok) {
                const err = await errorFromResponse(firstAttempt);
                return {
                    data: null,
                    error: { type: err.type, message: err.message },
                    meta: { status: firstAttempt.status },
                };
            }
            return {
                data: (await firstAttempt.json()) as SecretResponse,
                error: null,
                meta: { status: firstAttempt.status },
            };
        }

        const requirement = (await firstAttempt.json()) as PaymentRequirement;
        const paymentHeader = await this.pay(requirement, signer);

        const retry = await fetch(url, {
            method: "GET",
            headers: { ...headers, "X-PAYMENT": paymentHeader },
        });

        if (!retry.ok) {
            const err = await errorFromResponse(retry);
            return {
                data: null,
                error: { type: err.type, message: err.message },
                meta: { status: retry.status },
            };
        }

        return {
            data: (await retry.json()) as SecretResponse,
            error: null,
            meta: { status: retry.status },
        };
    }
}
