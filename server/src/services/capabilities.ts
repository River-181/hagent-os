import type { Db } from "@hagent/db"
import { getAdapterStatuses, getIntegrationStatuses, getPluginStatuses } from "./control-plane-registry.js"
import { getSkillDetail, listSkills } from "./skills.js"

export async function listCapabilities(db: Db, orgId?: string) {
  const [skills, integrations, runtimes, plugins] = await Promise.all([
    listSkills(db, orgId),
    Promise.resolve(getIntegrationStatuses()),
    Promise.resolve(getAdapterStatuses()),
    Promise.resolve(getPluginStatuses()),
  ])

  const capabilitySkills = skills.map((item) => ({
    ...item,
    capabilityType: item.capabilityType ?? (item.packageType === "composite" ? "pack" : "skill"),
    statusLabel: item.ready ? "사용 가능" : "설정 필요",
  }))

  const capabilityIntegrations = integrations.map((item) => ({
    id: `integration/${item.key}`,
    slug: item.key,
    displayName: item.label,
    summary: item.description,
    capabilityType: "integration" as const,
    category: item.category,
    installed: item.installed,
    connected: item.connected,
    ready: item.connected,
    missingEnv: item.missingEnv,
    command: item.command ?? null,
    sourceBadge: item.installed ? "Built-in" : "External",
    pluginKeys: plugins
      .filter((plugin) => plugin.category === "integration" || plugin.connected)
      .map((plugin) => plugin.key),
  }))

  const capabilityRuntimes = runtimes.map((item) => ({
    id: `runtime/${item.key}`,
    slug: item.key,
    displayName: item.label,
    summary: item.description,
    capabilityType: "runtime" as const,
    installed: item.installed,
    connected: item.connected,
    ready: item.connected,
    defaultModel: item.defaultModel,
    availableModels: item.availableModels,
    missingEnv: item.missingEnv,
    statusSummary: item.statusSummary,
    statusDetail: item.statusDetail,
    sourceBadge: "Built-in",
  }))

  return {
    capabilities: [...capabilitySkills, ...capabilityIntegrations, ...capabilityRuntimes],
    stats: {
      skills: capabilitySkills.filter((item) => item.capabilityType === "skill").length,
      packs: capabilitySkills.filter((item) => item.capabilityType === "pack").length,
      systems: capabilitySkills.filter((item) => item.capabilityType === "system").length,
      integrations: capabilityIntegrations.length,
      runtimes: capabilityRuntimes.length,
      ready: [...capabilitySkills, ...capabilityIntegrations, ...capabilityRuntimes].filter((item) => item.ready).length,
    },
  }
}

export async function getCapabilityDetail(db: Db, kind: string, slug: string, orgId?: string) {
  if (kind === "skill" || kind === "pack" || kind === "system") {
    const detail = await getSkillDetail(db, slug, orgId)
    return {
      ...detail,
      capabilityType: detail.capabilityType ?? (detail.packageType === "composite" ? "pack" : "skill"),
    }
  }

  if (kind === "integration") {
    const item = getIntegrationStatuses().find((entry) => entry.key === slug)
    if (!item) throw new Error("Capability not found")
    return {
      id: `integration/${item.key}`,
      slug: item.key,
      displayName: item.label,
      summary: item.description,
      capabilityType: "integration" as const,
      category: item.category,
      installed: item.installed,
      connected: item.connected,
      ready: item.connected,
      missingEnv: item.missingEnv,
      command: item.command ?? null,
    }
  }

  if (kind === "runtime") {
    const item = getAdapterStatuses().find((entry) => entry.key === slug)
    if (!item) throw new Error("Capability not found")
    return {
      id: `runtime/${item.key}`,
      slug: item.key,
      displayName: item.label,
      summary: item.description,
      capabilityType: "runtime" as const,
      installed: item.installed,
      connected: item.connected,
      ready: item.connected,
      defaultModel: item.defaultModel,
      availableModels: item.availableModels,
      missingEnv: item.missingEnv,
      statusSummary: item.statusSummary,
      statusDetail: item.statusDetail,
    }
  }

  throw new Error("Capability not found")
}
