/**
 * Client-side CMEK (Customer-Managed Encryption Key) utilities.
 *
 * Wire format:
 *   [1 byte version = 0x01][12 bytes IV][N bytes ciphertext + 16 bytes GCM tag]
 *
 * The key never leaves the client. Only its SHA-256 fingerprint is sent to the
 * server so the vault can track which key was used without knowing the key.
 *
 * Works in browsers (WebCrypto) and Node.js 18+ (globalThis.crypto).
 */

const VERSION_BYTE = 0x01;
const IV_LENGTH = 12;
const KEY_LENGTH = 32; // AES-256

/**
 * Generate a random 256-bit AES-GCM key.
 * Returns the raw key bytes as a Uint8Array (32 bytes).
 */
export async function generateCmekKey(): Promise<Uint8Array> {
    const key = new Uint8Array(KEY_LENGTH);
    crypto.getRandomValues(key);
    return key;
}

/**
 * Compute the SHA-256 fingerprint of a CMEK key.
 * Returns a 64-character lowercase hex string.
 */
export async function cmekFingerprint(key: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", key);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Encrypt plaintext with a CMEK key using AES-256-GCM.
 * Returns the versioned wire-format blob as a Uint8Array.
 */
export async function cmekEncrypt(
    plaintext: Uint8Array,
    keyBytes: Uint8Array,
): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
    );

    const iv = new Uint8Array(IV_LENGTH);
    crypto.getRandomValues(iv);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        plaintext,
    );

    const result = new Uint8Array(1 + IV_LENGTH + ciphertext.byteLength);
    result[0] = VERSION_BYTE;
    result.set(iv, 1);
    result.set(new Uint8Array(ciphertext), 1 + IV_LENGTH);
    return result;
}

/**
 * Decrypt a CMEK wire-format blob with the key.
 * Returns the original plaintext as a Uint8Array.
 */
export async function cmekDecrypt(
    blob: Uint8Array,
    keyBytes: Uint8Array,
): Promise<Uint8Array> {
    if (blob.length < 1 + IV_LENGTH + 16) {
        throw new Error("CMEK blob too short");
    }
    if (blob[0] !== VERSION_BYTE) {
        throw new Error(`Unsupported CMEK version: ${blob[0]}`);
    }

    const iv = blob.slice(1, 1 + IV_LENGTH);
    const ciphertext = blob.slice(1 + IV_LENGTH);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
    );

    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext,
    );

    return new Uint8Array(plaintext);
}

/**
 * Encode a Uint8Array to a base64 string.
 * Works in browsers and Node.js 18+.
 */
export function toBase64(data: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(data).toString("base64");
    }
    let binary = "";
    for (const byte of data) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Decode a base64 string to a Uint8Array.
 * Works in browsers and Node.js 18+.
 */
export function fromBase64(b64: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(b64, "base64"));
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
