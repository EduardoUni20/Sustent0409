https://sustent0409.vercel.app/api/transactions

[
  {
    "idTxn": "TXN_MINI_001",
    "user": "usuario.prueba@ejemplo.com",
    "value": 120.00,
    "currency": "USD",
    "date": "2026-10-02T12:44:00.000Z",
    "paymentMethod": "CREDIT_CARD"
  },
  {
    "idTxn": "TXN_MINI_002",
    "user": "usuario.prueba@ejemplo.com",
    "value": 250.00,
    "currency": "USD",
    "date": "2026-10-02T12:44:00.800Z",
    "paymentMethod": "CREDIT_CARD"
  },
  {
    "idTxn": "TXN_MINI_003",
    "user": "usuario.prueba@ejemplo.com",
    "value": 95.50,
    "currency": "USD",
    "date": "2026-10-02T12:44:01.500Z",
    "paymentMethod": "CREDIT_CARD"
  }
]

Configura `HASH_SECRET` como variable privada de entorno en Postman. No incluyas
el secreto en el body ni en una captura.

Pre-request Script (opcional para pruebas manuales)

const CryptoJS = require("crypto-js");
const payload = JSON.parse(pm.request.body.raw);

function addHash(transaction) {
  const canonical = Object.fromEntries(
    Object.entries({
      idTxn: transaction.idTxn,
      user: transaction.user,
      date: transaction.date,
      value: transaction.value,
      paymentMethod: transaction.paymentMethod,
    }).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );

  return {
    ...transaction,
    hash: CryptoJS.HmacSHA256(
      JSON.stringify(canonical),
      pm.environment.get("HASH_SECRET"),
    ).toString(CryptoJS.enc.Hex),
  };
}

const updatedPayload = Array.isArray(payload)
  ? payload.map(addHash)
  : Array.isArray(payload.transactions)
    ? { ...payload, transactions: payload.transactions.map(addHash) }
    : addHash(payload);

pm.request.body.update({
  mode: "raw",
  raw: JSON.stringify(updatedPayload, null, 2),
});