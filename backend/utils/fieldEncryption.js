import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    randomBytes
} from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

const encryptedPrefix = "enc:v1:";

export function isEncryptedField(value) {
    return typeof value === "string" && value.startsWith(encryptedPrefix);
}

function getEncryptionKey() {
    const key = process.env.FIELD_ENCRYPTION_KEY;
    if (!/^[\da-f]{64}$/iu.test(key || "")) {
        throw new Error("FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key.");
    }
    return Buffer.from(key, "hex");
}

export function encryptField(value) {
    if (typeof value !== "string" || isEncryptedField(value)) return value;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${encryptedPrefix}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(value) {
    if (typeof value !== "string" || !isEncryptedField(value)) return value;
    const parts = value.slice(encryptedPrefix.length).split(":");
    const [ivHex, tagHex, encryptedHex] = parts;
    if (parts.length !== 3 || !ivHex || !tagHex || encryptedHex === undefined) {
        throw new Error("Stored encrypted profile data has an invalid format.");
    }
    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final()
    ]).toString("utf8");
}

export function createLookupHash(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const lookupKey = createHmac("sha256", getEncryptionKey())
        .update("smartexam-blind-index-v1")
        .digest();
    return createHmac("sha256", lookupKey)
        .update(value.normalize("NFKC").trim().toLocaleLowerCase("en"))
        .digest("hex");
}

export function createNameSearchTokens(value) {
    if (typeof value !== "string") return [];
    const tokens = value.normalize("NFKC").trim().toLocaleLowerCase("en")
        .split(/\s+/u)
        .filter(Boolean);
    return [...new Set(tokens.map(createLookupHash))];
}
