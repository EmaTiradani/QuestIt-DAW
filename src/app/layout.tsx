import type { ReactNode } from "react";

export const metadata = {
  title: "QuestIt",
  description: "Gestión de tareas y hábitos con gamificación",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
