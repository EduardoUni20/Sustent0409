// Calcula el HMAC esperado de una transacción y verifica si coincide con el enviado.
import { createHmac, timingSafeEqual } from "node:crypto";

// Estos campos y su orden deben coincidir con los usados por el emisor al crear el HMAC.
const HASH_FIELDS = ["idTxn", "user", "date", "value", "paymentMethod"];

// Recalcula el HMAC del payload y lo compara en tiempo constante con el hash recibido.
export function validateTransactionHash(transaction) {
  // El sistema solo acepta HMAC-SHA-256; SHA-256 sin secreto no autenticaría al emisor.
  const algorithm = (process.env.HASH_ALGORITHM || "hmac-sha256").toLowerCase();
  if (algorithm !== "hmac-sha256") {
    throw new Error(
      "HASH_ALGORITHM debe ser hmac-sha256 para verificar la integridad.",
    );
  }
  // El emisor y el servidor deben usar la misma representación del digest.
  const encoding = (process.env.HASH_ENCODING || "hex").toLowerCase();
  if (encoding !== "hex" && encoding !== "base64") {
    throw new Error("HASH_ENCODING debe ser hex o base64.");
  }

  // Evita que una configuración de campos distinta genere un HMAC incompatible.
  const configuredFields = process.env.HASH_FIELDS;
  if (
    configuredFields &&
    configuredFields.split(",").map((field) => field.trim()).join(",") !==
      HASH_FIELDS.join(",")
  ) {
    throw new Error(
      `HASH_FIELDS debe ser exactamente ${HASH_FIELDS.join(",")} para coincidir con el emisor.`,
    );
  }

  // Construye el objeto firmado solo con los campos acordados y en un orden estable.
  const canonicalTransaction = {};
  for (const field of HASH_FIELDS) {
    if (transaction[field] === undefined || transaction[field] === null) {
      throw new Error(`Falta el campo ${field} configurado en HASH_FIELDS.`);
    }
    canonicalTransaction[field] = transaction[field];
  }

  // Firma el JSON canónico con el secreto compartido entre servidor y emisor.
  const secret = process.env.HASH_SECRET;
  if (!secret) {
    throw new Error("HASH_SECRET es obligatorio con hmac-sha256.");
  }
  const serialized = JSON.stringify(canonicalTransaction);
  const digest = createHmac("sha256", secret).update(serialized);

  // Convierte el valor esperado y el recibido a bytes usando la codificación configurada.
  const expectedBuffer = Buffer.from(digest.digest(encoding), "utf8");
  const providedHash = String(transaction.hash || "").trim();
  const normalizedHash = encoding === "hex" ? providedHash.toLowerCase() : providedHash;
  const providedBuffer = Buffer.from(normalizedHash, "utf8");
  // Este es el punto de comparación: primero exige igual longitud y luego compara en tiempo constante.
  const valid =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  return { valid, algorithm, encoding, fields: HASH_FIELDS };
}
