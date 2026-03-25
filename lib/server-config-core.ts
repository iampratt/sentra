type ServerConfig = {
  databaseUrl: string;
};

function readRequiredServerEnv(key: "DATABASE_URL"): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }

  return value;
}

export function getServerConfig(): ServerConfig {
  return {
    databaseUrl: readRequiredServerEnv("DATABASE_URL"),
  };
}
