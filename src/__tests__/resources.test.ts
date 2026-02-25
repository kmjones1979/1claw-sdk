import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpClient } from "../core/http";
import { VaultResource } from "../resources/vault";
import { SecretsResource } from "../resources/secrets";
import { AccessResource } from "../resources/access";
import { AgentsResource } from "../resources/agents";
import { ChainsResource } from "../resources/chains";
import { SharingResource } from "../resources/sharing";
import { ApprovalsResource } from "../resources/approvals";
import { BillingResource } from "../resources/billing";
import { AuditResource } from "../resources/audit";
import { OrgResource } from "../resources/org";
import { AuthResource } from "../resources/auth";
import { ApiKeysResource } from "../resources/api-keys";

const BASE = "https://api.test";
const originalFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(),
        json: () => Promise.resolve(body),
    } as unknown as Response);
}

function makeHttp(token = "test-jwt") {
    return new HttpClient({ baseUrl: BASE, token });
}

function lastCall() {
    const f = globalThis.fetch as ReturnType<typeof vi.fn>;
    return { url: f.mock.calls[0][0] as string, init: f.mock.calls[0][1] as RequestInit };
}

afterEach(() => {
    globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// VaultResource
// ---------------------------------------------------------------------------
describe("VaultResource", () => {
    it("create sends POST /v1/vaults with name and description", async () => {
        globalThis.fetch = mockFetch(201, { id: "v-1", name: "prod" });
        const res = await new VaultResource(makeHttp()).create({ name: "prod", description: "test" });
        const { url, init } = lastCall();
        expect(url).toBe(`${BASE}/v1/vaults`);
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body as string)).toEqual({ name: "prod", description: "test" });
        expect(res.data?.id).toBe("v-1");
    });

    it("create defaults description to empty string", async () => {
        globalThis.fetch = mockFetch(201, { id: "v-1" });
        await new VaultResource(makeHttp()).create({ name: "prod" });
        expect(JSON.parse(lastCall().init.body as string).description).toBe("");
    });

    it("get sends GET /v1/vaults/{id}", async () => {
        globalThis.fetch = mockFetch(200, { id: "v-1" });
        await new VaultResource(makeHttp()).get("v-1");
        expect(lastCall().url).toBe(`${BASE}/v1/vaults/v-1`);
        expect(lastCall().init.method).toBe("GET");
    });

    it("list sends GET /v1/vaults", async () => {
        globalThis.fetch = mockFetch(200, { vaults: [] });
        const res = await new VaultResource(makeHttp()).list();
        expect(lastCall().url).toBe(`${BASE}/v1/vaults`);
        expect(res.data?.vaults).toEqual([]);
    });

    it("delete sends DELETE /v1/vaults/{id}", async () => {
        globalThis.fetch = mockFetch(204, null);
        const res = await new VaultResource(makeHttp()).delete("v-1");
        expect(lastCall().init.method).toBe("DELETE");
        expect(res.meta?.status).toBe(204);
    });
});

// ---------------------------------------------------------------------------
// SecretsResource
// ---------------------------------------------------------------------------
describe("SecretsResource", () => {
    it("set sends PUT with value and type", async () => {
        globalThis.fetch = mockFetch(201, { id: "s-1", path: "db/pass", version: 1 });
        await new SecretsResource(makeHttp()).set("v-1", "db/pass", "secret123", { type: "password" });
        const { url, init } = lastCall();
        expect(url).toBe(`${BASE}/v1/vaults/v-1/secrets/db/pass`);
        expect(init.method).toBe("PUT");
        const body = JSON.parse(init.body as string);
        expect(body.value).toBe("secret123");
        expect(body.type).toBe("password");
    });

    it("set defaults type to 'generic'", async () => {
        globalThis.fetch = mockFetch(201, {});
        await new SecretsResource(makeHttp()).set("v-1", "key", "val");
        expect(JSON.parse(lastCall().init.body as string).type).toBe("generic");
    });

    it("set passes optional fields", async () => {
        globalThis.fetch = mockFetch(201, {});
        await new SecretsResource(makeHttp()).set("v-1", "key", "val", {
            max_access_count: 5,
            expires_at: "2025-12-31T00:00:00Z",
            metadata: { env: "prod" },
        });
        const body = JSON.parse(lastCall().init.body as string);
        expect(body.max_access_count).toBe(5);
        expect(body.expires_at).toBe("2025-12-31T00:00:00Z");
        expect(body.metadata).toEqual({ env: "prod" });
    });

    it("get sends GET with correct path", async () => {
        globalThis.fetch = mockFetch(200, { value: "s3cr3t" });
        const res = await new SecretsResource(makeHttp()).get("v-1", "db/pass");
        expect(lastCall().url).toBe(`${BASE}/v1/vaults/v-1/secrets/db/pass`);
        expect(res.data?.value).toBe("s3cr3t");
    });

    it("delete sends DELETE", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new SecretsResource(makeHttp()).delete("v-1", "db/pass");
        expect(lastCall().init.method).toBe("DELETE");
    });

    it("list sends GET with optional prefix query", async () => {
        globalThis.fetch = mockFetch(200, { secrets: [] });
        await new SecretsResource(makeHttp()).list("v-1", "db");
        const url = new URL(lastCall().url);
        expect(url.pathname).toBe("/v1/vaults/v-1/secrets");
        expect(url.searchParams.get("prefix")).toBe("db");
    });

    it("list omits prefix when not provided", async () => {
        globalThis.fetch = mockFetch(200, { secrets: [] });
        await new SecretsResource(makeHttp()).list("v-1");
        const url = new URL(lastCall().url);
        expect(url.searchParams.has("prefix")).toBe(false);
    });

    it("rotate delegates to set", async () => {
        globalThis.fetch = mockFetch(201, { version: 2 });
        await new SecretsResource(makeHttp()).rotate("v-1", "key", "new-val");
        expect(lastCall().init.method).toBe("PUT");
        expect(JSON.parse(lastCall().init.body as string).value).toBe("new-val");
    });
});

// ---------------------------------------------------------------------------
// AccessResource
// ---------------------------------------------------------------------------
describe("AccessResource", () => {
    it("grantHuman sends POST with principal_type user", async () => {
        globalThis.fetch = mockFetch(201, { id: "p-1" });
        await new AccessResource(makeHttp()).grantHuman("v-1", "u-1", ["read"]);
        const body = JSON.parse(lastCall().init.body as string);
        expect(body.principal_type).toBe("user");
        expect(body.principal_id).toBe("u-1");
        expect(body.permissions).toEqual(["read"]);
        expect(body.secret_path_pattern).toBe("**");
        expect(lastCall().url).toBe(`${BASE}/v1/vaults/v-1/policies`);
    });

    it("grantAgent sends POST with principal_type agent", async () => {
        globalThis.fetch = mockFetch(201, { id: "p-1" });
        await new AccessResource(makeHttp()).grantAgent("v-1", "a-1", ["read", "write"], {
            secretPathPattern: "keys/*",
            expires_at: "2025-12-31T00:00:00Z",
        });
        const body = JSON.parse(lastCall().init.body as string);
        expect(body.principal_type).toBe("agent");
        expect(body.secret_path_pattern).toBe("keys/*");
        expect(body.expires_at).toBe("2025-12-31T00:00:00Z");
    });

    it("update sends PUT", async () => {
        globalThis.fetch = mockFetch(200, {});
        await new AccessResource(makeHttp()).update("v-1", "p-1", { permissions: ["read"] });
        expect(lastCall().init.method).toBe("PUT");
        expect(lastCall().url).toBe(`${BASE}/v1/vaults/v-1/policies/p-1`);
    });

    it("revoke sends DELETE", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new AccessResource(makeHttp()).revoke("v-1", "p-1");
        expect(lastCall().init.method).toBe("DELETE");
    });

    it("listGrants sends GET", async () => {
        globalThis.fetch = mockFetch(200, { policies: [] });
        await new AccessResource(makeHttp()).listGrants("v-1");
        expect(lastCall().url).toBe(`${BASE}/v1/vaults/v-1/policies`);
    });
});

// ---------------------------------------------------------------------------
// AgentsResource
// ---------------------------------------------------------------------------
describe("AgentsResource", () => {
    it("create sends POST /v1/agents", async () => {
        globalThis.fetch = mockFetch(201, { agent: { id: "a-1" }, api_key: "ocv_xxx" });
        const res = await new AgentsResource(makeHttp()).create({
            name: "bot",
            crypto_proxy_enabled: true,
            tx_max_value_eth: "0.5",
        });
        const body = JSON.parse(lastCall().init.body as string);
        expect(body.name).toBe("bot");
        expect(body.crypto_proxy_enabled).toBe(true);
        expect(body.tx_max_value_eth).toBe("0.5");
        expect(res.data?.api_key).toBe("ocv_xxx");
    });

    it("get sends GET /v1/agents/{id}", async () => {
        globalThis.fetch = mockFetch(200, { id: "a-1" });
        await new AgentsResource(makeHttp()).get("a-1");
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1`);
    });

    it("list sends GET /v1/agents", async () => {
        globalThis.fetch = mockFetch(200, { agents: [] });
        await new AgentsResource(makeHttp()).list();
        expect(lastCall().url).toBe(`${BASE}/v1/agents`);
    });

    it("update sends PATCH", async () => {
        globalThis.fetch = mockFetch(200, {});
        await new AgentsResource(makeHttp()).update("a-1", { is_active: false });
        expect(lastCall().init.method).toBe("PATCH");
        expect(JSON.parse(lastCall().init.body as string).is_active).toBe(false);
    });

    it("delete sends DELETE", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new AgentsResource(makeHttp()).delete("a-1");
        expect(lastCall().init.method).toBe("DELETE");
    });

    it("rotateKey sends POST to /rotate-key", async () => {
        globalThis.fetch = mockFetch(200, { api_key: "ocv_new" });
        const res = await new AgentsResource(makeHttp()).rotateKey("a-1");
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/rotate-key`);
        expect(res.data?.api_key).toBe("ocv_new");
    });

    it("submitTransaction sends POST to /transactions", async () => {
        globalThis.fetch = mockFetch(201, { id: "tx-1", status: "signed" });
        await new AgentsResource(makeHttp()).submitTransaction("a-1", {
            to: "0xdead",
            value: "0.01",
            chain: "sepolia",
            simulate_first: true,
        });
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/transactions`);
        const body = JSON.parse(lastCall().init.body as string);
        expect(body.to).toBe("0xdead");
        expect(body.simulate_first).toBe(true);
    });

    it("getTransaction sends GET to /transactions/{txId}", async () => {
        globalThis.fetch = mockFetch(200, { id: "tx-1" });
        await new AgentsResource(makeHttp()).getTransaction("a-1", "tx-1");
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/transactions/tx-1`);
    });

    it("listTransactions sends GET to /transactions", async () => {
        globalThis.fetch = mockFetch(200, { transactions: [] });
        await new AgentsResource(makeHttp()).listTransactions("a-1");
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/transactions`);
    });

    it("simulateTransaction sends POST to /transactions/simulate", async () => {
        globalThis.fetch = mockFetch(200, { simulation_id: "sim-1", status: "success" });
        await new AgentsResource(makeHttp()).simulateTransaction("a-1", {
            to: "0xdead",
            value: "0.01",
            chain: "sepolia",
        });
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/transactions/simulate`);
    });

    it("simulateBundle sends POST to /transactions/simulate-bundle", async () => {
        globalThis.fetch = mockFetch(200, { simulations: [] });
        await new AgentsResource(makeHttp()).simulateBundle("a-1", {
            transactions: [{ to: "0xdead", value: "0.01", chain: "sepolia" }],
        });
        expect(lastCall().url).toBe(`${BASE}/v1/agents/a-1/transactions/simulate-bundle`);
    });
});

// ---------------------------------------------------------------------------
// ChainsResource
// ---------------------------------------------------------------------------
describe("ChainsResource", () => {
    it("list sends GET /v1/chains", async () => {
        globalThis.fetch = mockFetch(200, { chains: [] });
        await new ChainsResource(makeHttp()).list();
        expect(lastCall().url).toBe(`${BASE}/v1/chains`);
    });

    it("get sends GET /v1/chains/{identifier}", async () => {
        globalThis.fetch = mockFetch(200, { name: "ethereum", chain_id: 1 });
        await new ChainsResource(makeHttp()).get("ethereum");
        expect(lastCall().url).toBe(`${BASE}/v1/chains/ethereum`);
    });

    it("adminList sends GET /v1/admin/chains", async () => {
        globalThis.fetch = mockFetch(200, { chains: [] });
        await new ChainsResource(makeHttp()).adminList();
        expect(lastCall().url).toBe(`${BASE}/v1/admin/chains`);
    });

    it("create sends POST /v1/admin/chains", async () => {
        globalThis.fetch = mockFetch(201, {});
        await new ChainsResource(makeHttp()).create({
            name: "optimism",
            display_name: "Optimism",
            chain_id: 10,
        });
        expect(lastCall().init.method).toBe("POST");
        expect(lastCall().url).toBe(`${BASE}/v1/admin/chains`);
    });

    it("update sends PUT /v1/admin/chains/{id}", async () => {
        globalThis.fetch = mockFetch(200, {});
        await new ChainsResource(makeHttp()).update("c-1", { rpc_url: "https://rpc.test" });
        expect(lastCall().init.method).toBe("PUT");
    });

    it("delete sends DELETE /v1/admin/chains/{id}", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new ChainsResource(makeHttp()).delete("c-1");
        expect(lastCall().init.method).toBe("DELETE");
    });
});

// ---------------------------------------------------------------------------
// SharingResource
// ---------------------------------------------------------------------------
describe("SharingResource", () => {
    it("create sends POST /v1/secrets/{id}/share", async () => {
        globalThis.fetch = mockFetch(201, { id: "sh-1", share_url: "https://..." });
        await new SharingResource(makeHttp()).create("s-1", {
            recipient_type: "user",
            recipient_id: "u-1",
            expires_at: "2025-12-31T00:00:00Z",
        });
        expect(lastCall().url).toBe(`${BASE}/v1/secrets/s-1/share`);
        expect(lastCall().init.method).toBe("POST");
    });

    it("access sends GET /v1/share/{shareId}", async () => {
        globalThis.fetch = mockFetch(200, { value: "shared-secret" });
        await new SharingResource(makeHttp()).access("sh-1");
        expect(lastCall().url).toBe(`${BASE}/v1/share/sh-1`);
    });

    it("listOutbound sends GET /v1/shares/outbound", async () => {
        globalThis.fetch = mockFetch(200, { shares: [] });
        await new SharingResource(makeHttp()).listOutbound();
        expect(lastCall().url).toBe(`${BASE}/v1/shares/outbound`);
    });

    it("listInbound sends GET /v1/shares/inbound", async () => {
        globalThis.fetch = mockFetch(200, { shares: [] });
        await new SharingResource(makeHttp()).listInbound();
        expect(lastCall().url).toBe(`${BASE}/v1/shares/inbound`);
    });

    it("accept sends POST /v1/shares/{id}/accept", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new SharingResource(makeHttp()).accept("sh-1");
        expect(lastCall().url).toBe(`${BASE}/v1/shares/sh-1/accept`);
    });

    it("decline sends POST /v1/shares/{id}/decline", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new SharingResource(makeHttp()).decline("sh-1");
        expect(lastCall().url).toBe(`${BASE}/v1/shares/sh-1/decline`);
    });

    it("revoke sends DELETE /v1/share/{id}", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new SharingResource(makeHttp()).revoke("sh-1");
        expect(lastCall().url).toBe(`${BASE}/v1/share/sh-1`);
        expect(lastCall().init.method).toBe("DELETE");
    });
});

// ---------------------------------------------------------------------------
// ApprovalsResource
// ---------------------------------------------------------------------------
describe("ApprovalsResource", () => {
    it("request sends POST /v1/approvals", async () => {
        globalThis.fetch = mockFetch(201, { id: "apr-1", status: "pending" });
        await new ApprovalsResource(makeHttp()).request({
            vault_id: "v-1",
            secret_path: "keys/master",
        });
        expect(lastCall().init.method).toBe("POST");
    });

    it("list sends GET /v1/approvals with optional status", async () => {
        globalThis.fetch = mockFetch(200, { approvals: [] });
        await new ApprovalsResource(makeHttp()).list("pending");
        const url = new URL(lastCall().url);
        expect(url.searchParams.get("status")).toBe("pending");
    });

    it("approve sends POST /v1/approvals/{id}/approve", async () => {
        globalThis.fetch = mockFetch(200, { status: "approved" });
        await new ApprovalsResource(makeHttp()).approve("apr-1");
        expect(lastCall().url).toBe(`${BASE}/v1/approvals/apr-1/approve`);
    });

    it("deny sends POST /v1/approvals/{id}/deny", async () => {
        globalThis.fetch = mockFetch(200, { status: "denied" });
        await new ApprovalsResource(makeHttp()).deny("apr-1", "not authorized");
        expect(JSON.parse(lastCall().init.body as string)).toEqual({ reason: "not authorized" });
    });

    it("check sends GET /v1/approvals/{id}", async () => {
        globalThis.fetch = mockFetch(200, { id: "apr-1", status: "pending" });
        await new ApprovalsResource(makeHttp()).check("apr-1");
        expect(lastCall().url).toBe(`${BASE}/v1/approvals/apr-1`);
    });

    it("subscribe polls and calls back, returns unsubscribe function", async () => {
        vi.useFakeTimers();
        const callback = vi.fn();
        const approvals = [{ id: "a-1", status: "pending" }];
        globalThis.fetch = mockFetch(200, { approvals });

        const unsub = new ApprovalsResource(makeHttp()).subscribe(callback, { intervalMs: 100 });

        await vi.advanceTimersByTimeAsync(50);
        expect(callback).toHaveBeenCalledWith(approvals);

        unsub();
        vi.useRealTimers();
    });
});

// ---------------------------------------------------------------------------
// BillingResource
// ---------------------------------------------------------------------------
describe("BillingResource", () => {
    it("usage sends GET /v1/billing/usage", async () => {
        globalThis.fetch = mockFetch(200, { billing_tier: "free" });
        await new BillingResource(makeHttp()).usage();
        expect(lastCall().url).toBe(`${BASE}/v1/billing/usage`);
    });

    it("history sends GET /v1/billing/history with optional limit", async () => {
        globalThis.fetch = mockFetch(200, { events: [] });
        await new BillingResource(makeHttp()).history(25);
        const url = new URL(lastCall().url);
        expect(url.searchParams.get("limit")).toBe("25");
    });

    it("history omits limit when not provided", async () => {
        globalThis.fetch = mockFetch(200, { events: [] });
        await new BillingResource(makeHttp()).history();
        const url = new URL(lastCall().url);
        expect(url.searchParams.has("limit")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// AuditResource
// ---------------------------------------------------------------------------
describe("AuditResource", () => {
    it("query sends GET /v1/audit/events with filters as query params", async () => {
        globalThis.fetch = mockFetch(200, { events: [], count: 0 });
        await new AuditResource(makeHttp()).query({
            resource_id: "v-1",
            action: "secret.read",
            limit: 10,
            offset: 5,
        });
        const url = new URL(lastCall().url);
        expect(url.pathname).toBe("/v1/audit/events");
        expect(url.searchParams.get("resource_id")).toBe("v-1");
        expect(url.searchParams.get("action")).toBe("secret.read");
        expect(url.searchParams.get("limit")).toBe("10");
        expect(url.searchParams.get("offset")).toBe("5");
    });

    it("query with no filters sends bare request", async () => {
        globalThis.fetch = mockFetch(200, { events: [], count: 0 });
        await new AuditResource(makeHttp()).query();
        const url = new URL(lastCall().url);
        expect(url.search).toBe("");
    });
});

// ---------------------------------------------------------------------------
// OrgResource
// ---------------------------------------------------------------------------
describe("OrgResource", () => {
    it("listMembers sends GET /v1/org/members", async () => {
        globalThis.fetch = mockFetch(200, { members: [] });
        await new OrgResource(makeHttp()).listMembers();
        expect(lastCall().url).toBe(`${BASE}/v1/org/members`);
    });

    it("updateMemberRole sends PATCH /v1/org/members/{userId}", async () => {
        globalThis.fetch = mockFetch(200, {});
        await new OrgResource(makeHttp()).updateMemberRole("u-1", "admin");
        expect(lastCall().init.method).toBe("PATCH");
        expect(lastCall().url).toBe(`${BASE}/v1/org/members/u-1`);
        expect(JSON.parse(lastCall().init.body as string)).toEqual({ role: "admin" });
    });

    it("removeMember sends DELETE /v1/org/members/{userId}", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new OrgResource(makeHttp()).removeMember("u-1");
        expect(lastCall().init.method).toBe("DELETE");
    });
});

// ---------------------------------------------------------------------------
// AuthResource
// ---------------------------------------------------------------------------
describe("AuthResource", () => {
    it("login sends POST /v1/auth/token and stores JWT", async () => {
        globalThis.fetch = mockFetch(200, { access_token: "jwt-123", token_type: "bearer", expires_in: 3600 });
        const http = makeHttp("");
        const res = await new AuthResource(http).login({ email: "a@b.co", password: "p" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/token`);
        expect(http.getToken()).toBe("jwt-123");
        expect(res.data?.access_token).toBe("jwt-123");
    });

    it("signup sends POST /v1/auth/signup and stores JWT", async () => {
        globalThis.fetch = mockFetch(200, { access_token: "jwt-new" });
        const http = makeHttp("");
        await new AuthResource(http).signup({ email: "a@b.co", password: "p", display_name: "A" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/signup`);
        expect(http.getToken()).toBe("jwt-new");
    });

    it("agentToken sends POST /v1/auth/agent-token", async () => {
        globalThis.fetch = mockFetch(200, { access_token: "agent-jwt" });
        const http = makeHttp("");
        await new AuthResource(http).agentToken({ agent_id: "a-1", api_key: "ocv_x" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/agent-token`);
        expect(http.getToken()).toBe("agent-jwt");
    });

    it("apiKeyToken sends POST /v1/auth/api-key-token", async () => {
        globalThis.fetch = mockFetch(200, { access_token: "key-jwt" });
        const http = makeHttp("");
        await new AuthResource(http).apiKeyToken({ api_key: "ocv_x" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/api-key-token`);
        expect(http.getToken()).toBe("key-jwt");
    });

    it("google sends POST /v1/auth/google", async () => {
        globalThis.fetch = mockFetch(200, { access_token: "g-jwt" });
        const http = makeHttp("");
        await new AuthResource(http).google({ id_token: "google-id" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/google`);
    });

    it("changePassword sends POST /v1/auth/change-password", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new AuthResource(makeHttp()).changePassword({
            current_password: "old",
            new_password: "new",
        });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/change-password`);
    });

    it("logout sends DELETE /v1/auth/token and clears JWT", async () => {
        globalThis.fetch = mockFetch(204, null);
        const http = makeHttp("active-jwt");
        await new AuthResource(http).logout();
        expect(lastCall().init.method).toBe("DELETE");
        expect(http.getToken()).toBe("");
    });
});

// ---------------------------------------------------------------------------
// ApiKeysResource
// ---------------------------------------------------------------------------
describe("ApiKeysResource", () => {
    it("create sends POST /v1/auth/api-keys", async () => {
        globalThis.fetch = mockFetch(201, { key: { id: "k-1" }, api_key: "1ck_xxx" });
        const res = await new ApiKeysResource(makeHttp()).create({ name: "ci-key" });
        expect(lastCall().url).toBe(`${BASE}/v1/auth/api-keys`);
        expect(res.data?.api_key).toBe("1ck_xxx");
    });

    it("list sends GET /v1/auth/api-keys", async () => {
        globalThis.fetch = mockFetch(200, { keys: [] });
        await new ApiKeysResource(makeHttp()).list();
        expect(lastCall().url).toBe(`${BASE}/v1/auth/api-keys`);
    });

    it("revoke sends DELETE /v1/auth/api-keys/{keyId}", async () => {
        globalThis.fetch = mockFetch(204, null);
        await new ApiKeysResource(makeHttp()).revoke("k-1");
        expect(lastCall().init.method).toBe("DELETE");
        expect(lastCall().url).toBe(`${BASE}/v1/auth/api-keys/k-1`);
    });
});
