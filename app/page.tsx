import { getClientConfig } from "@/lib/config";

export default function HomePage() {
  const config = getClientConfig();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Part 4: Shared Config Wiring</p>
        <h1>{config.appName}</h1>
        <p className="description">
          Frontend env validation is active. This page now reads typed config from the shared
          client config module before the dashboard shell is added.
        </p>
        <dl className="config-grid">
          <div>
            <dt>Frontend app name</dt>
            <dd>{config.appName}</dd>
          </div>
          <div>
            <dt>API base URL</dt>
            <dd>{config.apiBaseUrl}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
