import type { HttpClient } from "../core/http";
import type {
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentResponse,
    AgentCreatedResponse,
    AgentListResponse,
    AgentKeyRotatedResponse,
    SubmitTransactionRequest,
    SimulateTransactionRequest,
    SimulateBundleRequest,
    SimulationResponse,
    BundleSimulationResponse,
    TransactionResponse,
    TransactionListResponse,
    OneclawResponse,
} from "../types";

/**
 * Agents resource — register, manage, and rotate keys for AI agents
 * that interact with the vault programmatically.
 */
export class AgentsResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Register a new agent. Returns the agent record and a one-time API key.
     * Store the API key securely — it cannot be retrieved again.
     */
    async create(
        options: CreateAgentRequest,
    ): Promise<OneclawResponse<AgentCreatedResponse>> {
        return this.http.request<AgentCreatedResponse>("POST", "/v1/agents", {
            body: options,
        });
    }

    /** Fetch a single agent by ID. */
    async get(agentId: string): Promise<OneclawResponse<AgentResponse>> {
        return this.http.request<AgentResponse>("GET", `/v1/agents/${agentId}`);
    }

    /** List all agents in the current organization. */
    async list(): Promise<OneclawResponse<AgentListResponse>> {
        return this.http.request<AgentListResponse>("GET", "/v1/agents");
    }

    /** Update agent name, scopes, active status, expiry, or crypto proxy setting. */
    async update(
        agentId: string,
        update: UpdateAgentRequest,
    ): Promise<OneclawResponse<AgentResponse>> {
        return this.http.request<AgentResponse>(
            "PATCH",
            `/v1/agents/${agentId}`,
            { body: update },
        );
    }

    /** Delete an agent permanently. */
    async delete(agentId: string): Promise<OneclawResponse<void>> {
        return this.http.request<void>("DELETE", `/v1/agents/${agentId}`);
    }

    /**
     * Rotate an agent's API key. Returns the new key — store it securely.
     * The old key is immediately invalidated.
     */
    async rotateKey(
        agentId: string,
    ): Promise<OneclawResponse<AgentKeyRotatedResponse>> {
        return this.http.request<AgentKeyRotatedResponse>(
            "POST",
            `/v1/agents/${agentId}/rotate-key`,
        );
    }

    // ── Crypto Transaction Proxy ───────────────────────────────────────

    /**
     * Submit a transaction intent to be signed by the crypto proxy.
     * The agent must have `crypto_proxy_enabled: true` and a valid
     * signing key stored in an accessible vault.
     *
     * Returns the signed transaction hex and keccak tx hash.
     */
    async submitTransaction(
        agentId: string,
        tx: SubmitTransactionRequest,
    ): Promise<OneclawResponse<TransactionResponse>> {
        return this.http.request<TransactionResponse>(
            "POST",
            `/v1/agents/${agentId}/transactions`,
            { body: tx },
        );
    }

    /** Fetch a single transaction by ID. */
    async getTransaction(
        agentId: string,
        txId: string,
    ): Promise<OneclawResponse<TransactionResponse>> {
        return this.http.request<TransactionResponse>(
            "GET",
            `/v1/agents/${agentId}/transactions/${txId}`,
        );
    }

    /** List recent transactions for an agent. */
    async listTransactions(
        agentId: string,
    ): Promise<OneclawResponse<TransactionListResponse>> {
        return this.http.request<TransactionListResponse>(
            "GET",
            `/v1/agents/${agentId}/transactions`,
        );
    }

    // ── Transaction Simulation ─────────────────────────────────────────

    /**
     * Simulate a transaction via Tenderly without signing or broadcasting.
     * Returns balance changes, gas estimates, and success/revert status.
     */
    async simulateTransaction(
        agentId: string,
        tx: SimulateTransactionRequest,
    ): Promise<OneclawResponse<SimulationResponse>> {
        return this.http.request<SimulationResponse>(
            "POST",
            `/v1/agents/${agentId}/transactions/simulate`,
            { body: tx },
        );
    }

    /**
     * Simulate a bundle of transactions sequentially (e.g. approve + swap).
     */
    async simulateBundle(
        agentId: string,
        bundle: SimulateBundleRequest,
    ): Promise<OneclawResponse<BundleSimulationResponse>> {
        return this.http.request<BundleSimulationResponse>(
            "POST",
            `/v1/agents/${agentId}/transactions/simulate-bundle`,
            { body: bundle },
        );
    }
}
