// lib/queue.js

export function crearCola() {
  return [];
}

export function encolar(cola, elemento) {
  return [...cola, elemento];
}

export function desencolar(cola) {
  if (cola.length === 0) {
    return {
      elemento: null,
      cola: [],
    };
  }

  return {
    elemento: cola[0],
    cola: cola.slice(1),
  };
}

export function verPrimero(cola) {
  return cola.length > 0 ? cola[0] : null;
}

export function estaVacia(cola) {
  return cola.length === 0;
}