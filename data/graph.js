// data/graph.js

// Ciudades que hacen parte de la red de entregas de ModaLab
export const ciudadesIniciales = [
  {
    id: "medellin",
    nombre: "Medellín",
  },
  {
    id: "bogota",
    nombre: "Bogotá",
  },
  {
    id: "cali",
    nombre: "Cali",
  },
  {
    id: "pereira",
    nombre: "Pereira",
  },
  {
    id: "manizales",
    nombre: "Manizales",
  },
  {
    id: "armenia",
    nombre: "Armenia",
  },
  {
    id: "bucaramanga",
    nombre: "Bucaramanga",
  },
  {
    id: "cartagena",
    nombre: "Cartagena",
  },
  {
    id: "barranquilla",
    nombre: "Barranquilla",
  },
];

// Conexiones entre ciudades.
// La distancia representa el peso de cada conexión.
// Son distancias de ejemplo para la demostración académica.
export const rutasIniciales = [
  {
    origen: "medellin",
    destino: "pereira",
    distancia: 210,
  },
  {
    origen: "medellin",
    destino: "manizales",
    distancia: 200,
  },
  {
    origen: "medellin",
    destino: "bogota",
    distancia: 420,
  },
  {
    origen: "medellin",
    destino: "cali",
    distancia: 420,
  },
  {
    origen: "pereira",
    destino: "armenia",
    distancia: 55,
  },
  {
    origen: "armenia",
    destino: "cali",
    distancia: 180,
  },
  {
    origen: "manizales",
    destino: "bogota",
    distancia: 290,
  },
  {
    origen: "bogota",
    destino: "bucaramanga",
    distancia: 400,
  },
  {
    origen: "bogota",
    destino: "cartagena",
    distancia: 1000,
  },
  {
    origen: "bucaramanga",
    destino: "cartagena",
    distancia: 650,
  },
  {
    origen: "cartagena",
    destino: "barranquilla",
    distancia: 120,
  },
];