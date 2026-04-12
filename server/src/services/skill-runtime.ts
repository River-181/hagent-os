import type { Db } from "@hagent/db"
import { getAgentMountedSkills } from "./skills.js"

export interface RuntimeSkillBundle {
  slug: string
  displayName: string
  summary: string
  mountOrder: number
  requiredIntegrations: string[]
  requiredEnv: string[]
  ready: boolean
  excerpt: string
}

function collectSection(markdown: string, headingPatterns: RegExp[]) {
  const lines = markdown.split(/\r?\n/)
  let collecting = false
  const buffer: string[] = []

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line.trim())
    if (heading) {
      const matches = headingPatterns.some((pattern) => pattern.test(heading[1]))
      if (collecting && !matches) break
      collecting = matches
      continue
    }
    if (collecting && line.trim()) {
      buffer.push(line.trim())
    }
  }

  return buffer.slice(0, 6).join("\n")
}

function summarizeSkillMarkdown(markdown: string) {
  const purpose = collectSection(markdown, [/목적/, /Purpose/i])
  const checklist = collectSection(markdown, [/체크리스트/, /실행 가이드/, /usage/i, /guide/i])
  const output = collectSection(markdown, [/출력/, /output/i])
  const integrations = collectSection(markdown, [/연동 의존성/, /integration/i, /dependency/i])

  const parts = [purpose, checklist, output, integrations].filter(Boolean)
  if (parts.length > 0) return parts.join("\n\n")

  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("---") && !line.trim().startsWith("#"))
    .slice(0, 10)
    .join("\n")
}

export async function buildAgentSkillRuntimeContext(db: Db, agentId: string) {
  const mounted = await getAgentMountedSkills(db, agentId)
  const bundles: RuntimeSkillBundle[] = mounted
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.mountOrder ?? 0) - (b.mountOrder ?? 0))
    .map((item) => ({
      slug: item.slug,
      displayName: item.displayName ?? item.name ?? item.slug,
      summary: item.summary ?? "",
      mountOrder: item.mountOrder ?? 0,
      requiredIntegrations: Array.isArray(item.runtime?.requiredIntegrations) ? item.runtime.requiredIntegrations : [],
      requiredEnv: Array.isArray(item.runtimeHealth)
        ? item.runtimeHealth.flatMap((health: { requiredEnv?: string[] }) => health.requiredEnv ?? [])
        : [],
      ready: Array.isArray(item.runtimeHealth) ? item.runtimeHealth.every((health: { ready?: boolean }) => health.ready !== false) : true,
      excerpt: summarizeSkillMarkdown(String(item.skillMarkdown ?? "")),
    }))

  const text =
    bundles.length === 0
      ? ""
      : `## Mounted Skills\n${bundles
          .map((bundle) => {
            const integrationText = bundle.requiredIntegrations.length > 0
              ? `required integrations: ${bundle.requiredIntegrations.join(", ")}`
              : "required integrations: none"
            return [
              `### ${bundle.displayName} (${bundle.slug})`,
              bundle.summary ? `summary: ${bundle.summary}` : null,
              `ready: ${bundle.ready ? "yes" : "no"}`,
              integrationText,
              bundle.excerpt,
            ]
              .filter(Boolean)
              .join("\n")
          })
          .join("\n\n")}`

  return {
    bundles,
    text,
  }
}
