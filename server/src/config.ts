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
  /** DEMO_MODE=true → API 키 없이도 mock 응답으로 전체 플로우 동작 */
  demoMode: boolean
  /** 국가법령정보센터 Open API OC (Organization Code) */
  lawGoKrOc: string | null
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || "3200", 10),
    databaseUrl: process.env.DATABASE_URL || null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    deploymentMode:
      (process.env.DEPLOYMENT_MODE as Config["deploymentMode"]) ||
      "local_trusted",
    embeddedPostgresDataDir:
      process.env.HAGENT_DATA_DIR || "./hagent-data",
    demoMode: process.env.DEMO_MODE === "true",
    lawGoKrOc: process.env.LAW_GO_KR_OC || null,
  }
}
