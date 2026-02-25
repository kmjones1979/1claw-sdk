/**
 * Key material returned by a CryptoProvider's key generation.
 */
export interface KeyMaterial {
    /** The raw key bytes, base64-encoded. */
    key: string;
    /** Provider-specific key identifier (e.g. KMS key ARN, GCP key path). */
    keyId?: string;
    /** Algorithm used (e.g. "AES-256-GCM", "RSA-OAEP-256"). */
    algorithm?: string;
}

/**
 * Interface for client-side encryption providers.
 *
 * The default behavior (no provider) delegates all encryption to the
 * server-side HSM. Implement this interface to add client-side encryption
 * before secrets reach the API, or to integrate with external KMS services.
 *
 * @example
 * ```ts
 * import type { CryptoProvider, KeyMaterial } from "@1claw/sdk";
 *
 * class AwsKmsProvider implements CryptoProvider {
 *   async encrypt(plaintext: Uint8Array): Promise<Uint8Array> { ... }
 *   async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> { ... }
 *   async generateKey(): Promise<KeyMaterial> { ... }
 * }
 * ```
 */
export interface CryptoProvider {
    /** Encrypt plaintext bytes, returning ciphertext bytes. */
    encrypt(plaintext: Uint8Array): Promise<Uint8Array>;

    /** Decrypt ciphertext bytes, returning plaintext bytes. */
    decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;

    /** Generate a new encryption key and return key material. */
    generateKey(): Promise<KeyMaterial>;
}
