// Redireciona /portal → /portal/inicio automaticamente
import { redirect } from "next/navigation";

export default function PortalPage() {
  redirect("/portal/inicio");
}
