# @1claw/sdk

TypeScript SDK for **1Claw Vault** — HSM-backed secret management for AI agents and humans.

## Install

```bash
npm install @1claw/sdk
```

## Quick Start

```typescript
import { createClient } from "@1claw/sdk";

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "ocv_...", // auto-exchanges for a JWT
});

// List vaults
const { data } = await client.vault.list();
console.log(data?.vaults);

// Store a secret
await client.secrets.set("vault-id", "OPENAI_KEY", "sk-...", {
    type: "api_key",
});

// Retrieve a secret
const secret = await client.secrets.get("vault-id", "OPENAI_KEY");
console.log(secret.data?.value);
```

## Authentication

The SDK supports three authentication modes:

```typescript
// 1. User API key (auto-authenticates)
const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "ocv_...",
});

// 2. Agent with API key (auto-authenticates as agent)
const agent = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "ocv_...",
    agentId: "agent-uuid",
});

// 3. Pre-authenticated JWT
const authed = createClient({
    baseUrl: "https://api.1claw.xyz",
    token: "eyJ...",
});

// Or authenticate manually:
await client.auth.login({ email: "...", password: "..." });
await client.auth.agentToken({ agent_id: "...", api_key: "..." });
await client.auth.google({ id_token: "..." });
```

## API Resources

| Resource           | Methods                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `client.vault`     | `create`, `get`, `list`, `delete`                                                                                   |
| `client.secrets`   | `set`, `get`, `delete`, `list`, `rotate`                                                                            |
| `client.access`    | `grantHuman`, `grantAgent`, `update`, `revoke`, `listGrants`                                                        |
| `client.agents`    | `create`, `getSelf`, `get`, `list`, `update`, `delete`, `rotateKey`, `submitTransaction`, `getTransaction`, `listTransactions`, `simulateTransaction`, `simulateBundle` |
| `client.chains`    | `list`, `get`, `adminList`, `create`, `update`, `delete`                                                            |
| `client.sharing`   | `create`, `access`, `listOutbound`, `listInbound`, `accept`, `decline`, `revoke`                                    |
| `client.approvals` | `request`, `list`, `approve`, `deny`, `check`, `subscribe`                                                          |
| `client.billing`   | `usage`, `history`                                                                                                  |
| `client.audit`     | `query`                                                                                                             |
| `client.org`       | `listMembers`, `updateMemberRole`, `removeMember`                                                                   |
| `client.auth`      | `login`, `signup`, `agentToken`, `apiKeyToken`, `google`, `changePassword`, `logout`, `getMe`, `updateMe`, `deleteMe` |
| `client.apiKeys`   | `create`, `list`, `revoke`                                                                                          |
| `client.x402`      | `getPaymentRequirement`, `pay`, `verifyReceipt`, `withPayment`                                                      |

## Response Envelope

All methods return a typed envelope:

```typescript
interface OneclawResponse<T> {
    data: T | null;
    error: { type: string; message: string; detail?: string } | null;
    meta?: { status: number };
}
```

Check `error` before accessing `data`:

```typescript
const res = await client.secrets.get("vault-id", "key");
if (res.error) {
    console.error(res.error.type, res.error.message);
} else {
    console.log(res.data.value);
}
```

## Error Types

The SDK exports a typed error hierarchy for catch-based flows:

| Error                   | HTTP Status | Description                                           |
| ----------------------- | ----------- | ----------------------------------------------------- |
| `OneclawError`          | any         | Base error class                                      |
| `AuthError`             | 401, 403    | Authentication/authorization failure                  |
| `PaymentRequiredError`  | 402         | x402 payment required (includes `paymentRequirement`) |
| `ResourceLimitExceededError` | 403    | Tier limit reached (vaults, agents, secrets)          |
| `ApprovalRequiredError` | 403         | Human approval gate triggered                         |
| `NotFoundError`         | 404         | Resource not found                                    |
| `RateLimitError`        | 429         | Rate limit exceeded                                   |
| `ValidationError`       | 400         | Invalid request body                                  |
| `ServerError`           | 500+        | Server-side failure                                   |

## Crypto Transaction Proxy

Agents can be granted the ability to sign and broadcast on-chain transactions through a controlled signing proxy. Private keys stay in the HSM — the agent submits intent, the proxy signs and broadcasts.

Toggle `crypto_proxy_enabled` when creating or updating an agent:

```typescript
// Register an agent with crypto proxy access
const { data } = await client.agents.create({
    name: "defi-bot",
    auth_method: "api_key",
    scopes: ["vault:read", "tx:sign"],
    crypto_proxy_enabled: true,
});

// Or enable it later
await client.agents.update(agentId, {
    crypto_proxy_enabled: true,
});

// Check an agent's proxy status
const agent = await client.agents.get(agentId);
console.log(agent.data?.crypto_proxy_enabled); // true
```

### Submitting a transaction

Once `crypto_proxy_enabled` is true and the agent has a signing key stored in an accessible vault, the agent can submit transaction intents:

```typescript
const txRes = await client.agents.submitTransaction(agentId, {
    to: "0x000000000000000000000000000000000000dEaD",
    value: "0.01", // ETH
    chain: "base",
    // Optional: data, signing_key_path, nonce, gas_price, gas_limit
});

console.log(txRes.data?.status); // "signed"
console.log(txRes.data?.tx_hash); // "0x..."
console.log(txRes.data?.signed_tx); // signed raw transaction hex
```

The backend fetches the signing key from the vault, signs the EIP-155 transaction, and returns the signed transaction hex. The signing key is decrypted in-memory, used, and immediately zeroized — it never leaves the server.

Key properties:

- **Disabled by default** — a human must explicitly enable per-agent
- **Signing keys never leave the HSM** — same envelope encryption as secrets
- **Every transaction is audit-logged** with full calldata
- **Revocable instantly** — set `crypto_proxy_enabled: false` to cut off access

## x402 Payment Protocol

When free-tier limits are exceeded, the API returns `402 Payment Required`. The SDK can automatically handle payments if you provide a signer:

```typescript
import { createClient, type X402Signer } from "@1claw/sdk";

const signer: X402Signer = {
    getAddress: async () => "0x...",
    signPayment: async (accept) => {
        // Sign EIP-712 payment with your wallet library (ethers, viem, etc.)
        return signedPayloadHex;
    },
};

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "ocv_...",
    x402Signer: signer,
    maxAutoPayUsd: 0.01, // auto-pay up to $0.01 per request
});

// Or use the explicit pay-and-fetch flow:
const secret = await client.x402.withPayment("vault-id", "key", signer);
```

## Plugins

The SDK supports optional plugin interfaces for extending behavior without modifying the core:

```typescript
import { createClient } from "@1claw/sdk";
import type { CryptoProvider, AuditSink, PolicyEngine } from "@1claw/sdk";

const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: "ocv_...",
    plugins: {
        cryptoProvider: myAwsKmsProvider,
        auditSink: mySplunkSink,
        policyEngine: myOpaEngine,
    },
});
```

| Interface        | Purpose                                                      | Default behavior              |
| ---------------- | ------------------------------------------------------------ | ----------------------------- |
| `CryptoProvider` | Client-side encryption (encrypt, decrypt, generateKey)       | Server-side HSM (no-op)       |
| `AuditSink`      | Forward SDK events to external systems (Splunk, Datadog)     | No-op (server handles audit)  |
| `PolicyEngine`   | Pre-evaluate policies locally before API calls               | No-op (server enforces)       |

Implement any interface in your own package — no PRs to the SDK needed.

## OpenAPI Types

The SDK's request types are generated from the [OpenAPI spec](https://github.com/1clawAI/1claw-openapi-spec). Advanced users can access the raw generated types:

```typescript
import type { paths, components, operations, ApiSchemas } from "@1claw/sdk";

// Access any schema from the spec
type Vault = ApiSchemas["VaultResponse"];
type Agent = ApiSchemas["AgentResponse"];
```

Regenerate types after spec changes: `npm run generate`

## MCP Integration (AI Agents)

The SDK exposes MCP-compatible tool definitions for AI agents:

```typescript
import { getMcpToolDefinitions, McpHandler } from "@1claw/sdk/mcp";
import { createClient } from "@1claw/sdk";

// Get tool definitions for your agent's tool registry
const tools = getMcpToolDefinitions();
// → 1claw_get_secret, 1claw_set_secret, 1claw_list_secret_keys, etc.

// Dispatch tool calls from your agent
const client = createClient({ baseUrl: "...", token: "..." });
const handler = new McpHandler(client);
const result = await handler.handle("1claw_get_secret", {
    vault_id: "...",
    key: "OPENAI_KEY",
});
```

### With Vercel AI SDK

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@1claw/sdk";

const client = createClient({ baseUrl: "...", apiKey: "..." });

export const oneclawTools = {
    getSecret: tool({
        description: "Fetch a secret from the 1claw vault",
        parameters: z.object({
            vaultId: z.string(),
            key: z.string(),
        }),
        execute: async ({ vaultId, key }) => {
            const res = await client.secrets.get(vaultId, key);
            if (res.error) return { error: res.error.message };
            return { status: "available", hint: `Secret retrieved (${key})` };
        },
    }),
};
```

## License

PolyForm Noncommercial 1.0.0
