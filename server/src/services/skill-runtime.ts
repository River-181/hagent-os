import type { Db } from "@hagent/db"
import { eq } from "drizzle-orm"
import * as schema from "@hagent/db"
import { getAgentMountedSkills, getSkillDetail } from "./skills.js"

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
  const useWhen = collectSection(markdown, [/Use This Skill When/i, /사용할 때/i, /목적/, /Purpose/i])
  const inputs = collectSection(markdown, [/Required Inputs/i, /입력/i])
  const source = collectSection(markdown, [/Source of Truth/i, /정본/i])
  const workflow = collectSection(markdown, [/Workflow/i, /실행 가이드/i, /체크리스트/i])
  const rules = collectSection(markdown, [/Decision Rules/i, /Guardrails/i, /규칙/i])
  const failure = collectSection(markdown, [/Failure Handling/i, /실패/i, /fallback/i])
  const done = collectSection(markdown, [/Done When/i, /완료/i])

  const parts = [useWhen, inputs, source, workflow, rules, failure, done].filter(Boolean)
  if (parts.length > 0) return parts.join("\n\n")

  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("---") && !line.trim().startsWith("#"))
    .slice(0, 10)
    .join("\n")
}

export async function buildAgentSkillRuntimeContext(db: Db, agentId: string) {
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId))
  const mounted = await getAgentMountedSkills(db, agentId)
  const bundles: RuntimeSkillBundle[] = await Promise.all(
    mounted
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.mountOrder ?? 0) - (b.mountOrder ?? 0))
    .map(async (item) => {
      const detail = agent ? await getSkillDetail(db, item.slug, agent.organizationId).catch(() => null) : null
      const runtimeHealth = Array.isArray(item.runtimeHealth) ? item.runtimeHealth : []
      const requiredIntegrations = detail?.runtime?.requiredIntegrations
        ?? runtimeHealth.flatMap((health: { key?: string }) => (typeof health.key === "string" ? [health.key] : []))
      const requiredEnv = detail?.runtime?.requiredEnv
        ?? runtimeHealth.flatMap((health: { requiredEnv?: string[] }) => health.requiredEnv ?? [])
      const skillMarkdown = detail?.skillMarkdown ?? ""
      return {
        slug: item.slug,
        displayName: item.displayName ?? item.slug,
        summary: item.summary ?? "",
        mountOrder: item.mountOrder ?? 0,
        requiredIntegrations,
        requiredEnv,
        ready: runtimeHealth.length > 0 ? runtimeHealth.every((health: { ready?: boolean }) => health.ready !== false) : true,
        excerpt: summarizeSkillMarkdown(skillMarkdown || String(item.summary ?? "")),
      }
    }),
  )

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
