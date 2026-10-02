// lib/stack.js

// Crear una pila vacía
export function crearPila() {
  return [];
}

// Agregar un elemento al final de la pila
export function apilar(pila, elemento) {
  return [...pila, elemento];
}

// Sacar el último elemento de la pila
export function desapilar(pila) {
  if (pila.length === 0) {
    return {
      elemento: null,
      pila: [],
    };
  }

  return {
    elemento: pila[pila.length - 1],
    pila: pila.slice(0, -1),
  };
}

// Ver el último elemento sin eliminarlo
export function verTope(pila) {
  if (pila.length === 0) {
    return null;
  }

  return pila[pila.length - 1];
}

// Comprobar si la pila está vacía
export function estaVacia(pila) {
  return pila.length === 0;
}