import * as schema from "@hagent/db"

type DocumentRecord = typeof schema.documents.$inferSelect
type CaseRecord = typeof schema.cases.$inferSelect
type ProjectRecord = typeof schema.opsGroups.$inferSelect

type DocumentScope = "knowledge_base" | "project" | "case"
type DocumentRole = "knowledge_base" | "project_brief" | "project_artifact" | "case_artifact"

interface ParsedDocumentTags {
  caseId: string | null
  projectId: string | null
  runId: string | null
  artifactType: string | null
  statusTag: string | null
  versionTag: string | null
  aiGenerated: boolean
  rawTags: string[]
}

export interface EnrichedDocument extends DocumentRecord {
  content: string
  rawTags: string[]
  documentScope: DocumentScope
  documentScopeLabel: string
  documentRole: DocumentRole
  documentRoleLabel: string
  linkedCase: {
    id: string
    identifier: string
    title: string
    type: string
    status: string
  } | null
  linkedProject: {
    id: string
    name: string
    color: string | null
  } | null
  runId: string | null
  artifactType: string | null
  statusTag: string | null
  versionTag: string | null
  aiGenerated: boolean
}

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : []
}

function parseDocumentTags(document: DocumentRecord): ParsedDocumentTags {
  const rawTags = normalizeTags(document.tags)
  return {
    caseId: rawTags.find((tag) => tag.startsWith("case:"))?.slice(5) ?? null,
    projectId: rawTags.find((tag) => tag.startsWith("project:"))?.slice(8) ?? null,
    runId: rawTags.find((tag) => tag.startsWith("run:"))?.slice(4) ?? null,
    artifactType: rawTags.find((tag) => tag.startsWith("artifact:"))?.slice(9) ?? null,
    statusTag: rawTags.find((tag) => tag.startsWith("status:"))?.slice(7) ?? null,
    versionTag: rawTags.find((tag) => tag.startsWith("version:"))?.slice(8) ?? null,
    aiGenerated: rawTags.includes("ai-generated"),
    rawTags,
  }
}

function resolveDocumentRole(parsed: ParsedDocumentTags): {
  documentScope: DocumentScope
  documentScopeLabel: string
  documentRole: DocumentRole
  documentRoleLabel: string
} {
  if (parsed.artifactType === "project-brief") {
    return {
      documentScope: "project",
      documentScopeLabel: "프로젝트",
      documentRole: "project_brief",
      documentRoleLabel: "프로젝트 브리프",
    }
  }

  if (parsed.caseId) {
    return {
      documentScope: "case",
      documentScopeLabel: "케이스",
      documentRole: "case_artifact",
      documentRoleLabel: "케이스 산출물",
    }
  }

  if (parsed.projectId) {
    return {
      documentScope: "project",
      documentScopeLabel: "프로젝트",
      documentRole: "project_artifact",
      documentRoleLabel: "프로젝트 문서",
    }
  }

  return {
    documentScope: "knowledge_base",
    documentScopeLabel: "지식베이스",
    documentRole: "knowledge_base",
    documentRoleLabel: "지식베이스",
  }
}

export function enrichDocuments(
  documents: DocumentRecord[],
  {
    cases = [],
    projects = [],
  }: {
    cases?: CaseRecord[]
    projects?: ProjectRecord[]
  } = {},
): EnrichedDocument[] {
  const caseMap = new Map(cases.map((item) => [item.id, item]))
  const projectMap = new Map(projects.map((item) => [item.id, item]))

  return documents.map((document) => {
    const parsed = parseDocumentTags(document)
    const role = resolveDocumentRole(parsed)
    const linkedCaseRecord = parsed.caseId ? caseMap.get(parsed.caseId) ?? null : null
    const linkedProjectRecord = parsed.projectId ? projectMap.get(parsed.projectId) ?? null : null

    return {
      ...document,
      content: document.body,
      ...role,
      rawTags: parsed.rawTags,
      linkedCase: linkedCaseRecord
        ? {
            id: linkedCaseRecord.id,
            identifier: linkedCaseRecord.identifier,
            title: linkedCaseRecord.title,
            type: linkedCaseRecord.type,
            status: linkedCaseRecord.status,
          }
        : null,
      linkedProject: linkedProjectRecord
        ? {
            id: linkedProjectRecord.id,
            name: linkedProjectRecord.name,
            color: linkedProjectRecord.color ?? null,
          }
        : null,
      runId: parsed.runId,
      artifactType: parsed.artifactType,
      statusTag: parsed.statusTag,
      versionTag: parsed.versionTag,
      aiGenerated: parsed.aiGenerated,
    }
  })
}
