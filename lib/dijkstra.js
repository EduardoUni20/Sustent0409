// lib/dijkstra.js

export function dijkstra(ciudades, rutas, origenId, destinoId) {
  const distancias = {};
  const anteriores = {};
  const visitados = new Set();

  // Inicializar distancias
  ciudades.forEach((ciudad) => {
    distancias[ciudad.id] = Infinity;
    anteriores[ciudad.id] = null;
  });

  distancias[origenId] = 0;

  while (visitados.size < ciudades.length) {
    let ciudadActual = null;
    let menorDistancia = Infinity;

    // Buscar el vértice no visitado con menor distancia
    ciudades.forEach((ciudad) => {
      if (
        !visitados.has(ciudad.id) &&
        distancias[ciudad.id] < menorDistancia
      ) {
        menorDistancia = distancias[ciudad.id];
        ciudadActual = ciudad.id;
      }
    });

    // No quedan caminos disponibles
    if (ciudadActual === null) {
      break;
    }

    // Llegamos al destino
    if (ciudadActual === destinoId) {
      break;
    }

    visitados.add(ciudadActual);

    // Buscar las rutas conectadas
    const rutasConectadas = rutas.filter(
      (ruta) =>
        ruta.origen === ciudadActual ||
        ruta.destino === ciudadActual
    );

    rutasConectadas.forEach((ruta) => {
      const vecino =
        ruta.origen === ciudadActual
          ? ruta.destino
          : ruta.origen;

      if (visitados.has(vecino)) {
        return;
      }

      const nuevaDistancia =
        distancias[ciudadActual] + ruta.distancia;

      if (nuevaDistancia < distancias[vecino]) {
        distancias[vecino] = nuevaDistancia;
        anteriores[vecino] = ciudadActual;
      }
    });
  }

  // No existe una ruta
  if (distancias[destinoId] === Infinity) {
    return {
      distancia: Infinity,
      ruta: [],
    };
  }

  // Reconstruir el camino
  const rutaEncontrada = [];
  let actual = destinoId;

  while (actual !== null) {
    rutaEncontrada.unshift(actual);
    actual = anteriores[actual];
  }

  return {
    distancia: distancias[destinoId],
    ruta: rutaEncontrada,
  };
}