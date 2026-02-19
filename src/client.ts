import type {
  OneClawConfig,
  SecretResponse,
  VaultResponse,
  PolicyResponse,
  ShareOptions,
  PaymentRequired,
} from "./types";

export class OneClawClient {
  private baseUrl: string;
  private apiKey?: string;
  private token?: string;
  private maxPaymentPerRequest: number;

  constructor(config: OneClawConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.maxPaymentPerRequest = config.maxPaymentPerRequest ?? 1.0;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Authenticate with API key to get a JWT token
   */
  async authenticate(agentId: string, apiKey?: string): Promise<void> {
    const key = apiKey || this.apiKey;
    if (!key) throw new Error("API key required for authentication");

    const response = await fetch(`${this.baseUrl}/v1/auth/agent-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: agentId, api_key: key }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.token = data.access_token;
  }

  /**
   * Fetch with automatic 402 payment handling
   */
  private async fetchWithPayment(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (response.status === 402) {
      const paymentRequired: PaymentRequired = await response.json();

      // Check price safety limit
      const price = parseFloat(paymentRequired.accepts[0]?.price || "0");
      if (price > this.maxPaymentPerRequest) {
        throw new Error(
          `Payment of $${price} exceeds max allowed $${this.maxPaymentPerRequest}`
        );
      }

      // TODO: Implement actual x402 payment signing with wallet
      // For now, throw an informative error
      throw new Error(
        `Payment required: $${price} USDC. ` +
          `x402 wallet payment not yet implemented in SDK. ` +
          `Use an API key to authenticate instead.`
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error((error as { detail?: string }).detail || `HTTP ${response.status}`);
    }

    return response;
  }

  /**
   * Get a decrypted secret value
   */
  async getSecret(vaultId: string, path: string): Promise<SecretResponse> {
    const response = await this.fetchWithPayment(
      `${this.baseUrl}/v1/vaults/${vaultId}/secrets/${path}`
    );
    return response.json();
  }

  /**
   * Store or update a secret
   */
  async putSecret(
    vaultId: string,
    path: string,
    value: string,
    type: string = "api_key",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.fetchWithPayment(
      `${this.baseUrl}/v1/vaults/${vaultId}/secrets/${path}`,
      {
        method: "PUT",
        body: JSON.stringify({ type, value, metadata }),
      }
    );
  }

  /**
   * Delete a secret
   */
  async deleteSecret(vaultId: string, path: string): Promise<void> {
    await this.fetchWithPayment(
      `${this.baseUrl}/v1/vaults/${vaultId}/secrets/${path}`,
      { method: "DELETE" }
    );
  }

  /**
   * List vaults
   */
  async listVaults(): Promise<VaultResponse[]> {
    const response = await this.fetchWithPayment(`${this.baseUrl}/v1/vaults`);
    const data = await response.json();
    return (data as { vaults: VaultResponse[] }).vaults;
  }

  /**
   * Create a new vault
   */
  async createVault(name: string, description?: string): Promise<VaultResponse> {
    const response = await this.fetchWithPayment(`${this.baseUrl}/v1/vaults`, {
      method: "POST",
      body: JSON.stringify({ name, description: description ?? "" }),
    });
    return response.json();
  }

  /**
   * Grant access to a vault by creating an access policy
   */
  async grantAccess(
    vaultId: string,
    principalType: string,
    principalId: string,
    permissions: string[] = ["read"],
    secretPathPattern = "**"
  ): Promise<PolicyResponse> {
    const response = await this.fetchWithPayment(
      `${this.baseUrl}/v1/vaults/${vaultId}/policies`,
      {
        method: "POST",
        body: JSON.stringify({
          secret_path_pattern: secretPathPattern,
          principal_type: principalType,
          principal_id: principalId,
          permissions,
        }),
      }
    );
    return response.json();
  }

  /**
   * Share a secret
   */
  async shareSecret(secretId: string, options: ShareOptions): Promise<string> {
    const response = await this.fetchWithPayment(
      `${this.baseUrl}/v1/secrets/${secretId}/share`,
      {
        method: "POST",
        body: JSON.stringify(options),
      }
    );
    const data = await response.json();
    return (data as { share_url?: string; id?: string }).share_url || (data as { share_url?: string; id?: string }).id || "";
  }
}
