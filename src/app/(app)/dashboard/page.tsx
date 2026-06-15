import { redirect } from "next/navigation";
import { DEFAULT_APP_ROUTE } from "@/lib/navigation/default-route";

export default function DashboardPage() {
  redirect(DEFAULT_APP_ROUTE);
}
