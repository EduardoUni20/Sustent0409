import SlidingWindowDashboard from "@/components/SlidingWindowDashboard";

export const metadata = {
  title: "Ventana Deslizante | ModaLab",
  description:
    "Detección de transacciones sospechosas con ventanas deslizantes y estadísticas.",
};

export default function VentanaDeslizantePage() {
  return <SlidingWindowDashboard />;
}
