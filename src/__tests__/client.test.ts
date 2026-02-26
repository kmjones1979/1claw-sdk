import { describe, it, expect, vi, afterEach } from "vitest";
import { OneclawClient, createClient } from "../core/client";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

function mockFetch(status: number, body: unknown) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(),
        json: () => Promise.resolve(body),
    } as unknown as Response);
}

describe("OneclawClient", () => {
    it("initializes all 14 resource properties", () => {
        globalThis.fetch = mockFetch(200, {});
        const client = new OneclawClient({ baseUrl: "https://api.test", token: "t" });

        expect(client.vault).toBeDefined();
        expect(client.secrets).toBeDefined();
        expect(client.access).toBeDefined();
        expect(client.agents).toBeDefined();
        expect(client.sharing).toBeDefined();
        expect(client.approvals).toBeDefined();
        expect(client.billing).toBeDefined();
        expect(client.audit).toBeDefined();
        expect(client.org).toBeDefined();
        expect(client.auth).toBeDefined();
        expect(client.apiKeys).toBeDefined();
        expect(client.chains).toBeDefined();
        expect(client.x402).toBeDefined();
    });

    it("auto-authenticates with agent apiKey + agentId on first request", async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ access_token: "agent-jwt" }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ vaults: [] }),
            } as unknown as Response);
        globalThis.fetch = fetcher;

        const client = new OneclawClient({
            baseUrl: "https://api.test",
            apiKey: "ocv_abc",
            agentId: "agent-uuid",
        });

        // Agent auth is lazy — fires on first request, not constructor
        await client.vault.list();

        const [url, init] = fetcher.mock.calls[0];
        expect(url).toContain("/v1/auth/agent-token");
        const body = JSON.parse(init.body);
        expect(body.agent_id).toBe("agent-uuid");
        expect(body.api_key).toBe("ocv_abc");
    });

    it("auto-authenticates with user apiKey (no agentId)", async () => {
        const fetcher = mockFetch(200, { access_token: "user-jwt" });
        globalThis.fetch = fetcher;

        new OneclawClient({
            baseUrl: "https://api.test",
            apiKey: "1ck_abc",
        });

        await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());

        const [url] = fetcher.mock.calls[0];
        expect(url).toContain("/v1/auth/api-key-token");
    });

    it("skips auto-auth when token is already provided", () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        new OneclawClient({
            baseUrl: "https://api.test",
            token: "existing-jwt",
            apiKey: "ocv_abc",
        });

        expect(fetcher).not.toHaveBeenCalled();
    });

    it("skips auto-auth when no apiKey is provided", () => {
        const fetcher = mockFetch(200, {});
        globalThis.fetch = fetcher;

        new OneclawClient({
            baseUrl: "https://api.test",
            token: "jwt",
        });

        expect(fetcher).not.toHaveBeenCalled();
    });
});

describe("createClient", () => {
    it("returns an OneclawClient instance", () => {
        globalThis.fetch = mockFetch(200, {});
        const client = createClient({ baseUrl: "https://api.test", token: "t" });
        expect(client).toBeInstanceOf(OneclawClient);
    });
});
