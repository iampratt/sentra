type ClientEnvKey = "NEXT_PUBLIC_APP_NAME" | "NEXT_PUBLIC_API_BASE_URL";

type ClientConfig = {
  appName: string;
  apiBaseUrl: string;
};

function readRequiredEnv(key: ClientEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getClientConfig(): ClientConfig {
  return {
    appName: readRequiredEnv("NEXT_PUBLIC_APP_NAME"),
    apiBaseUrl: readRequiredEnv("NEXT_PUBLIC_API_BASE_URL"),
  };
}
