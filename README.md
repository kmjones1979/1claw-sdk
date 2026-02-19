# @1claw/sdk

TypeScript SDK for 1Claw Vault — secret management for AI agents.

## Install

```bash
npm install @1claw/sdk
```

## Usage

```typescript
import { OneClawClient } from "@1claw/sdk";

const client = new OneClawClient({
  baseUrl: "https://vault.your-domain.com",
  apiKey: "your-agent-api-key",
});

// Authenticate (exchanges API key for a short-lived JWT)
await client.authenticate("agent-uuid-here");

// Read a secret
const secret = await client.getSecret("vault-id", "database/password");
console.log(secret.value); // decrypted plaintext

// Store a secret
await client.putSecret("vault-id", "services/openai-key", "sk-...", "api_key");

// Delete a secret
await client.deleteSecret("vault-id", "old/unused-key");

// List vaults
const vaults = await client.listVaults();

// Create a vault (agents auto-share with their human creator)
const vault = await client.createVault("stripe-keys", "Production Stripe credentials");

// Grant access to another user or agent
await client.grantAccess(vault.id, "user", "user-uuid", ["read"]);

// Share a secret
const shareId = await client.shareSecret("secret-id", {
  recipient_type: "agent",
  recipient_id: "other-agent-uuid",
  expires_at: "2025-12-31T00:00:00Z",
  max_access_count: 5,
});
```

## Configuration

```typescript
const client = new OneClawClient({
  baseUrl: "https://vault.your-domain.com",   // Required
  apiKey: "your-agent-api-key",               // For agent auth
  maxPaymentPerRequest: 0.01,                 // Safety cap for x402 (USD)
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | (required) | Vault API URL |
| `apiKey` | `string` | — | Agent API key for authentication |
| `walletPrivateKey` | `string` | — | Private key for x402 payments (future) |
| `network` | `string` | — | Blockchain network for x402 (future) |
| `maxPaymentPerRequest` | `number` | `1.0` | Max USD per request safety limit |

## x402 Payment Handling

When the vault API returns `402 Payment Required` (after free tier is exhausted and no JWT is present), the SDK:

1. Parses the x402 `PaymentRequired` response
2. Checks the price against `maxPaymentPerRequest` safety limit
3. Signs and submits payment (when wallet support is implemented)

Currently, x402 wallet payment is not yet implemented — the SDK throws an informative error explaining the price and suggesting API key authentication as an alternative.

## API Methods

| Method | Description |
|---|---|
| `authenticate(agentId, apiKey?)` | Exchange API key for JWT |
| `getSecret(vaultId, path)` | Read and decrypt a secret |
| `putSecret(vaultId, path, value, type?, metadata?)` | Store or update a secret |
| `deleteSecret(vaultId, path)` | Delete a secret |
| `listVaults()` | List all accessible vaults |
| `createVault(name, description?)` | Create a new vault (agents auto-share with creator) |
| `grantAccess(vaultId, principalType, principalId, permissions?, pathPattern?)` | Grant access to a vault |
| `shareSecret(secretId, options)` | Create a share link |

## Building

```bash
cd packages/sdk
pnpm install
pnpm build    # Outputs to dist/
```

## License

[PolyForm Noncommercial 1.0.0](../../LICENSE)
