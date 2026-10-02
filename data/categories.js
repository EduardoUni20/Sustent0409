// data/categories.js
// Árbol de categorías de la tienda: una estructura naturalmente recursiva
// (cada nodo puede tener hijos, que a su vez pueden tener hijos).
// Se usa en el módulo de RECURSIVIDAD para renderizar el árbol con una
// función que se llama a sí misma por cada nivel.

export const arbolCategorias = {
  nombre: "Ropa",
  hijos: [
    {
      nombre: "Hombre",
      hijos: [
        { nombre: "Camisetas", hijos: [] },
        { nombre: "Pantalones", hijos: [] },
        { nombre: "Chaquetas", hijos: [] },
        { nombre: "Zapatos", hijos: [] },
      ],
    },
    {
      nombre: "Mujer",
      hijos: [
        { nombre: "Vestidos", hijos: [] },
        { nombre: "Blusas", hijos: [] },
        { nombre: "Faldas", hijos: [] },
        { nombre: "Zapatos", hijos: [] },
      ],
    },
    {
      nombre: "Niños",
      hijos: [
        { nombre: "Camisetas", hijos: [] },
        { nombre: "Shorts", hijos: [] },
      ],
    },
    {
      nombre: "Accesorios",
      hijos: [
        { nombre: "Gorras", hijos: [] },
        { nombre: "Cinturones", hijos: [] },
        { nombre: "Bolsos", hijos: [] },
      ],
    },
  ],
};

// Carrito de ejemplo con "combos" anidados: un combo puede contener productos
// sueltos Y otros combos dentro. Para sumar el total hay que recorrer la
// estructura de forma recursiva (no sirve un simple .reduce plano).
export const carritoEjemplo = {
  nombre: "Carrito de Compra",
  precio: 0,
  hijos: [
    { nombre: "Camiseta Básica Blanca", precio: 39900, hijos: [] },
    { nombre: "Jean Slim Fit", precio: 149900, hijos: [] },
    {
      nombre: "Combo Outfit Completo",
      precio: 0,
      hijos: [
        { nombre: "Chaqueta de Cuero", precio: 349900, hijos: [] },
        { nombre: "Zapatillas Urbanas", precio: 219900, hijos: [] },
        {
          nombre: "Combo Accesorios",
          precio: 0,
          hijos: [
            { nombre: "Gorra Clásica", precio: 44900, hijos: [] },
            { nombre: "Cinturón de Cuero", precio: 59900, hijos: [] },
          ],
        },
      ],
    },
  ],
};
