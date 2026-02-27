// Client
export { OneclawClient, createClient } from "./core/client";

// Core internals (for advanced usage)
export { HttpClient } from "./core/http";

// Resource modules
export { VaultResource } from "./resources/vault";
export { SecretsResource } from "./resources/secrets";
export { AccessResource } from "./resources/access";
export { AgentsResource } from "./resources/agents";
export { SharingResource } from "./resources/sharing";
export { ApprovalsResource } from "./resources/approvals";
export { BillingResource } from "./resources/billing";
export { AuditResource } from "./resources/audit";
export { OrgResource } from "./resources/org";
export { AuthResource } from "./resources/auth";
export { ApiKeysResource } from "./resources/api-keys";
export { ChainsResource } from "./resources/chains";
export { X402Resource } from "./resources/x402";

// CMEK (Customer-Managed Encryption Keys)
export {
    generateCmekKey,
    cmekFingerprint,
    cmekEncrypt,
    cmekDecrypt,
    toBase64,
    fromBase64,
} from "./cmek";

// Errors
export {
    OneclawError,
    AuthError,
    ResourceLimitExceededError,
    PaymentRequiredError,
    ApprovalRequiredError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ServerError,
} from "./core/errors";

// Plugin interfaces
export type {
    CryptoProvider,
    KeyMaterial,
    AuditSink,
    AuditSinkEvent,
    PolicyEngine,
    PolicyContext,
    PolicyDecision,
    PluginRegistry,
} from "./plugins";

// Types
export type {
    OneclawClientConfig,
    OneclawResponse,
    ResponseMeta,
    // Auth
    TokenRequest,
    AgentTokenRequest,
    UserApiKeyTokenRequest,
    GoogleAuthRequest,
    SignupRequest,
    TokenResponse,
    ChangePasswordRequest,
    // Account management
    UserProfileResponse,
    UpdateProfileRequest,
    DeleteAccountRequest,
    // API Keys
    CreateApiKeyRequest,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyListResponse,
    // Vaults
    CreateVaultRequest,
    EnableCmekRequest,
    CmekRotationJobResponse,
    VaultResponse,
    VaultListResponse,
    // Secrets
    PutSecretRequest,
    SecretMetadataResponse,
    SecretResponse,
    SecretListResponse,
    // Policies
    CreatePolicyRequest,
    UpdatePolicyRequest,
    PolicyResponse,
    PolicyListResponse,
    // Agents
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentResponse,
    AgentCreatedResponse,
    AgentListResponse,
    AgentKeyRotatedResponse,
    AgentSelfResponse,
    // Chains
    ChainResponse,
    ChainListResponse,
    CreateChainRequest,
    UpdateChainRequest,
    // Transactions (Intents API)
    SubmitTransactionRequest,
    SimulateTransactionRequest,
    SimulateBundleRequest,
    SimulateBundleItem,
    SimulationResponse,
    BundleSimulationResponse,
    BalanceChange,
    TransactionResponse,
    TransactionListResponse,
    // Sharing
    CreateShareRequest,
    ShareResponse,
    SharedSecretResponse,
    // Organization
    OrgMemberResponse,
    OrgMemberListResponse,
    UpdateMemberRoleRequest,
    // Billing
    MonthSummary,
    UsageSummaryResponse,
    UsageEventResponse,
    UsageHistoryResponse,
    // Audit
    AuditQuery,
    AuditEvent,
    AuditEventsResponse,
    // x402
    PaymentAccept,
    PaymentRequirement,
    PaymentPayload,
    PaymentReceipt,
    X402Signer,
    // Approvals
    ApprovalRequest,
    CreateApprovalRequest,
    ApprovalListResponse,
    // Admin
    SettingResponse,
    SettingsListResponse,
    X402ConfigResponse,
    // Health
    HealthResponse,
    // MCP
    McpToolDefinition,
    McpToolResult,
    // Generated OpenAPI types (raw spec access)
    paths,
    components,
    operations,
    ApiSchemas,
} from "./types";
