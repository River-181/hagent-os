import type { SkillPackageManifest } from "@hagent/shared"

interface CuratedSourceEntry {
  key: string
  label: string
  repo: string
  summary: string
  aliases?: string[]
  importHint: string
}

const CURATED_SOURCES: CuratedSourceEntry[] = [
  {
    key: "korean-law-mcp",
    label: "Korean Law MCP",
    repo: "https://github.com/chrisryugj/korean-law-mcp",
    summary: "교육 법령과 환불/행정 근거를 질의 가능한 MCP source입니다.",
    aliases: ["k-education-law-lookup"],
    importHint: "법령 검토 pack이나 환불 검토 흐름에 wrapper skill로 연결합니다.",
  },
  {
    key: "hwpxskill",
    label: "HWPXSkill",
    repo: "https://github.com/Canine89/hwpxskill",
    summary: "한컴 HWPX 문서를 읽고 쓰는 한국형 문서 자동화 source입니다.",
    aliases: ["hwpx-document-processor", "hwpx-document-pack"],
    importHint: "문서 자동화 pack 또는 approval/document output 흐름에 묶습니다.",
  },
  {
    key: "k-skill",
    label: "k-skill",
    repo: "https://github.com/NomaDamas/k-skill.git",
    summary: "한국어 운영용 skill 묶음을 수입하기 위한 curated registry source입니다.",
    aliases: ["k-skill-registry", "external-skill-importer"],
    importHint: "curated upstream으로 등록한 뒤 필요한 항목만 import/fork 합니다.",
  },
]

function normalize(value?: string | null) {
  return String(value ?? "").toLowerCase()
}

export function findCuratedSource(manifest: SkillPackageManifest) {
  const repo = normalize(manifest.source.repo)
  const slug = normalize(manifest.slug)

  const matched = CURATED_SOURCES.find((entry) => {
    if (repo && repo.includes(entry.key.toLowerCase().replace(".git", ""))) return true
    if (repo && repo.includes(normalize(entry.repo).replace(".git", ""))) return true
    if (slug === normalize(entry.key)) return true
    return (entry.aliases ?? []).some((alias) => normalize(alias) === slug)
  })

  if (!matched) return null
  return {
    key: matched.key,
    label: matched.label,
    repo: matched.repo,
    summary: matched.summary,
    importHint: matched.importHint,
  }
}

