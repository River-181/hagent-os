import { config as dotenvConfig } from "dotenv"
import path from "path"

// Load .env from monorepo root
dotenvConfig({ path: path.resolve(import.meta.dirname, "../../.env") })

export interface Config {
  port: number
  databaseUrl: string | null
  anthropicApiKey: string | null
  deploymentMode: "local_trusted" | "authenticated"
  embeddedPostgresDataDir: string
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || "3100", 10),
    databaseUrl: process.env.DATABASE_URL || null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    deploymentMode:
      (process.env.DEPLOYMENT_MODE as Config["deploymentMode"]) ||
      "local_trusted",
    embeddedPostgresDataDir:
      process.env.HAGENT_DATA_DIR || "./hagent-data",
  }
}
