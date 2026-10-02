export function buildHashDiagnostics(transaction, result) {
  const normalized = {
    algorithm: result?.algorithm ?? "sha256",
    encoding: result?.encoding ?? "hex",
    fields: result?.fields ?? [],
    valid: Boolean(result?.valid),
    idTxn: transaction?.idTxn ?? null,
    user: transaction?.user ?? null,
    date: transaction?.date ?? null,
    value: transaction?.value ?? null,
    paymentMethod: transaction?.paymentMethod ?? null,
  };

  return {
    ...normalized,
    message: normalized.valid
      ? "Hash verificado correctamente."
      : "Hash no coincide con la configuración actual.",
  };
}

export function logHashDiagnostics(transaction, result) {
  const diagnostics = buildHashDiagnostics(transaction, result);

  console.group("[SlidingWindow] Hash diagnostics");
  console.info("transaction", {
    idTxn: diagnostics.idTxn,
    user: diagnostics.user,
    date: diagnostics.date,
    value: diagnostics.value,
    paymentMethod: diagnostics.paymentMethod,
  });
  console.info("hash", {
    algorithm: diagnostics.algorithm,
    encoding: diagnostics.encoding,
    fields: diagnostics.fields,
    valid: diagnostics.valid,
  });
  console.info(diagnostics.message);
  console.groupEnd();
}

export function logAnomalyLifecycle(event, payload = {}) {
  console.group(`[SlidingWindow] ${event}`);
  console.info(payload);
  console.groupEnd();
}
