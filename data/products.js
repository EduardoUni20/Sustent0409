// data/products.js
// Catálogo de la tienda de ropa. Cada producto tiene un precio (usado por
// el módulo de Big O para las búsquedas) y una categoría/subcategoría
// (usada por el módulo de recursividad para armar el árbol de categorías).

export const products = [
  { id: 1,  nombre: "Camiseta Básica Blanca",   categoria: "Hombre", subcategoria: "Camisetas",  precio: 39900,  stock: 25 },
  { id: 2,  nombre: "Camiseta Estampada",        categoria: "Hombre", subcategoria: "Camisetas",  precio: 49900,  stock: 18 },
  { id: 3,  nombre: "Pantalón Cargo",            categoria: "Hombre", subcategoria: "Pantalones", precio: 129900, stock: 12 },
  { id: 4,  nombre: "Jean Slim Fit",             categoria: "Hombre", subcategoria: "Pantalones", precio: 149900, stock: 20 },
  { id: 5,  nombre: "Chaqueta de Cuero",         categoria: "Hombre", subcategoria: "Chaquetas",  precio: 349900, stock: 6  },
  { id: 6,  nombre: "Vestido Casual",            categoria: "Mujer",  subcategoria: "Vestidos",   precio: 159900, stock: 14 },
  { id: 7,  nombre: "Vestido de Fiesta",         categoria: "Mujer",  subcategoria: "Vestidos",   precio: 259900, stock: 8  },
  { id: 8,  nombre: "Blusa Manga Larga",         categoria: "Mujer",  subcategoria: "Blusas",     precio: 89900,  stock: 22 },
  { id: 9,  nombre: "Falda Plisada",             categoria: "Mujer",  subcategoria: "Faldas",     precio: 99900,  stock: 16 },
  { id: 10, nombre: "Camiseta Niño Dinosaurio",  categoria: "Niños",  subcategoria: "Camisetas",  precio: 29900,  stock: 30 },
  { id: 11, nombre: "Short Niño Deportivo",      categoria: "Niños",  subcategoria: "Shorts",     precio: 34900,  stock: 24 },
  { id: 12, nombre: "Gorra Clásica",             categoria: "Accesorios", subcategoria: "Gorras",    precio: 44900, stock: 40 },
  { id: 13, nombre: "Cinturón de Cuero",         categoria: "Accesorios", subcategoria: "Cinturones",precio: 59900, stock: 17 },
  { id: 14, nombre: "Bolso Tote",                categoria: "Accesorios", subcategoria: "Bolsos",    precio: 179900, stock: 9  },
  { id: 15, nombre: "Zapatillas Urbanas",        categoria: "Hombre", subcategoria: "Zapatos",    precio: 219900, stock: 11 },
  { id: 16, nombre: "Tacones Elegantes",         categoria: "Mujer",  subcategoria: "Zapatos",    precio: 189900, stock: 10 },
];

// Formateador de precios en pesos colombianos, reutilizado en toda la app.
export function formatoPrecio(valor) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
