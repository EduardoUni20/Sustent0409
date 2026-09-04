# ModaLab — Tienda de Ropa + Proyecto de Algoritmos (Next.js)

Proyecto académico: una tienda de ropa hecha en **Next.js (App Router) + React + Tailwind CSS**,
donde cada sección del menú demuestra un tema distinto usando datos reales de la tienda:

| Tema | Dónde vive el código | Ruta |
|---|---|---|
| Big O | `components/SearchComparator.js` | `/big-o` |
| Recursividad | `components/CategoryTree.js`, `components/CartRecursivo.js` | `/recursividad` |
| Progresiones aritméticas | `components/InstallmentPlan.js` | `/progresiones` |
| Regresión lineal | `components/SalesPrediction.js` | `/regresion-lineal` |

Todo está separado en **componentes independientes y reutilizables** (uno por función),
con datos centralizados en la carpeta `data/`.

---

## 1. Estructura del proyecto

```
tienda-ropa-algoritmos/
├─ app/
│  ├─ layout.js              → layout raíz (incluye Navbar y Footer en todas las páginas)
│  ├─ page.js                → Inicio: vitrina de productos + accesos a cada tema
│  ├─ globals.css            → estilos globales (Tailwind)
│  ├─ big-o/page.js
│  ├─ recursividad/page.js
│  ├─ progresiones/page.js
│  └─ regresion-lineal/page.js
├─ components/
│  ├─ Navbar.js               → menú de navegación (responsive, con hamburguesa en móvil)
│  ├─ Footer.js
│  ├─ ProductCard.js          → tarjeta de producto de la vitrina
│  ├─ TemaCard.js             → tarjeta de acceso rápido a cada tema en Inicio
│  ├─ SearchComparator.js     → BIG O: búsqueda lineal vs. binaria
│  ├─ CategoryTree.js         → RECURSIVIDAD: árbol de categorías
│  ├─ CartRecursivo.js        → RECURSIVIDAD: total de carrito con combos anidados
│  ├─ InstallmentPlan.js      → PROGRESIONES: plan de cuotas
│  └─ SalesPrediction.js      → REGRESIÓN LINEAL: predicción de ventas (con gráfica)
├─ data/
│  ├─ products.js             → catálogo de productos de la tienda
│  ├─ categories.js           → árbol de categorías + carrito de ejemplo
│  └─ salesHistory.js         → historial de ventas mensuales
├─ package.json
├─ tailwind.config.js
├─ next.config.js
└─ postcss.config.js
```

---

## 2. Paso a paso para crear/ejecutar el proyecto desde cero

### Opción A — Usar los archivos que te entregué (recomendado)

1. **Instala Node.js** (versión 18 o superior). Verifica con:
   ```bash
   node -v
   npm -v
   ```
2. **Descomprime** el archivo `tienda-ropa-algoritmos.zip` que te compartí y entra a la carpeta:
   ```bash
   cd tienda-ropa-algoritmos
   ```
3. **Instala las dependencias**:
   ```bash
   npm install
   ```
4. **Corre el proyecto en modo desarrollo**:
   ```bash
   npm run dev
   ```
5. Abre tu navegador en **http://localhost:3000**. Ya deberías ver la tienda funcionando
   con el menú de navegación arriba.

### Opción B — Crear el proyecto desde cero tú mismo (por si te lo piden explicar)

1. Crear el proyecto base de Next.js:
   ```bash
   npx create-next-app@14 tienda-ropa-algoritmos
   ```
   Cuando pregunte, responde: **JavaScript** (no TypeScript), **App Router: sí**,
   **Tailwind CSS: sí**, **carpeta `src/`: no**.
2. Entra a la carpeta e instala la librería de gráficas:
   ```bash
   cd tienda-ropa-algoritmos
   npm install recharts
   ```
3. Crea las carpetas `components/` y `data/` en la raíz del proyecto.
4. Copia dentro de cada carpeta los archivos `.js` que te entregué (mismo nombre, mismo contenido).
5. Corre `npm run dev` y ve verificando ruta por ruta (`/`, `/big-o`, `/recursividad`,
   `/progresiones`, `/regresion-lineal`).

### Antes de sustentar (muy importante)

```bash
npm run build   # compila en modo producción y avisa si hay errores
npm run start   # corre la versión de producción, para probar que todo funciona igual
```

Si prefieres tenerlo en la nube en vez del PC, puedes subir el proyecto a GitHub y
desplegarlo gratis en **Vercel** (el creador de Next.js): conectas el repo, Vercel detecta
que es Next.js automáticamente y te da una URL pública en minutos.

---

## 3. Cómo se resuelve cada tema (para tu exposición)

### 🔵 Big O — `/big-o`
Se compara, sobre el catálogo de la tienda ordenado por precio, buscar un producto con:
- **Búsqueda lineal — O(n):** revisa uno por uno. Peor caso: revisa los `n` productos.
- **Búsqueda binaria — O(log n):** parte el arreglo ordenado a la mitad en cada paso.

La página muestra en vivo cuántos "pasos" (comparaciones) tomó cada algoritmo para el
mismo producto, y una tabla de cómo crecería esa diferencia si el catálogo tuviera miles
de productos. **Idea clave para explicar:** Big O no mide tiempo en segundos, mide cómo
crece el trabajo cuando crece la entrada.

### 🟣 Recursividad — `/recursividad`
Dos ejemplos, ambos con **caso base + caso recursivo**:
1. `CategoryTree`: el árbol de categorías (Ropa → Hombre/Mujer/Niños/Accesorios → subcategorías)
   se dibuja con un componente que se llama a sí mismo por cada nivel de hijos.
2. `calcularTotal()` en `CartRecursivo`: un carrito puede tener "combos" que contienen otros
   productos o incluso otros combos. La función se llama a sí misma hasta llegar a un producto
   sin hijos (caso base) y va sumando los resultados "de vuelta" hacia arriba.

### 🟡 Progresiones aritméticas — `/progresiones`
Un plan de cuotas para financiar una compra es una progresión aritmética: cada cuota
difiere de la anterior en un valor constante `d` (puede ser creciente, decreciente o igual).
Se aplican las fórmulas:
- `aₙ = a₁ + (n − 1)d` → valor de cada cuota
- `Sₙ = (n/2)(a₁ + aₙ)` → suma total, que debe coincidir con el precio del producto

La página deja elegir producto, número de cuotas y diferencia, y verifica en vivo que la
suma de las cuotas generadas es igual al precio total.

### 🟢 Regresión lineal — `/regresion-lineal`
Con el historial de ventas mensuales de camisetas, se calcula (con la fórmula de **mínimos
cuadrados**, implementada a mano en JavaScript, sin librerías de estadística) la recta
`y = mx + b` que mejor se ajusta a los datos, y se usa para **predecir los próximos meses**.
La gráfica (hecha con `recharts`) muestra los puntos reales y la línea de tendencia/predicción.

---

## 4. Sugerencia de guion para la sustentación (30 min máx.)

**Fase 1 (40%) — 15 a 25 min**
1. (5 min) Presenta el proyecto: qué es (tienda de ropa), con qué tecnología está hecho
   (Next.js, React, Tailwind, Recharts) y qué funcionalidades tiene (vitrina + 4 módulos).
2. (10–20 min) Recorre cada ruta del navbar en vivo, explicando para cada una:
   - Qué problema resuelve dentro de la tienda.
   - Qué algoritmo/fórmula hay detrás (muéstralo en el código).
   - Su complejidad o comportamiento (Big O, caso base/recursivo, fórmula, etc.).

**Fase 2 (60%) — 5 min**
- Preguntas del jurado. Ten claro el código de cada componente, porque pueden pedirte
  explicar una línea específica o cambiar un valor en vivo.

**Tip:** ensaya explicando por qué escogiste cada ejemplo con la tienda de ropa
(búsqueda de productos, árbol de categorías, cuotas de pago, predicción de ventas),
así se nota que entendiste el tema y no solo copiaste código.
