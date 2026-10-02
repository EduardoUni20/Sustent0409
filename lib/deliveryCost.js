// lib/deliveryCost.js

export function calcularCostoEntrega(
  distancia,
  kmPorLitro,
  precioPorLitro
) {
  if (distancia < 0 || kmPorLitro <= 0 || precioPorLitro < 0) {
    return {
      litros: 0,
      costo: 0,
    };
  }

  const litros = distancia / kmPorLitro;
  const costo = litros * precioPorLitro;

  return {
    litros,
    costo,
  };
}