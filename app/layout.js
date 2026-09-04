import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "ModaLab | Tienda de Ropa + Algoritmos",
  description:
    "Proyecto académico: tienda de ropa en Next.js que aplica Big O, recursividad, progresiones aritméticas y regresión lineal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
