import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ALLOWED_FIELDS = new Set([
  "idTxn",
  "user",
  "date",
  "value",
  "paymentMethod",
  "ip",
  "state",
]);

export function validateTransactionHash(transaction) {
  const algorithm = (process.env.HASH_ALGORITHM || "sha256").toLowerCase();
  if (algorithm !== "sha256" && algorithm !== "hmac-sha256") {
    throw new Error("HASH_ALGORITHM debe ser sha256 o hmac-sha256.");
  }
  const encoding = (process.env.HASH_ENCODING || "hex").toLowerCase();
  if (encoding !== "hex" && encoding !== "base64") {
    throw new Error("HASH_ENCODING debe ser hex o base64.");
  }

  const fields = (process.env.HASH_FIELDS ||
    "idTxn,user,date,value,paymentMethod")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  if (
    fields.length === 0 ||
    fields.some((field) => !ALLOWED_FIELDS.has(field))
  ) {
    throw new Error(
      "HASH_FIELDS contiene campos no admitidos o está vacío.",
    );
  }

  const canonicalTransaction = {};
  for (const field of fields) {
    if (transaction[field] === undefined || transaction[field] === null) {
      throw new Error(`Falta el campo ${field} configurado en HASH_FIELDS.`);
    }
    canonicalTransaction[field] = transaction[field];
  }

  const serialized = JSON.stringify(canonicalTransaction);
  let digest;

  if (algorithm === "hmac-sha256") {
    const secret = process.env.HASH_SECRET;
    if (!secret) {
      throw new Error("HASH_SECRET es obligatorio con hmac-sha256.");
    }
    digest = createHmac("sha256", secret).update(serialized);
  } else {
    digest = createHash("sha256").update(serialized);
  }

  const expectedBuffer = Buffer.from(digest.digest(encoding), "utf8");
  const providedHash = String(transaction.hash || "").trim();
  const normalizedHash = encoding === "hex" ? providedHash.toLowerCase() : providedHash;
  const providedBuffer = Buffer.from(normalizedHash, "utf8");
  const valid =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  return { valid, algorithm, encoding, fields };
}
