import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import type { SkillPackageManifest } from "@hagent/shared"

const skillRoot = fileURLToPath(new URL("../../../skills", import.meta.url))

const manifestSchema = z.object({
  id: z.string().min(3),
  slug: z.string().min(2),
  namespace: z.string().min(2),
  displayName: z.string().min(2),
  version: z.string().min(1),
  summary: z.string().min(2),
  packageType: z.enum(["builtin", "imported", "wrapper", "composite"]),
  source: z.object({
    kind: z.enum(["local", "github_repo", "github_subdir", "registry_url", "manual"]),
    repo: z.string().optional(),
    url: z.string().optional(),
    path: z.string().optional(),
    commit: z.string().optional(),
    license: z.string().optional(),
    importedAt: z.string().optional(),
  }),
  compatibility: z.object({
    agentTypes: z.array(z.string()).default([]),
    adapters: z.array(z.string()).default([]),
    locales: z.array(z.string()).default([]),
  }),
  runtime: z.object({
    injectionMode: z.enum(["system", "instructions", "policy", "tool", "composite"]),
    requiredIntegrations: z.array(z.string()).default([]),
    requiredSecrets: z.array(z.string()).default([]),
    requiredEnv: z.array(z.string()).default([]),
    requiredFiles: z.array(z.string()).default([]),
  }),
  distribution: z.object({
    exportTargets: z.array(z.enum(["codex", "claude-code", "cursor"])).default([]),
    editable: z.boolean().default(false),
    publishable: z.boolean().default(false),
  }),
})

const importRequestSchema = z.object({
  slug: z.string().min(2),
  namespace: z.string().min(2).default("community"),
  displayName: z.string().min(2),
  summary: z.string().min(2),
  github_repo: z.string().optional(),
  github_subdir: z.string().optional(),
  local_path: z.string().optional(),
  registry_url: z.string().optional(),
  packageType: z.enum(["builtin", "imported", "wrapper", "composite"]).default("imported"),
  sourceCommit: z.string().optional(),
  license: z.string().optional(),
  compatibility: z
    .object({
      agentTypes: z.array(z.string()).default([]),
      adapters: z.array(z.string()).default(["claude_local"]),
      locales: z.array(z.string()).default(["ko-KR"]),
    })
    .optional(),
  runtime: z
    .object({
      injectionMode: z.enum(["system", "instructions", "policy", "tool", "composite"]).default("instructions"),
      requiredIntegrations: z.array(z.string()).default([]),
      requiredSecrets: z.array(z.string()).default([]),
      requiredEnv: z.array(z.string()).default([]),
      requiredFiles: z.array(z.string()).default([]),
    })
    .optional(),
})

const createRequestSchema = z.object({
  slug: z.string().min(2),
  namespace: z.string().min(2).default("hagent"),
  displayName: z.string().min(2),
  summary: z.string().min(2),
  packageType: z.enum(["builtin", "imported", "wrapper", "composite"]).default("builtin"),
  agentTypes: z.array(z.string()).default([]),
  adapters: z.array(z.string()).default(["claude_local"]),
  locales: z.array(z.string()).default(["ko-KR"]),
})

export interface SkillFileNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  children?: SkillFileNode[]
}

interface RuntimeHealthItem {
  key: string
  label: string
  ready: boolean
  requiredEnv: string[]
  missingEnv: string[]
}

interface SkillPackageRecord {
  manifest: SkillPackageManifest
  rootDir: string
  markdown: string
  openaiYaml: string | null
  fileTree: SkillFileNode[]
}

type SkillSourceKind = SkillPackageManifest["source"]["kind"]

const INTEGRATION_REGISTRY: Record<string, { label: string; requiredEnv: string[] }> = {
  "korean-law-mcp": {
    label: "Korean Law MCP",
    requiredEnv: ["OPEN_LAW_ID"],
  },
  "google-calendar-mcp": {
    label: "Google Calendar MCP",
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  "kakao-channel": {
    label: "Kakao Channel",
    requiredEnv: ["KAKAO_CHANNEL_ID", "KAKAO_CHANNEL_SECRET"],
  },
  "aligo-sms": {
    label: "Aligo SMS",
    requiredEnv: ["ALIGO_API_KEY", "ALIGO_USER_ID"],
  },
  "hwpx-cli": {
    label: "HWPX CLI",
    requiredEnv: ["HWPX_CLI_PATH"],
  },
}

function packageDbPayload(pkg: SkillPackageManifest) {
  return {
    namespace: pkg.namespace,
    slug: pkg.slug,
    displayName: pkg.displayName,
    version: pkg.version,
    summary: pkg.summary,
    packageType: pkg.packageType,
    sourceKind: pkg.source.kind,
    sourceRepo: pkg.source.repo ?? null,
    sourceUrl: pkg.source.url ?? pkg.source.path ?? null,
    sourceCommit: pkg.source.commit ?? null,
    manifestJson: pkg as unknown as Record<string, unknown>,
    updatedAt: new Date(),
  }
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureSkillRoot() {
  await fs.mkdir(skillRoot, { recursive: true })
}

async function readJsonFile<T>(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw) as T
}

async function buildFileTree(dirPath: string, baseDir = dirPath): Promise<SkillFileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(baseDir, fullPath).replaceAll(path.sep, "/")

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            path: relativePath,
            type: "directory" as const,
            children: await buildFileTree(fullPath, baseDir),
          }
        }

        const stat = await fs.stat(fullPath)
        return {
          name: entry.name,
          path: relativePath,
          type: "file" as const,
          size: stat.size,
        }
      }),
  )

  return nodes
}

function coerceImportKind(payload: z.infer<typeof importRequestSchema>): SkillSourceKind {
  if (payload.local_path) return "manual"
  if (payload.github_subdir) return "github_subdir"
  if (payload.github_repo) return "github_repo"
  if (payload.registry_url) return "registry_url"
  return "manual"
}

function normalizeRelativePath(inputPath: string) {
  const normalized = path.posix.normalize(inputPath.replaceAll("\\", "/"))
  if (!normalized || normalized.startsWith("../") || normalized === "..") {
    throw new Error("Invalid skill file path")
  }
  return normalized
}

function getSkillDir(namespace: string, slug: string) {
  return path.join(skillRoot, namespace, slug)
}

function makeDefaultSkillBody(manifest: SkillPackageManifest) {
  return `---
name: ${manifest.slug}
description: ${manifest.summary}
---

# ${manifest.displayName}

## 목적

${manifest.summary}

## 사용 시점

- ${manifest.compatibility.agentTypes.length > 0 ? `${manifest.compatibility.agentTypes.join(", ")} 에이전트에서 사용` : "적합한 에이전트에 장착"}
- 조직 컨텍스트와 정책을 함께 참고

## 실행 규칙

- 조직 정책과 승인 레벨을 우선한다.
- 필요한 외부 integration 상태를 확인한 뒤 동작한다.
- 확신이 낮으면 초안과 근거를 함께 반환한다.
`
}

function makeOpenAiYaml(manifest: SkillPackageManifest) {
  return `display_name: ${manifest.displayName}
short_description: ${manifest.summary}
default_prompt: |
  Use ${manifest.displayName} for ${manifest.summary}.
`
}

async function writeManifest(dirPath: string, manifest: SkillPackageManifest) {
  await fs.mkdir(path.join(dirPath, "agents"), { recursive: true })
  await fs.writeFile(
    path.join(dirPath, "skill.package.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  )
  await fs.writeFile(path.join(dirPath, "SKILL.md"), makeDefaultSkillBody(manifest), "utf8")
  await fs.writeFile(path.join(dirPath, "agents", "openai.yaml"), makeOpenAiYaml(manifest), "utf8")
}

async function loadSkillPackageFromDir(dirPath: string): Promise<SkillPackageRecord | null> {
  const manifestPath = path.join(dirPath, "skill.package.json")
  const skillPath = path.join(dirPath, "SKILL.md")
  if (!(await pathExists(manifestPath)) || !(await pathExists(skillPath))) {
    return null
  }

  const parsed = manifestSchema.parse(await readJsonFile(manifestPath)) as SkillPackageManifest
  const markdown = await fs.readFile(skillPath, "utf8")
  const openaiYamlPath = path.join(dirPath, "agents", "openai.yaml")
  const openaiYaml = (await pathExists(openaiYamlPath))
    ? await fs.readFile(openaiYamlPath, "utf8")
    : null

  return {
    manifest: parsed,
    rootDir: dirPath,
    markdown,
    openaiYaml,
    fileTree: await buildFileTree(dirPath),
  }
}

async function scanSkillPackages(): Promise<SkillPackageRecord[]> {
  await ensureSkillRoot()
  const namespaces = await fs.readdir(skillRoot, { withFileTypes: true }).catch(() => [])
  const packages: SkillPackageRecord[] = []

  for (const namespaceEntry of namespaces) {
    if (!namespaceEntry.isDirectory()) continue
    const namespaceDir = path.join(skillRoot, namespaceEntry.name)
    const skillDirs = await fs.readdir(namespaceDir, { withFileTypes: true }).catch(() => [])
    for (const skillEntry of skillDirs) {
      if (!skillEntry.isDirectory()) continue
      const loaded = await loadSkillPackageFromDir(path.join(namespaceDir, skillEntry.name))
      if (loaded) packages.push(loaded)
    }
  }

  return packages.sort((a, b) => a.manifest.displayName.localeCompare(b.manifest.displayName, "ko"))
}

async function syncRegistryToDb(db: Db, packages: SkillPackageRecord[]) {
  try {
    for (const pkg of packages) {
      await db
        .insert(schema.skillPackages)
        .values(packageDbPayload(pkg.manifest))
        .onConflictDoUpdate({
          target: [schema.skillPackages.namespace, schema.skillPackages.slug],
          set: packageDbPayload(pkg.manifest),
        })
    }
  } catch {
    // DB migration may not be applied yet. Filesystem remains source of truth.
  }
}

async function fetchInstalledMap(db: Db, orgId?: string) {
  if (!orgId) return new Map<string, { status: string; config: Record<string, unknown> }>()
  try {
    const rows = await db
      .select({
        slug: schema.skillPackages.slug,
        status: schema.organizationSkills.status,
        configJson: schema.organizationSkills.configJson,
      })
      .from(schema.organizationSkills)
      .innerJoin(schema.skillPackages, eq(schema.organizationSkills.skillPackageId, schema.skillPackages.id))
      .where(eq(schema.organizationSkills.organizationId, orgId))

    return new Map(
      rows.map((row) => [row.slug, { status: row.status, config: (row.configJson ?? {}) as Record<string, unknown> }]),
    )
  } catch {
    return new Map<string, { status: string; config: Record<string, unknown> }>()
  }
}

async function fetchAgentMountsForOrg(db: Db, orgId?: string) {
  if (!orgId) return new Map<string, Array<Record<string, unknown>>>()

  const bySlug = new Map<string, Array<Record<string, unknown>>>()

  try {
    const rows = await db
      .select({
        slug: schema.skillPackages.slug,
        agentId: schema.agentSkills.agentId,
        agentName: schema.agents.name,
        mountOrder: schema.agentSkills.mountOrder,
        enabled: schema.agentSkills.enabled,
        agentType: schema.agents.agentType,
      })
      .from(schema.agentSkills)
      .innerJoin(schema.skillPackages, eq(schema.agentSkills.skillPackageId, schema.skillPackages.id))
      .innerJoin(schema.agents, eq(schema.agentSkills.agentId, schema.agents.id))
      .where(eq(schema.agents.organizationId, orgId))

    for (const row of rows) {
      const list = bySlug.get(row.slug) ?? []
      list.push({
        agentId: row.agentId,
        agentName: row.agentName,
        mountOrder: row.mountOrder,
        enabled: row.enabled,
        agentType: row.agentType,
      })
      bySlug.set(row.slug, list)
    }
    return bySlug
  } catch {
    try {
      const agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, orgId))
      for (const agent of agents) {
        const rawSkills = Array.isArray(agent.skills) ? (agent.skills as unknown[]) : []
        rawSkills.forEach((item, index) => {
          const slug =
            typeof item === "string"
              ? item
              : item && typeof item === "object" && typeof (item as { slug?: unknown }).slug === "string"
              ? (item as { slug: string }).slug
              : null
          if (!slug) return
          const list = bySlug.get(slug) ?? []
          list.push({
            agentId: agent.id,
            agentName: agent.name,
            mountOrder: index,
            enabled:
              typeof item === "object" && item && "enabled" in item
                ? Boolean((item as { enabled?: boolean }).enabled)
                : true,
            agentType: agent.agentType,
          })
          bySlug.set(slug, list)
        })
      }
      return bySlug
    } catch {
      return bySlug
    }
  }
}

function computeRuntimeHealth(manifest: SkillPackageManifest): RuntimeHealthItem[] {
  const integrationKeys = new Set([
    ...manifest.runtime.requiredIntegrations,
    ...manifest.runtime.requiredSecrets.map((key: string) => key.toLowerCase()),
  ])

  return Array.from(integrationKeys).map((key) => {
    const registry = INTEGRATION_REGISTRY[key] ?? {
      label: key,
      requiredEnv: [],
    }
    const missingEnv = registry.requiredEnv.filter((envKey) => !process.env[envKey])
    return {
      key,
      label: registry.label,
      ready: missingEnv.length === 0,
      requiredEnv: registry.requiredEnv,
      missingEnv,
    }
  })
}

async function getPackagesWithMeta(db: Db, orgId?: string) {
  const packages = await scanSkillPackages()
  await syncRegistryToDb(db, packages)
  const installMap = await fetchInstalledMap(db, orgId)
  const mountMap = await fetchAgentMountsForOrg(db, orgId)

  return packages.map((pkg) => {
    const installed = installMap.get(pkg.manifest.slug)
    const mountedAgents = mountMap.get(pkg.manifest.slug) ?? []
    const runtimeHealth = computeRuntimeHealth(pkg.manifest)
    const ready = runtimeHealth.every((item) => item.ready)

    return {
      ...pkg,
      installed: Boolean(installed) || mountedAgents.length > 0,
      installation: installed ?? null,
      mountedAgents,
      runtimeHealth,
      ready,
      sourceBadge:
        pkg.manifest.source.kind === "local"
          ? "Local"
          : pkg.manifest.source.kind === "manual"
          ? "Manual"
          : "Imported",
    }
  })
}

async function resolvePackage(db: Db, slug: string, orgId?: string) {
  const packages = await getPackagesWithMeta(db, orgId)
  const match = packages.find((pkg) => pkg.manifest.slug === slug)
  if (!match) throw new Error("Skill not found")
  return match
}

export async function listSkills(db: Db, orgId?: string) {
  const packages = await getPackagesWithMeta(db, orgId)
  return packages.map((pkg) => ({
    id: pkg.manifest.id,
    slug: pkg.manifest.slug,
    namespace: pkg.manifest.namespace,
    displayName: pkg.manifest.displayName,
    version: pkg.manifest.version,
    summary: pkg.manifest.summary,
    packageType: pkg.manifest.packageType,
    source: pkg.manifest.source,
    compatibility: pkg.manifest.compatibility,
    distribution: pkg.manifest.distribution,
    installed: pkg.installed,
    sourceBadge: pkg.sourceBadge,
    runtimeHealth: pkg.runtimeHealth,
    ready: pkg.ready,
    mountedAgents: pkg.mountedAgents,
    fileCount: countFiles(pkg.fileTree),
  }))
}

function countFiles(nodes: SkillFileNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === "file") return total + 1
    return total + countFiles(node.children ?? [])
  }, 0)
}

function buildLegacySkillStub(slug: string) {
  const presetMap: Record<
    string,
    {
      displayName: string
      summary: string
      namespace: string
      packageType: SkillPackageManifest["packageType"]
      requiredIntegrations?: string[]
    }
  > = {
    "korean-tone-guide": {
      displayName: "학부모 응대 톤 가이드",
      summary: "학부모 커뮤니케이션의 한국어 톤앤매너와 문장 가이드를 제공합니다.",
      namespace: "legacy",
      packageType: "builtin",
    },
    "churn-risk-calculator": {
      displayName: "이탈 위험 계산기",
      summary: "학생 이탈 가능성을 점수화하는 초기 계산 로직을 제공합니다.",
      namespace: "legacy",
      packageType: "builtin",
    },
    "google-calendar-mcp": {
      displayName: "Google Calendar MCP",
      summary: "일정 생성과 동기화를 위한 외부 캘린더 연동 래퍼입니다.",
      namespace: "legacy",
      packageType: "wrapper",
      requiredIntegrations: ["google-calendar-mcp"],
    },
    "solapi-mcp": {
      displayName: "Solapi SMS",
      summary: "학부모 문자 및 알림 발송을 위한 외부 연동입니다.",
      namespace: "legacy",
      packageType: "wrapper",
      requiredIntegrations: ["aligo-sms"],
    },
    "kakao-channel": {
      displayName: "카카오 채널 연동",
      summary: "카카오 채널 문의를 케이스와 응답 흐름에 연결합니다.",
      namespace: "legacy",
      packageType: "wrapper",
      requiredIntegrations: ["kakao-channel"],
    },
    "schedule-manager": {
      displayName: "일정 관리 스킬",
      summary: "수업, 상담, 보강 일정을 CRUD 형태로 다룹니다.",
      namespace: "legacy",
      packageType: "builtin",
    },
    "student-data-import": {
      displayName: "학생 데이터 가져오기",
      summary: "CSV/엑셀 기반 학생·학부모 데이터를 가져옵니다.",
      namespace: "legacy",
      packageType: "builtin",
    },
  }

  const preset = presetMap[slug]
  if (!preset) return null

  const manifest: SkillPackageManifest = {
    id: `${preset.namespace}/${slug}`,
    slug,
    namespace: preset.namespace,
    displayName: preset.displayName,
    version: "legacy",
    summary: preset.summary,
    packageType: preset.packageType,
    source: {
      kind: "manual",
    },
    compatibility: {
      agentTypes: [],
      adapters: ["claude_local"],
      locales: ["ko-KR"],
    },
    runtime: {
      injectionMode: "instructions",
      requiredIntegrations: preset.requiredIntegrations ?? [],
      requiredSecrets: [],
      requiredEnv: [],
      requiredFiles: [],
    },
    distribution: {
      exportTargets: ["codex", "claude-code", "cursor"],
      editable: false,
      publishable: false,
    },
  }

  const runtimeHealth = computeRuntimeHealth(manifest)

  return {
    id: manifest.id,
    slug: manifest.slug,
    namespace: manifest.namespace,
    displayName: manifest.displayName,
    version: manifest.version,
    summary: manifest.summary,
    packageType: manifest.packageType,
    source: manifest.source,
    compatibility: manifest.compatibility,
    distribution: manifest.distribution,
    installed: true,
    sourceBadge: "Legacy",
    runtimeHealth,
    ready: runtimeHealth.every((item) => item.ready),
    mountedAgents: [],
    fileCount: 0,
  }
}

export async function getSkillDetail(db: Db, slug: string, orgId?: string) {
  const pkg = await resolvePackage(db, slug, orgId)
  return {
    id: pkg.manifest.id,
    slug: pkg.manifest.slug,
    namespace: pkg.manifest.namespace,
    displayName: pkg.manifest.displayName,
    version: pkg.manifest.version,
    summary: pkg.manifest.summary,
    packageType: pkg.manifest.packageType,
    source: pkg.manifest.source,
    compatibility: pkg.manifest.compatibility,
    runtime: pkg.manifest.runtime,
    distribution: pkg.manifest.distribution,
    fileTree: pkg.fileTree,
    skillMarkdown: pkg.markdown,
    openaiYaml: pkg.openaiYaml,
    installed: pkg.installed,
    installation: pkg.installation,
    mountedAgents: pkg.mountedAgents,
    runtimeHealth: pkg.runtimeHealth,
    ready: pkg.ready,
    sourceBadge: pkg.sourceBadge,
    readOnly: pkg.manifest.namespace !== "hagent",
  }
}

export async function getSkillFileTree(db: Db, slug: string) {
  const pkg = await resolvePackage(db, slug)
  return pkg.fileTree
}

export async function getSkillFileContent(db: Db, slug: string, requestedPath: string) {
  const pkg = await resolvePackage(db, slug)
  const safeRelativePath = normalizeRelativePath(requestedPath)
  const targetPath = path.join(pkg.rootDir, safeRelativePath)
  const normalizedTarget = path.resolve(targetPath)
  const normalizedRoot = path.resolve(pkg.rootDir)
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error("Invalid file path")
  }
  const content = await fs.readFile(normalizedTarget, "utf8")
  return {
    path: safeRelativePath,
    content,
    language: inferLanguage(safeRelativePath),
  }
}

function inferLanguage(filePath: string) {
  if (filePath.endsWith(".md")) return "markdown"
  if (filePath.endsWith(".json")) return "json"
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) return "yaml"
  if (filePath.endsWith(".ts")) return "typescript"
  if (filePath.endsWith(".js")) return "javascript"
  if (filePath.endsWith(".sh")) return "bash"
  return "text"
}

async function resolveSkillPackageId(db: Db, slug: string) {
  try {
    const [record] = await db
      .select()
      .from(schema.skillPackages)
      .where(eq(schema.skillPackages.slug, slug))
    return record?.id ?? null
  } catch {
    return null
  }
}

export async function installSkillForOrganization(db: Db, orgId: string, slug: string) {
  const pkg = await resolvePackage(db, slug, orgId)
  const packageId = await resolveSkillPackageId(db, slug)
  if (!packageId) {
    return { installed: false, reason: "DB migration not applied" }
  }

  await db
    .insert(schema.organizationSkills)
    .values({
      organizationId: orgId,
      skillPackageId: packageId,
      status: pkg.ready ? "installed" : "inactive",
      configJson: {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.organizationSkills.organizationId, schema.organizationSkills.skillPackageId],
      set: {
        status: pkg.ready ? "installed" : "inactive",
        updatedAt: new Date(),
      },
    })

  return { installed: true, status: pkg.ready ? "installed" : "inactive" }
}

export async function uninstallSkillForOrganization(db: Db, orgId: string, slug: string) {
  const packageId = await resolveSkillPackageId(db, slug)
  if (!packageId) return

  await db
    .delete(schema.organizationSkills)
    .where(
      and(
        eq(schema.organizationSkills.organizationId, orgId),
        eq(schema.organizationSkills.skillPackageId, packageId),
      ),
    )
}

export async function updateOrganizationSkillConfig(
  db: Db,
  orgId: string,
  slug: string,
  config: Record<string, unknown>,
) {
  const packageId = await resolveSkillPackageId(db, slug)
  if (!packageId) throw new Error("Skill package is not indexed yet")

  await db
    .insert(schema.organizationSkills)
    .values({
      organizationId: orgId,
      skillPackageId: packageId,
      status: "installed",
      configJson: config,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.organizationSkills.organizationId, schema.organizationSkills.skillPackageId],
      set: {
        configJson: config,
        updatedAt: new Date(),
      },
    })
}

export async function updateAgentSkillMounts(
  db: Db,
  agentId: string,
  items: Array<{ slug: string; enabled?: boolean; mountOrder?: number }>,
) {
  const slugs = items.map((item) => item.slug)
  const packages = await listSkills(db)
  const available = new Map(packages.map((pkg) => [pkg.slug, pkg]))
  const missing = slugs.filter((slug) => !available.has(slug))
  if (missing.length > 0) {
    throw new Error(`Unknown skills: ${missing.join(", ")}`)
  }

  const packageIds = await Promise.all(
    slugs.map(async (slug) => ({ slug, id: await resolveSkillPackageId(db, slug) })),
  )
  const validPackages = packageIds.filter((entry): entry is { slug: string; id: string } => Boolean(entry.id))

  if (validPackages.length > 0) {
    await db.delete(schema.agentSkills).where(eq(schema.agentSkills.agentId, agentId))
    for (const item of items) {
      const pkg = validPackages.find((entry) => entry.slug === item.slug)
      if (!pkg) continue
      await db.insert(schema.agentSkills).values({
        agentId,
        skillPackageId: pkg.id,
        mountOrder: item.mountOrder ?? 0,
        enabled: item.enabled ?? true,
        overrideJson: {},
      })
    }
  }

  const serializedSkills = items.map((item, index) => ({
    slug: item.slug,
    enabled: item.enabled ?? true,
    mountOrder: item.mountOrder ?? index,
  }))

  const [updated] = await db
    .update(schema.agents)
    .set({
      skills: serializedSkills as unknown as any,
      updatedAt: new Date(),
    })
    .where(eq(schema.agents.id, agentId))
    .returning()

  return updated
}

export async function importSkillPackage(db: Db, payload: unknown) {
  const input = importRequestSchema.parse(payload)
  const sourceKind = coerceImportKind(input)
  const manifest: SkillPackageManifest = {
    id: `${input.namespace}/${input.slug}`,
    slug: input.slug,
    namespace: input.namespace,
    displayName: input.displayName,
    version: "0.1.0",
    summary: input.summary,
    packageType: input.packageType,
    source: {
      kind: sourceKind,
      repo: input.github_repo,
      url: input.registry_url,
      path: input.local_path,
      commit: input.sourceCommit,
      license: input.license,
      importedAt: new Date().toISOString(),
    },
    compatibility: {
      agentTypes: (input.compatibility?.agentTypes ?? []) as SkillPackageManifest["compatibility"]["agentTypes"],
      adapters: input.compatibility?.adapters ?? ["claude_local"],
      locales: input.compatibility?.locales ?? ["ko-KR"],
    },
    runtime: {
      injectionMode: input.runtime?.injectionMode ?? "instructions",
      requiredIntegrations: input.runtime?.requiredIntegrations ?? [],
      requiredSecrets: input.runtime?.requiredSecrets ?? [],
      requiredEnv: input.runtime?.requiredEnv ?? [],
      requiredFiles: input.runtime?.requiredFiles ?? [],
    },
    distribution: {
      exportTargets: ["codex", "claude-code", "cursor"],
      editable: input.namespace === "hagent",
      publishable: true,
    },
  }

  const dirPath = getSkillDir(input.namespace, input.slug)
  await fs.mkdir(path.dirname(dirPath), { recursive: true })

  if (input.local_path && (await pathExists(input.local_path))) {
    await fs.rm(dirPath, { recursive: true, force: true })
    await fs.cp(input.local_path, dirPath, { recursive: true })
  } else {
    await writeManifest(dirPath, manifest)
  }

  try {
    await db.insert(schema.skillSyncJobs).values({
      jobType: "import",
      sourceKind,
      sourceLocator: input.github_repo ?? input.github_subdir ?? input.registry_url ?? input.local_path ?? input.slug,
      status: input.local_path ? "completed" : "manual_review_required",
      resultJson: {
        message: input.local_path
          ? "Imported from local path"
          : "Remote source metadata was registered. Fetch is expected in a later privileged step.",
      } as any,
    })
  } catch {
    // no-op if migration not applied
  }

  return getSkillDetail(db, input.slug)
}

export async function forkSkillPackage(db: Db, slug: string) {
  const pkg = await resolvePackage(db, slug)
  const targetDir = getSkillDir("hagent", slug)
  await fs.rm(targetDir, { recursive: true, force: true })
  await fs.mkdir(path.dirname(targetDir), { recursive: true })
  await fs.cp(pkg.rootDir, targetDir, { recursive: true })

  const manifestPath = path.join(targetDir, "skill.package.json")
  const manifest = manifestSchema.parse(await readJsonFile(manifestPath))
  manifest.id = `hagent/${slug}`
  manifest.namespace = "hagent"
  manifest.packageType = "builtin"
  manifest.source.kind = "local"
  manifest.distribution.editable = true
  manifest.distribution.publishable = true
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

  return getSkillDetail(db, slug)
}

export async function createSkillPackage(db: Db, payload: unknown) {
  const input = createRequestSchema.parse(payload)
  const manifest: SkillPackageManifest = {
    id: `${input.namespace}/${input.slug}`,
    slug: input.slug,
    namespace: input.namespace,
    displayName: input.displayName,
    version: "0.1.0",
    summary: input.summary,
    packageType: input.packageType,
    source: {
      kind: "local",
      path: getSkillDir(input.namespace, input.slug),
      importedAt: new Date().toISOString(),
    },
    compatibility: {
      agentTypes: input.agentTypes as SkillPackageManifest["compatibility"]["agentTypes"],
      adapters: input.adapters,
      locales: input.locales,
    },
    runtime: {
      injectionMode: "instructions",
      requiredIntegrations: [],
      requiredSecrets: [],
      requiredEnv: [],
      requiredFiles: [],
    },
    distribution: {
      exportTargets: ["codex", "claude-code", "cursor"],
      editable: true,
      publishable: true,
    },
  }

  const dirPath = getSkillDir(input.namespace, input.slug)
  if (await pathExists(dirPath)) {
    throw new Error("Skill package already exists")
  }
  await writeManifest(dirPath, manifest)
  return getSkillDetail(db, input.slug)
}

export async function exportSkillPackage(db: Db, slug: string, target: "codex" | "claude-code" | "cursor") {
  const pkg = await resolvePackage(db, slug)
  const files = await flattenFileTree(pkg.rootDir, pkg.fileTree)
  return {
    target,
    bundleName: `${pkg.manifest.slug}-${target}.json`,
    files,
    source: pkg.manifest.source,
  }
}

async function flattenFileTree(rootDir: string, nodes: SkillFileNode[]) {
  const output: Array<{ path: string; content: string }> = []
  for (const node of nodes) {
    if (node.type === "directory") {
      output.push(...(await flattenFileTree(rootDir, node.children ?? [])))
      continue
    }
    output.push({
      path: node.path,
      content: await fs.readFile(path.join(rootDir, node.path), "utf8"),
    })
  }
  return output
}

export async function runSkillSyncCheck(db: Db, slug: string) {
  const pkg = await resolvePackage(db, slug)
  try {
    await db.insert(schema.skillSyncJobs).values({
      skillPackageId: await resolveSkillPackageId(db, slug),
      jobType: "sync-check",
      sourceKind: pkg.manifest.source.kind,
      sourceLocator: pkg.manifest.source.repo ?? pkg.manifest.source.url ?? pkg.manifest.source.path ?? pkg.manifest.id,
      status: "manual_review_required",
      resultJson: {
        pinnedCommit: pkg.manifest.source.commit ?? null,
        note: "Remote upstream verification requires network-enabled execution.",
      } as any,
    })
  } catch {
    // no-op
  }

  return {
    slug: pkg.manifest.slug,
    source: pkg.manifest.source,
    status: "manual_review_required",
    note: "Remote upstream verification requires network-enabled execution.",
  }
}

export async function getAgentMountedSkills(db: Db, agentId: string) {
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId))
  if (!agent) throw new Error("Agent not found")

  const allPackages = await listSkills(db, agent.organizationId)
  const bySlug = new Map(allPackages.map((item) => [item.slug, item]))

  try {
    const rows = await db
      .select({
        slug: schema.skillPackages.slug,
        mountOrder: schema.agentSkills.mountOrder,
        enabled: schema.agentSkills.enabled,
      })
      .from(schema.agentSkills)
      .innerJoin(schema.skillPackages, eq(schema.agentSkills.skillPackageId, schema.skillPackages.id))
      .where(eq(schema.agentSkills.agentId, agentId))

    if (rows.length > 0) {
      return rows
        .map((row) => ({ ...row, meta: bySlug.get(row.slug) }))
        .filter((row): row is { slug: string; mountOrder: number; enabled: boolean; meta: NonNullable<(typeof row)["meta"]> } => Boolean(row.meta))
        .map((row) => ({
          ...row.meta,
          mountOrder: row.mountOrder,
          enabled: row.enabled,
        }))
    }
  } catch {
    // fall through to legacy skills[]
  }

  const rawSkills = Array.isArray(agent.skills) ? (agent.skills as unknown[]) : []
  return rawSkills
    .map((item, index) => {
      const slug =
        typeof item === "string"
          ? item
          : item && typeof item === "object" && typeof (item as { slug?: unknown }).slug === "string"
          ? (item as { slug: string }).slug
          : null
      if (!slug) return null
      const meta = bySlug.get(slug) ?? buildLegacySkillStub(slug)
      if (!meta) return null
      return {
        ...meta,
        mountOrder: typeof item === "object" && item && "mountOrder" in item ? Number((item as { mountOrder?: number }).mountOrder ?? index) : index,
        enabled: typeof item === "object" && item && "enabled" in item ? Boolean((item as { enabled?: boolean }).enabled) : true,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}
