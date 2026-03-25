import { IntelDashboard } from "@/app/components/IntelDashboard";
import { getClientConfig } from "@/lib/config";

export default function HomePage() {
  const config = getClientConfig();

  return <IntelDashboard appName={config.appName} apiBaseUrl={config.apiBaseUrl} />;
}
