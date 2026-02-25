import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpClient } from "../core/http";
import { PaymentRequiredError } from "../core/errors";

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(headers),
        json: () => Promise.resolve(body),
    } as unknown as Response);
}

describe("HttpClient", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("sends GET with Bearer token", async () => {
        const fetcher = mockFetch(200, { id: "v1" });
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test", token: "tok123" });
        const res = await http.request("GET", "/v1/vaults");

        expect(fetcher).toHaveBeenCalledOnce();
        const [url, init] = fetcher.mock.calls[0];
        expect(url).toBe("https://api.test/v1/vaults");
        expect(init.method).toBe("GET");
        expect(init.headers["Authorization"]).toBe("Bearer tok123");
        expect(res.data).toEqual({ id: "v1" });
        expect(res.error).toBeNull();
        expect(res.meta?.status).toBe(200);
    });

    it("sends POST with JSON body", async () => {
        const fetcher = mockFetch(201, { id: "new" });
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test", token: "t" });
        await http.request("POST", "/v1/vaults", { body: { name: "test" } });

        const [, init] = fetcher.mock.calls[0];
        expect(init.body).toBe(JSON.stringify({ name: "test" }));
        expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("omits Authorization when no token", async () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test" });
        await http.request("GET", "/v1/health");

        const [, init] = fetcher.mock.calls[0];
        expect(init.headers["Authorization"]).toBeUndefined();
    });

    it("strips trailing slash from baseUrl", async () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test/" });
        await http.request("GET", "/v1/health");

        expect(fetcher.mock.calls[0][0]).toBe("https://api.test/v1/health");
    });

    it("appends query parameters and skips undefined values", async () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test", token: "t" });
        await http.request("GET", "/v1/secrets", {
            query: { prefix: "db", limit: 10, missing: undefined },
        });

        const url = new URL(fetcher.mock.calls[0][0]);
        expect(url.searchParams.get("prefix")).toBe("db");
        expect(url.searchParams.get("limit")).toBe("10");
        expect(url.searchParams.has("missing")).toBe(false);
    });

    it("returns null data for 204 No Content", async () => {
        globalThis.fetch = mockFetch(204, null);

        const http = new HttpClient({ baseUrl: "https://api.test", token: "t" });
        const res = await http.request<void>("DELETE", "/v1/vaults/abc");

        expect(res.data).toBeNull();
        expect(res.error).toBeNull();
        expect(res.meta?.status).toBe(204);
    });

    it("returns error envelope on non-ok responses", async () => {
        globalThis.fetch = mockFetch(404, { detail: "Vault not found" });

        const http = new HttpClient({ baseUrl: "https://api.test", token: "t" });
        const res = await http.request("GET", "/v1/vaults/missing");

        expect(res.data).toBeNull();
        expect(res.error).toBeTruthy();
        expect(res.error?.type).toBe("not_found");
        expect(res.error?.message).toBe("Vault not found");
        expect(res.meta?.status).toBe(404);
    });

    it("requestOrThrow throws on error responses", async () => {
        globalThis.fetch = mockFetch(401, { detail: "Invalid token" });

        const http = new HttpClient({ baseUrl: "https://api.test", token: "bad" });

        await expect(
            http.requestOrThrow("GET", "/v1/vaults"),
        ).rejects.toThrow("Invalid token");
    });

    it("requestOrThrow returns data on success", async () => {
        globalThis.fetch = mockFetch(200, { vaults: [] });

        const http = new HttpClient({ baseUrl: "https://api.test", token: "t" });
        const data = await http.requestOrThrow<{ vaults: unknown[] }>("GET", "/v1/vaults");

        expect(data.vaults).toEqual([]);
    });

    it("setToken/getToken updates the auth header", async () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        const http = new HttpClient({ baseUrl: "https://api.test" });
        expect(http.getToken()).toBeUndefined();

        http.setToken("new-jwt");
        expect(http.getToken()).toBe("new-jwt");

        await http.request("GET", "/v1/vaults");
        expect(fetcher.mock.calls[0][1].headers["Authorization"]).toBe("Bearer new-jwt");
    });

    describe("x402 auto-payment", () => {
        const paymentRequirement = {
            x402Version: 1,
            accepts: [
                {
                    scheme: "exact",
                    network: "eip155:8453",
                    payTo: "0xabc",
                    price: "0.001",
                    requiredDeadlineSeconds: 60,
                },
            ],
            description: "Pay per query",
        };

        it("retries with X-PAYMENT header when signer is configured", async () => {
            const signer = {
                getAddress: vi.fn().mockResolvedValue("0xsigner"),
                signPayment: vi.fn().mockResolvedValue("sig-bytes"),
            };

            let callCount = 0;
            globalThis.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 402,
                        headers: new Headers(),
                        json: () => Promise.resolve(paymentRequirement),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers(),
                    json: () => Promise.resolve({ value: "secret" }),
                });
            });

            const http = new HttpClient({
                baseUrl: "https://api.test",
                token: "t",
                x402Signer: signer,
                maxAutoPayUsd: 1,
            });

            const res = await http.request("GET", "/v1/vaults/v1/secrets/key");

            expect(signer.signPayment).toHaveBeenCalledWith(paymentRequirement.accepts[0]);
            expect(globalThis.fetch).toHaveBeenCalledTimes(2);
            const retryHeaders = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].headers;
            expect(retryHeaders["X-PAYMENT"]).toBeDefined();
            expect(res.data).toEqual({ value: "secret" });
        });

        it("throws PaymentRequiredError when maxAutoPayUsd is 0", async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 402,
                headers: new Headers(),
                json: () => Promise.resolve(paymentRequirement),
            });

            const signer = {
                getAddress: vi.fn(),
                signPayment: vi.fn(),
            };

            const http = new HttpClient({
                baseUrl: "https://api.test",
                token: "t",
                x402Signer: signer,
                maxAutoPayUsd: 0,
            });

            await expect(http.request("GET", "/v1/test")).rejects.toThrow(PaymentRequiredError);
        });

        it("throws when payment exceeds maxAutoPayUsd", async () => {
            const expensiveRequirement = {
                ...paymentRequirement,
                accepts: [{ ...paymentRequirement.accepts[0], price: "100.0" }],
            };

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 402,
                headers: new Headers(),
                json: () => Promise.resolve(expensiveRequirement),
            });

            const signer = {
                getAddress: vi.fn(),
                signPayment: vi.fn(),
            };

            const http = new HttpClient({
                baseUrl: "https://api.test",
                token: "t",
                x402Signer: signer,
                maxAutoPayUsd: 1,
            });

            await expect(http.request("GET", "/v1/test")).rejects.toThrow(
                /exceeds auto-pay limit/,
            );
        });
    });
});
