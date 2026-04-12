// v0.4.0
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { useToast } from "@/context/ToastContext"
import { documentsApi } from "@/api/documents"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileText, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react"

interface Document {
  id: string
  title: string
  category: string
  body: string
  updatedAt?: string
  updated_at?: string
  tags?: string[]
  rawTags?: string[]
  author?: string
  documentScope?: "knowledge_base" | "project" | "case"
  documentScopeLabel?: string
  documentRole?: "knowledge_base" | "project_brief" | "project_artifact" | "case_artifact"
  documentRoleLabel?: string
  linkedCase?: {
    id: string
    identifier: string
    title: string
    type: string
    status: string
  } | null
  linkedProject?: {
    id: string
    name: string
    color?: string | null
  } | null
  runId?: string | null
  artifactType?: string | null
  statusTag?: string | null
  versionTag?: string | null
  aiGenerated?: boolean
}

interface CategoryOption {
  value: string
  label: string
}

interface ScopeOption {
  value: "all" | "knowledge_base" | "project" | "case"
  label: string
}

const INITIAL_CATEGORIES: CategoryOption[] = [
  { value: "all", label: "전체" },
  { value: "policy", label: "정책" },
  { value: "faq", label: "FAQ" },
  { value: "manual", label: "매뉴얼" },
  { value: "script", label: "상담 스크립트" },
  { value: "general", label: "일반" },
]

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  policy: { bg: "var(--status-info-soft)", color: "var(--color-info)" },
  faq: { bg: "var(--status-success-soft)", color: "var(--color-success)" },
  manual: { bg: "var(--status-warning-soft)", color: "var(--color-warning)" },
  script: { bg: "var(--accent-primary-soft)", color: "var(--color-primary)" },
  general: { bg: "var(--bg-muted)", color: "var(--text-secondary)" },
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { value: "all", label: "전체" },
  { value: "knowledge_base", label: "지식베이스" },
  { value: "project", label: "프로젝트" },
  { value: "case", label: "케이스 산출물" },
]

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  knowledge_base: { bg: "var(--status-info-soft)", color: "var(--color-info)" },
  project_brief: { bg: "var(--accent-primary-soft)", color: "var(--color-primary)" },
  project_artifact: { bg: "var(--status-warning-soft)", color: "var(--color-warning)" },
  case_artifact: { bg: "var(--status-warning-soft)", color: "var(--color-warning)" },
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizeDocument(doc: any): Document {
  return {
    id: String(doc.id ?? `doc-${Date.now()}`),
    title: String(doc.title ?? "제목 없는 문서"),
    category: String(doc.category ?? "general"),
    body: String(doc.body ?? ""),
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : undefined,
    updated_at: typeof doc.updated_at === "string" ? doc.updated_at : undefined,
    tags: Array.isArray(doc.tags) ? doc.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
    rawTags: Array.isArray(doc.rawTags) ? doc.rawTags.filter((tag: unknown): tag is string => typeof tag === "string") : undefined,
    author: typeof doc.author === "string" ? doc.author : undefined,
    documentScope: doc.documentScope === "project" || doc.documentScope === "case" || doc.documentScope === "knowledge_base"
      ? doc.documentScope
      : "knowledge_base",
    documentScopeLabel: typeof doc.documentScopeLabel === "string" ? doc.documentScopeLabel : "지식베이스",
    documentRole:
      doc.documentRole === "project_brief"
      || doc.documentRole === "project_artifact"
      || doc.documentRole === "case_artifact"
      || doc.documentRole === "knowledge_base"
        ? doc.documentRole
        : "knowledge_base",
    documentRoleLabel: typeof doc.documentRoleLabel === "string" ? doc.documentRoleLabel : "지식베이스",
    linkedCase:
      doc.linkedCase && typeof doc.linkedCase === "object"
        ? {
            id: String(doc.linkedCase.id ?? ""),
            identifier: String(doc.linkedCase.identifier ?? ""),
            title: String(doc.linkedCase.title ?? ""),
            type: String(doc.linkedCase.type ?? ""),
            status: String(doc.linkedCase.status ?? ""),
          }
        : null,
    linkedProject:
      doc.linkedProject && typeof doc.linkedProject === "object"
        ? {
            id: String(doc.linkedProject.id ?? ""),
            name: String(doc.linkedProject.name ?? ""),
            color: typeof doc.linkedProject.color === "string" ? doc.linkedProject.color : null,
          }
        : null,
    runId: typeof doc.runId === "string" ? doc.runId : null,
    artifactType: typeof doc.artifactType === "string" ? doc.artifactType : null,
    statusTag: typeof doc.statusTag === "string" ? doc.statusTag : null,
    versionTag: typeof doc.versionTag === "string" ? doc.versionTag : null,
    aiGenerated: Boolean(doc.aiGenerated),
  }
}

function mergeCategories(base: CategoryOption[], docs: Document[]) {
  const seen = new Set(base.map((category) => category.value))
  const next = [...base]

  for (const doc of docs) {
    if (!doc.category || seen.has(doc.category)) continue
    seen.add(doc.category)
    next.push({ value: doc.category, label: doc.category })
  }

  return next
}

function isAiGenerated(doc: Document) {
  return doc.aiGenerated || doc.author === "AI" || doc.tags?.includes("ai-generated")
}

function getCaseId(doc: Document) {
  return doc.linkedCase?.id ?? doc.tags?.find((tag) => tag.startsWith("case:"))?.slice(5) ?? null
}

function getProjectId(doc: Document) {
  return doc.linkedProject?.id ?? doc.tags?.find((tag) => tag.startsWith("project:"))?.slice(8) ?? null
}

function getVisibleTags(doc: Document) {
  return (doc.rawTags ?? doc.tags ?? []).filter((tag) => tag !== "ai-generated")
}

function getDocumentConnectionSummary(doc: Document) {
  if (doc.linkedCase && doc.linkedProject) {
    return `${doc.linkedProject.name} / ${doc.linkedCase.identifier}`
  }
  if (doc.linkedProject) {
    return doc.linkedProject.name
  }
  if (doc.linkedCase) {
    return `${doc.linkedCase.identifier} · ${doc.linkedCase.title}`
  }
  return "공통 지식베이스"
}

function RoleBadge({ doc }: { doc: Document }) {
  const cfg = ROLE_COLORS[doc.documentRole ?? "knowledge_base"] ?? ROLE_COLORS.knowledge_base
  return (
    <Badge className="text-xs border-0 px-2 py-0.5" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {doc.documentRoleLabel ?? "지식베이스"}
    </Badge>
  )
}

function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-base font-bold mt-5 mb-2 first:mt-0"
          style={{ color: "var(--text-primary)" }}
        >
          {line.slice(3)}
        </h2>
      )
      i++
      continue
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-sm font-semibold mt-4 mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          {line.slice(4)}
        </h3>
      )
      i++
      continue
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="text-lg font-bold mt-4 mb-2 first:mt-0"
          style={{ color: "var(--text-primary)" }}
        >
          {line.slice(2)}
        </h1>
      )
      i++
      continue
    }

    if (/^[-*] /.test(line)) {
      const listItems: ReactNode[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        listItems.push(
          <li key={i} className="text-sm leading-relaxed ml-4" style={{ color: "var(--text-secondary)" }}>
            <InlineMarkdown text={lines[i].slice(2)} />
          </li>
        )
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2">
          {listItems}
        </ul>
      )
      continue
    }

    if (/^\d+\. /.test(line)) {
      const listItems: ReactNode[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const match = lines[i].match(/^\d+\. (.*)$/)
        listItems.push(
          <li key={i} className="text-sm leading-relaxed ml-4" style={{ color: "var(--text-secondary)" }}>
            <InlineMarkdown text={match ? match[1] : lines[i]} />
          </li>
        )
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2">
          {listItems}
        </ol>
      )
      continue
    }

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    elements.push(
      <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <InlineMarkdown text={line} />
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

function InlineMarkdown({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    const token = match[0]
    if (token.startsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: "var(--bg-muted)", color: "var(--color-primary)" }}
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    last = match.index + token.length
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return <>{parts}</>
}

function CategoryBadge({
  category,
  categories,
}: {
  category: string
  categories: CategoryOption[]
}) {
  const cfg = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general
  const label = categories.find((item) => item.value === category)?.label ?? category
  return (
    <Badge
      className="text-xs border-0 px-2 py-0.5"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {label}
    </Badge>
  )
}

function formatDate(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

function slugifyFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
}

function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}

function inferTitleFromMarkdown(text: string, fallbackFileName: string) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || fileNameWithoutExtension(fallbackFileName) || "제목 없는 문서"
}

function toMarkdownBundle(docs: Document[]) {
  return docs.map((doc) => {
    const frontmatter = [
      "---",
      `title: ${doc.title}`,
      `category: ${doc.category}`,
      ...(doc.tags?.length ? [`tags: [${doc.tags.join(", ")}]`] : []),
      "---",
      "",
    ]

    const body = doc.body.trim().startsWith("#")
      ? doc.body.trim()
      : `# ${doc.title}\n\n${doc.body.trim()}`

    return [...frontmatter, body].join("\n")
  }).join("\n\n---\n\n")
}

async function readFileAsBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return window.btoa(binary)
}

function NewDocDialog({
  open,
  onClose,
  onCreated,
  categories,
}: {
  open: boolean
  onClose: () => void
  onCreated: (doc: Document) => void
  categories: CategoryOption[]
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("general")
  const [body, setBody] = useState("")

  const handleSubmit = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    onCreated({
      id: `tmp-${Date.now()}`,
      title: title.trim(),
      category,
      body,
      updatedAt: now,
    })
    setTitle("")
    setCategory("general")
    setBody("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>새 문서</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Input
            placeholder="문서 제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter((item) => item.value !== "all").map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="문서 내용을 입력하세요..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)", resize: "vertical" }}
          />
          <div className="flex gap-2 justify-end mt-1">
            <Button variant="ghost" size="sm" onClick={onClose} style={{ color: "var(--text-secondary)" }}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={!title.trim()}
              onClick={handleSubmit}
              style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { setPanelContent, openPanel } = usePanel()
  const { addToast } = useToast()
  const { id: routeDocId, orgPrefix } = useParams<{ id?: string; orgPrefix: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [activeCategory, setActiveCategory] = useState("all")
  const [activeScope, setActiveScope] = useState<ScopeOption["value"]>("knowledge_base")
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [localDocs, setLocalDocs] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [hideCaseArtifacts, setHideCaseArtifacts] = useState(true)
  const [categories, setCategories] = useState<CategoryOption[]>(INITIAL_CATEGORIES)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editCategory, setEditCategory] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewImportDocs, setPreviewImportDocs] = useState<Document[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [pendingImportName, setPendingImportName] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "문서/지식베이스" }])
  }, [setBreadcrumbs])

  const { data: apiDocs } = useQuery({
    queryKey: queryKeys.documents.list(activeOrgId ?? ""),
    queryFn: () => documentsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
    retry: false,
  })

  useEffect(() => {
    const nextDocs = (apiDocs as Document[] | undefined)?.length
      ? (apiDocs as any[]).map(normalizeDocument)
      : []

    setLocalDocs(nextDocs)
    setCategories((prev) => mergeCategories(prev, nextDocs))
  }, [apiDocs])

  useEffect(() => {
    if (routeDocId) {
      setSelectedDocId(routeDocId)
    }
  }, [routeDocId])

  const allDocs = localDocs

  const categoryFiltered = activeCategory === "all"
    ? allDocs
    : allDocs.filter((doc) => doc.category === activeCategory)

  const scopeFiltered = activeScope === "all"
    ? categoryFiltered
    : categoryFiltered.filter((doc) => doc.documentScope === activeScope)

  const clutterFiltered = hideCaseArtifacts
    ? scopeFiltered.filter((doc) => doc.documentRole !== "case_artifact")
    : scopeFiltered

  const filtered = clutterFiltered.filter((doc) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return doc.title.toLowerCase().includes(query) || doc.body.toLowerCase().includes(query)
  })

  const groupedDocs = useMemo(
    () =>
      SCOPE_OPTIONS.filter((option) => option.value !== "all")
        .map((option) => ({
          ...option,
          docs: filtered.filter((doc) => doc.documentScope === option.value),
        }))
        .filter((section) => activeScope === "all" ? section.docs.length > 0 : section.value === activeScope),
    [activeScope, filtered],
  )

  const displayDoc = useMemo(
    () => allDocs.find((doc) => doc.id === selectedDocId) ?? null,
    [allDocs, selectedDocId]
  )

  useEffect(() => {
    if (!displayDoc) {
      setIsEditing(false)
      return
    }

    setEditTitle(displayDoc.title)
    setEditBody(displayDoc.body)
    setEditCategory(displayDoc.category)
  }, [displayDoc])

  const replaceDocument = (id: string, updater: (doc: Document) => Document) => {
    setLocalDocs((prev) => prev.map((doc) => (doc.id === id ? updater(doc) : doc)))
  }

  const handleSaveDocument = async () => {
    if (!displayDoc || !activeOrgId || !editTitle.trim()) return

    const now = new Date().toISOString()
    const nextDoc: Document = {
      ...displayDoc,
      title: editTitle.trim(),
      body: editBody,
      category: editCategory,
      updatedAt: now,
      updated_at: undefined,
    }

    setIsSaving(true)
    replaceDocument(displayDoc.id, () => nextDoc)
    setCategories((prev) => mergeCategories(prev, [nextDoc]))

    try {
      const saved = normalizeDocument(await documentsApi.update(displayDoc.id, {
        title: nextDoc.title,
        body: nextDoc.body,
        category: nextDoc.category,
      }))
      replaceDocument(displayDoc.id, () => saved)

      addToast("문서를 저장했습니다.", "success")
    } catch {
      await delay(500)
      addToast("문서를 mock 상태로 저장했습니다.", "info")
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  const handleDeleteDocument = async () => {
    if (!displayDoc || !activeOrgId) return

    setIsDeleting(true)
    const deletingId = displayDoc.id

    try {
      await documentsApi.delete(deletingId)
    } catch {
      await delay(500)
      addToast("문서를 mock 상태로 삭제했습니다.", "info")
    }

    setLocalDocs((prev) => prev.filter((doc) => doc.id !== deletingId))
    setSelectedDocId((current) => (current === deletingId ? null : current))
    setShowDeleteDialog(false)
    setIsDeleting(false)
    setIsEditing(false)
    addToast("문서를 삭제했습니다.", "success")
  }

  const handleAddCategory = () => {
    const label = window.prompt("추가할 카테고리 이름을 입력하세요.")
    if (!label) return

    const trimmed = label.trim()
    if (!trimmed) return

    const value = trimmed.toLowerCase().replace(/\s+/g, "-")
    setCategories((prev) => {
      if (prev.find((category) => category.value === value || category.label === trimmed)) {
        return prev
      }
      return [...prev, { value, label: trimmed }]
    })
    setEditCategory(value)
    addToast(`${trimmed} 카테고리를 추가했습니다.`, "success")
  }

  const handleExport = () => {
    const docsToExport = displayDoc && filtered.some((doc) => doc.id === displayDoc.id) ? [displayDoc] : filtered
    const markdown = toMarkdownBundle(docsToExport)
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = docsToExport.length === 1
      ? `${slugifyFileName(docsToExport[0].title)}.md`
      : "knowledge-base-export.md"
    link.click()
    URL.revokeObjectURL(url)
    addToast(`${docsToExport.length}개 문서를 Markdown으로 내보냈습니다.`, "success")
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    try {
      setIsImporting(true)
      const clientSideDocs: Document[] = []
      const serverSideFiles: Array<{ fileName: string; mimeType: string; contentBase64: string }> = []

      for (const file of files) {
        const lowerName = file.name.toLowerCase()

        if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
          const text = await file.text()
          clientSideDocs.push(normalizeDocument({
            id: `import-${file.name}-${Date.now()}`,
            title: inferTitleFromMarkdown(text, file.name),
            body: text.trim(),
            category: "general",
          }))
          continue
        }

        if (lowerName.endsWith(".txt")) {
          const text = await file.text()
          const title = fileNameWithoutExtension(file.name) || "제목 없는 문서"
          clientSideDocs.push(normalizeDocument({
            id: `import-${file.name}-${Date.now()}`,
            title,
            body: `# ${title}\n\n${text.trim()}`,
            category: "general",
          }))
          continue
        }

        if (lowerName.endsWith(".json")) {
          const text = await file.text()
          const parsed = JSON.parse(text)
          const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.documents) ? parsed.documents : []
          clientSideDocs.push(...list.map(normalizeDocument))
          continue
        }

        if (lowerName.endsWith(".docx")) {
          serverSideFiles.push({
            fileName: file.name,
            mimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            contentBase64: await readFileAsBase64(file),
          })
          continue
        }

        throw new Error(`지원하지 않는 파일 형식: ${file.name}`)
      }

      let docs = [...clientSideDocs]
      if (serverSideFiles.length > 0) {
        const response = await documentsApi.importPreview(serverSideFiles)
        docs = [...docs, ...response.documents.map(normalizeDocument)]
      }

      setPreviewImportDocs(docs)
      setPendingImportName(files.map((file) => file.name).join(", "))
      setShowImportPreview(true)
    } catch (error) {
      addToast(error instanceof Error ? error.message : "문서를 불러오지 못했습니다.", "error")
    } finally {
      setIsImporting(false)
      event.target.value = ""
    }
  }

  const confirmImport = async () => {
    if (previewImportDocs.length === 0) return

    setIsImporting(true)
    try {
      let importedDocs = previewImportDocs

      if (activeOrgId) {
        importedDocs = await Promise.all(
          previewImportDocs.map((doc) =>
            documentsApi.create(activeOrgId, {
              title: doc.title,
              body: doc.body,
              category: doc.category,
              tags: doc.tags ?? [],
            }).then(normalizeDocument)
          )
        )
      }

      setLocalDocs((prev) => {
        const map = new Map(prev.map((doc) => [doc.id, doc]))
        for (const doc of importedDocs) {
          map.set(doc.id, doc)
        }
        return Array.from(map.values())
      })
      setCategories((prev) => mergeCategories(prev, importedDocs))
      if (importedDocs[0]) {
        setSelectedDocId(importedDocs[0].id)
      }
      addToast(`${importedDocs.length}개 문서를 가져왔습니다.`, "success")
      setShowImportPreview(false)
      setPreviewImportDocs([])
      setPendingImportName("")
    } catch {
      addToast("문서 가져오기에 실패했습니다.", "error")
    } finally {
      setIsImporting(false)
    }
  }

  const caseId = displayDoc ? getCaseId(displayDoc) : null
  const projectId = displayDoc ? getProjectId(displayDoc) : null

  const triggerKnowledgeAction = (actionLabel: string) => {
    if (!displayDoc) return

    const caseLinked = Boolean(caseId)
    const messages: Record<string, string> = {
      "FAQ로 활용": `"${displayDoc.title}" 문서를 FAQ 응답 흐름에 연결했습니다.`,
      "상담 답변 초안 생성": `"${displayDoc.title}" 기반 상담 답변 초안 생성을 요청했습니다.`,
      "관련 케이스에 연결": caseLinked
        ? "관련 케이스 화면으로 이동합니다."
        : "먼저 연결할 케이스를 지정해 주세요. 현재는 관련 케이스 태그가 없습니다.",
      "AI 팀에게 보완 요청": `"${displayDoc.title}" 문서 보완 요청을 AI 팀 대기열에 올렸습니다.`,
      "법령 검토": `"${displayDoc.title}" 문서를 기준으로 법령 검토를 시작합니다.`,
      "공지 초안": `"${displayDoc.title}" 내용을 바탕으로 공지 초안 생성을 시작합니다.`,
    }

    if (actionLabel === "관련 케이스에 연결" && caseLinked) {
      window.location.assign(`/${orgPrefix}/cases/${caseId}`)
      return
    }

    addToast(messages[actionLabel] ?? `${actionLabel} 작업을 시작했습니다.`, caseLinked ? "success" : "info")
  }

  const panelContent = useMemo(() => {
    if (!displayDoc) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              문서를 선택하세요
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              선택한 문서의 빠른 작업과 연결 정보만 보여줍니다.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              size="sm"
              className="justify-start"
              onClick={() => setShowNewDialog(true)}
            >
              새 문서 작성
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              문서 가져오기
            </Button>
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
            <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
              현재 범위
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              {allDocs.length}개 문서 중 {filtered.length}개가 현재 조건에 맞습니다.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            빠른 작업
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            현재 문서에 대한 최소한의 운영 액션만 제공합니다.
          </p>
        </div>

        <div className="space-y-2">
          {["FAQ로 활용", "상담 답변 초안 생성", "관련 케이스에 연결", "AI 팀에게 보완 요청"].map((label) => (
            <Button
              key={label}
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => triggerKnowledgeAction(label)}
            >
              {label}
            </Button>
          ))}
          {projectId && (
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => window.location.assign(`/${orgPrefix}/projects/${projectId}`)}
            >
              연결 프로젝트 보기
            </Button>
          )}
          {caseId && (
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => window.location.assign(`/${orgPrefix}/cases/${caseId}`)}
            >
              관련 케이스 보기
            </Button>
          )}
        </div>
      </div>
    )
  }, [allDocs.length, caseId, displayDoc, filtered.length, orgPrefix, projectId, setShowNewDialog, triggerKnowledgeAction])

  const panelContentKey = useMemo(
    () =>
      JSON.stringify({
        displayDocId: displayDoc?.id ?? null,
        allDocCount: allDocs.length,
        filteredCount: filtered.length,
        categoryCount: categories.length,
        caseId: caseId ?? null,
        projectId: projectId ?? null,
      }),
    [allDocs.length, caseId, categories.length, displayDoc?.id, filtered.length, projectId],
  )

  useEffect(() => {
    openPanel()
  }, [openPanel])

  useEffect(() => {
    setPanelContent(panelContent)
    return () => setPanelContent(null)
  }, [panelContentKey, setPanelContent])

  return (
    <div className="h-full p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="문서/지식베이스"
        description="운영용 문서를 분류하고 케이스와 프로젝트에 연결합니다."
        action={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload size={14} />
              문서 가져오기
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowNewDialog(true)}>
              <Plus size={14} />
              새 문서
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" aria-label="문서 더보기">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={handleExport}>
                  <Download size={14} />
                  Markdown 내보내기
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddCategory}>카테고리 추가</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md,.markdown,.txt,.docx"
        multiple
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(340px,380px)_minmax(0,1fr)]">
        <WorkspacePanel className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-w-[340px]">
          <div className="space-y-4 border-b p-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="문서 검색"
                className="w-full rounded-md border px-9 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-muted)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {SCOPE_OPTIONS.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => setActiveScope(scope.value)}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={
                    activeScope === scope.value
                      ? {
                          backgroundColor: "var(--accent-primary-soft)",
                          color: "var(--color-primary)",
                        }
                      : {
                          backgroundColor: "var(--bg-muted)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {scope.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={
                    activeCategory === category.value
                      ? {
                          backgroundColor: "var(--color-primary)",
                          color: "var(--text-on-primary)",
                        }
                      : {
                          backgroundColor: "var(--bg-muted)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {hideCaseArtifacts ? "케이스 산출물 숨김" : "케이스 산출물 포함"} · {filtered.length}개
              </p>
              <Button size="sm" variant="ghost" className="px-2" onClick={() => setHideCaseArtifacts((current) => !current)}>
                {hideCaseArtifacts ? "포함" : "숨김"}
              </Button>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {filtered.length === 0 ? (
              <div className="p-4">
                <WorkspaceEmptyState
                  icon={<FileText size={20} />}
                  title="문서가 없습니다"
                  description="필터를 바꾸거나 새 문서를 만들어 운영 문서를 채우세요."
                  className="min-h-[240px]"
                />
              </div>
            ) : (
              <div className="p-2">
                {groupedDocs.map((section) => (
                  <div key={section.value} className="space-y-2 py-2 first:pt-0">
                    <div className="flex items-center justify-between gap-2 px-2">
                      <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                        {section.label}
                      </p>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {section.docs.length}개
                      </span>
                    </div>

                    <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                      {section.docs.map((doc) => {
                        const updatedAt = doc.updatedAt ?? doc.updated_at
                        const isActive = displayDoc?.id === doc.id

                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDocId(doc.id)}
                            className="w-full px-3 py-3 text-left transition-colors"
                            style={{
                              backgroundColor: isActive ? "var(--accent-primary-soft)" : "transparent",
                              boxShadow: isActive ? "inset 2px 0 0 var(--color-primary)" : "none",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <p
                                  className="truncate text-sm font-medium"
                                  style={{ color: isActive ? "var(--color-primary)" : "var(--text-primary)" }}
                                >
                                  {doc.title}
                                </p>
                                <p className="truncate text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                                  {getDocumentConnectionSummary(doc)}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                                  <span>{doc.documentRoleLabel ?? "지식베이스"}</span>
                                  {updatedAt ? <span>· {formatDate(updatedAt)}</span> : null}
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <CategoryBadge category={doc.category} categories={categories} />
                                {isAiGenerated(doc) ? (
                                  <Badge
                                    className="border-0 px-2 py-0.5 text-xs"
                                    style={{ backgroundColor: "var(--accent-primary-soft)", color: "var(--color-primary)" }}
                                  >
                                    AI 생성
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </WorkspacePanel>

        <WorkspacePanel className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {displayDoc ? (
            <>
              <div className="border-b p-6 md:p-8" style={{ borderColor: "var(--border-default)" }}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge doc={displayDoc} />
                      <CategoryBadge category={displayDoc.category} categories={categories} />
                      {isAiGenerated(displayDoc) ? (
                        <Badge
                          className="border-0 px-2 py-0.5 text-xs"
                          style={{ backgroundColor: "var(--accent-primary-soft)", color: "var(--color-primary)" }}
                        >
                          AI 생성
                        </Badge>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-default)",
                          color: "var(--text-primary)",
                        }}
                      />
                    ) : (
                      <h2 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                        {displayDoc.title}
                      </h2>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <span>작성자 {displayDoc.author ?? "미기록"}</span>
                      <span>수정 {formatDate(displayDoc.updatedAt ?? displayDoc.updated_at) || "미기록"}</span>
                      {caseId ? (
                        <button
                          type="button"
                          className="underline underline-offset-2"
                          style={{ color: "var(--color-primary)" }}
                          onClick={() => window.location.assign(`/${orgPrefix}/cases/${caseId}`)}
                        >
                          관련 케이스 보기
                        </button>
                      ) : null}
                      {projectId ? (
                        <button
                          type="button"
                          className="underline underline-offset-2"
                          style={{ color: "var(--color-primary)" }}
                          onClick={() => window.location.assign(`/${orgPrefix}/projects/${projectId}`)}
                        >
                          연결 프로젝트 보기
                        </button>
                      ) : null}
                    </div>

                    <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                      {displayDoc.documentScopeLabel ?? "지식베이스"} · {displayDoc.linkedProject?.name ?? "프로젝트 미연결"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          취소
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSaving || !editTitle.trim()}
                          onClick={() => void handleSaveDocument()}
                          style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                          저장
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsEditing(true)}>
                          <Pencil size={13} />
                          편집
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowDeleteDialog(true)}>
                          <Trash2 size={13} />
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 p-6 md:p-8">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                          카테고리
                        </p>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger
                            style={{
                              backgroundColor: "var(--bg-elevated)",
                              borderColor: "var(--border-default)",
                              color: "var(--text-primary)",
                            }}
                          >
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter((item) => item.value !== "all").map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                          본문
                        </p>
                        <Textarea
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                          rows={18}
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-default)",
                            color: "var(--text-primary)",
                            resize: "vertical",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {getVisibleTags(displayDoc).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {getVisibleTags(displayDoc).map((tag) => (
                            <Badge
                              key={tag}
                              className="border-0 px-2 py-0.5 text-xs"
                              style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                          본문
                        </p>
                        <div style={{ borderTop: "1px solid var(--border-default)" }} />
                        <MarkdownBody text={displayDoc.body} />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center p-6 md:p-8">
              <WorkspaceEmptyState
                icon={<FileText size={20} />}
                title="왼쪽에서 문서를 선택하세요"
                description="선택한 문서의 상세, 편집, 연결 작업을 한 화면에서 다룹니다."
                className="min-h-[240px] w-full max-w-lg"
              />
            </div>
          )}
        </WorkspacePanel>
      </div>

      <NewDocDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        categories={categories}
        onCreated={(doc) => {
          const nextDoc = normalizeDocument(doc)
          setLocalDocs((prev) => [nextDoc, ...prev])
          setCategories((prev) => mergeCategories(prev, [nextDoc]))
          setSelectedDocId(nextDoc.id)
        }}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>문서를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            삭제 후에는 복구할 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button size="sm" variant="outline" disabled={isDeleting} onClick={() => void handleDeleteDocument()}>
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
        <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>Import 미리보기</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {pendingImportName || "선택한 파일"}에서 {previewImportDocs.length}개 문서를 읽었습니다. `md`, `txt`, `docx`, `json`을 지식베이스 문서로 변환합니다.
          </p>
          <div
            className="rounded-xl p-3 max-h-64 overflow-y-auto"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            <div className="flex flex-col gap-2">
              {previewImportDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {doc.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                      {doc.id}
                    </p>
                  </div>
                  <CategoryBadge category={doc.category} categories={categories} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowImportPreview(false)}>
              취소
            </Button>
            <Button
              size="sm"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
              disabled={previewImportDocs.length === 0 || isImporting}
              onClick={() => void confirmImport()}
            >
              {isImporting && <Loader2 size={14} className="animate-spin" />}
              가져오기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
