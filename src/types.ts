export interface OneClawConfig {
  baseUrl: string;
  apiKey?: string;
  walletPrivateKey?: string;
  network?: string;
  maxPaymentPerRequest?: number;
}

export interface VaultResponse {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_by_type: string;
  created_at: string;
}

export interface SecretResponse {
  id: string;
  path: string;
  type: string;
  value: string;
  version: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

export interface ShareOptions {
  recipient_type: string;
  recipient_id?: string;
  max_access_count?: number;
  expires_at: string;
  passphrase?: string;
  ip_allowlist?: string[];
}

export interface PolicyResponse {
  id: string;
  vault_id: string;
  secret_path_pattern: string;
  principal_type: string;
  principal_id: string;
  permissions: string[];
  conditions: Record<string, unknown>;
  expires_at?: string;
  created_by: string;
  created_by_type: string;
  created_at: string;
}

export interface PaymentRequired {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    payTo: string;
    price: string;
    requiredDeadlineSeconds: number;
  }>;
  description: string;
}
