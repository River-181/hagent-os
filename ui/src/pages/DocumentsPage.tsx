// v0.4.0
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/context/ToastContext"
import { documentsApi } from "@/api/documents"
import { orchestratorApi } from "@/api/orchestrator"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/EmptyState"
import { Download, FileText, Loader2, Pencil, Plus, Search, Trash2, Upload, Wand2 } from "lucide-react"

interface Document {
  id: string
  title: string
  category: string
  body: string
  updatedAt?: string
  updated_at?: string
  tags?: string[]
  author?: string
}

interface CategoryOption {
  value: string
  label: string
}

const FALLBACK_DOCS: Document[] = [
  {
    id: "d1",
    title: "환불 정책",
    category: "policy",
    body: "## 환불 정책\n\n수강 시작 후 7일 이내에는 전액 환불이 가능합니다.\n\n- 1개월 이내: 잔여 수업료의 2/3 환불\n- 1개월 초과: 환불 불가\n\n단, 강사 사정에 의한 수업 취소는 전액 환불됩니다.",
    updatedAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "d2",
    title: "자주 묻는 질문 (FAQ)",
    category: "faq",
    body: "## FAQ\n\n**Q. 보강 수업은 어떻게 신청하나요?**\nA. 카카오톡 채널 또는 전화로 신청 가능합니다.\n\n**Q. 결석 처리는 어떻게 되나요?**\nA. 수업 2시간 전까지 연락 시 결석 처리됩니다.",
    updatedAt: "2026-03-28T09:00:00Z",
  },
  {
    id: "d3",
    title: "신규 학생 등록 매뉴얼",
    category: "manual",
    body: "## 신규 학생 등록 절차\n\n1. 상담 예약\n2. 레벨 테스트 (40분)\n3. 수업 일정 협의\n4. 수강료 결제\n5. 반 배정 및 교재 지급",
    updatedAt: "2026-03-20T14:00:00Z",
  },
  {
    id: "d4",
    title: "상담 전화 스크립트",
    category: "script",
    body: "## 인바운드 상담 스크립트\n\n**오프닝**\n'안녕하세요, 탄자니아 영어학원입니다. 어떻게 도와드릴까요?'\n\n**니즈 파악**\n- 학년 및 현재 수준 확인\n- 목표(수능, 내신, 회화 등) 확인\n- 희망 수업 시간 확인",
    updatedAt: "2026-03-15T11:00:00Z",
  },
]

const INITIAL_CATEGORIES: CategoryOption[] = [
  { value: "all", label: "전체" },
  { value: "policy", label: "정책" },
  { value: "faq", label: "FAQ" },
  { value: "manual", label: "매뉴얼" },
  { value: "script", label: "상담 스크립트" },
  { value: "general", label: "일반" },
]

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  policy: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  faq: { bg: "rgba(16,185,129,0.12)", color: "var(--color-success)" },
  manual: { bg: "rgba(168,85,247,0.12)", color: "#a855f7" },
  script: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  general: { bg: "var(--bg-tertiary)", color: "var(--text-secondary)" },
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
    author: typeof doc.author === "string" ? doc.author : undefined,
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
  return doc.author === "AI" || doc.tags?.includes("ai-generated")
}

function getCaseId(doc: Document) {
  const caseTag = doc.tags?.find((tag) => tag.startsWith("case:"))
  return caseTag ? caseTag.slice(5) : null
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
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--color-teal-500)" }}
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
      <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
              className="border-0 text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
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
  const { selectedOrgId } = useOrganization()
  const { addToast } = useToast()
  const { id: routeDocId, orgPrefix } = useParams<{ id?: string; orgPrefix: string }>()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [localDocs, setLocalDocs] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>(INITIAL_CATEGORIES)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editCategory, setEditCategory] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dispatchingDocId, setDispatchingDocId] = useState<string | null>(null)
  const [previewImportDocs, setPreviewImportDocs] = useState<Document[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [pendingImportName, setPendingImportName] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "지식베이스" }])
  }, [setBreadcrumbs])

  const { data: apiDocs, isLoading } = useQuery({
    queryKey: queryKeys.documents.list(selectedOrgId ?? ""),
    queryFn: () => documentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  useEffect(() => {
    const nextDocs = (apiDocs as Document[] | undefined)?.length
      ? (apiDocs as any[]).map(normalizeDocument)
      : FALLBACK_DOCS.map(normalizeDocument)

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

  const filtered = categoryFiltered.filter((doc) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return doc.title.toLowerCase().includes(query) || doc.body.toLowerCase().includes(query)
  })

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
    if (!displayDoc || !selectedOrgId || !editTitle.trim()) return

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
      const response = await fetch(`/api/organizations/${selectedOrgId}/documents/${displayDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextDoc.title,
          body: nextDoc.body,
          category: nextDoc.category,
        }),
      })

      if (!response.ok) {
        throw new Error("PATCH failed")
      }

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
    if (!displayDoc || !selectedOrgId) return

    setIsDeleting(true)
    const deletingId = displayDoc.id

    try {
      const response = await fetch(`/api/organizations/${selectedOrgId}/documents/${deletingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("DELETE failed")
      }
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

      if (selectedOrgId) {
        importedDocs = await Promise.all(
          previewImportDocs.map((doc) =>
            documentsApi.create(selectedOrgId, {
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

  const handleDispatch = async (doc: Document) => {
    if (!selectedOrgId) return

    setDispatchingDocId(doc.id)
    try {
      await orchestratorApi.dispatch({
        instruction: `다음 문서를 검토하고 보완해줘: ${doc.title}`,
        organizationId: selectedOrgId,
      })
      addToast("에이전트 보완 요청을 보냈습니다.", "success")
    } catch {
      await delay(500)
      addToast("에이전트 보완 요청을 mock 상태로 처리했습니다.", "info")
    } finally {
      setDispatchingDocId(null)
    }
  }

  const caseId = displayDoc ? getCaseId(displayDoc) : null

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            지식베이스
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {allDocs.length}개 문서
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
          )}
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleExport}>
            <Download size={14} />
            Markdown Export
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload size={14} />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.md,.markdown,.txt,.docx"
            multiple
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            size="sm"
            className="border-0 text-white text-xs gap-1"
            style={{ backgroundColor: "var(--color-teal-500)" }}
            onClick={() => setShowNewDialog(true)}
          >
            <Plus size={14} />
            새 문서
          </Button>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 px-6 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
              style={
                activeCategory === category.value
                  ? { backgroundColor: "var(--color-teal-500)", color: "#fff" }
                  : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }
              }
            >
              {category.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={handleAddCategory}>
          카테고리 추가
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <ScrollArea
          className="shrink-0"
          style={{ width: 320, borderRight: "1px solid var(--border-default)" }}
        >
          <div className="px-2 pt-2">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="문서 검색..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="등록된 문서가 없습니다"
              description="학원 운영 정책, FAQ 등을 등록하면 에이전트가 활용합니다."
            />
          ) : (
            <div className="p-2 flex flex-col gap-2">
              {filtered.map((doc) => {
                const updatedAt = doc.updatedAt ?? doc.updated_at
                const isActive = displayDoc?.id === doc.id
                return (
                  <div
                    key={doc.id}
                    className="rounded-lg px-3 py-3 transition-colors"
                    style={{
                      backgroundColor: isActive ? "var(--color-primary-bg)" : "transparent",
                      border: isActive ? "1px solid rgba(20,184,166,0.25)" : "1px solid var(--border-default)",
                    }}
                  >
                    <button
                      onClick={() => setSelectedDocId(doc.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className="text-sm font-medium truncate flex-1"
                          style={{ color: isActive ? "var(--color-teal-500)" : "var(--text-primary)" }}
                        >
                          {doc.title}
                        </p>
                        <CategoryBadge category={doc.category} categories={categories} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {isAiGenerated(doc) && (
                          <Badge className="text-xs border-0 px-1.5 py-0" style={{ backgroundColor: "rgba(20,184,166,0.1)", color: "var(--color-teal-500)" }}>
                            AI 생성
                          </Badge>
                        )}
                      </div>
                      {updatedAt && (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {formatDate(updatedAt)}
                        </p>
                      )}
                    </button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 text-xs gap-1.5"
                      disabled={dispatchingDocId === doc.id}
                      onClick={() => void handleDispatch(doc)}
                    >
                      {dispatchingDocId === doc.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Wand2 size={12} />
                      )}
                      에이전트에게 보완 요청
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <ScrollArea className="flex-1">
          {displayDoc ? (
            <div className="p-6 max-w-2xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    />
                  ) : (
                    <h2 className="text-xl font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                      {displayDoc.title}
                    </h2>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="border-0 text-white"
                        style={{ backgroundColor: "var(--color-teal-500)" }}
                        disabled={isSaving || !editTitle.trim()}
                        onClick={() => void handleSaveDocument()}
                      >
                        {isSaving && <Loader2 size={14} className="animate-spin" />}
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

              <div className="flex items-center gap-2 flex-wrap mb-5">
                {isAiGenerated(displayDoc) && (
                  <Badge
                    className="text-xs border-0 px-2 py-0.5"
                    style={{ backgroundColor: "rgba(20,184,166,0.1)", color: "var(--color-teal-500)" }}
                  >
                    AI 생성
                  </Badge>
                )}
                {displayDoc.author && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {displayDoc.author}
                  </span>
                )}
                {(displayDoc.updatedAt ?? displayDoc.updated_at) && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    마지막 수정: {formatDate(displayDoc.updatedAt ?? displayDoc.updated_at)}
                  </span>
                )}
                {caseId && (
                  <button
                    className="text-xs underline underline-offset-2"
                    style={{ color: "var(--color-teal-500)" }}
                    onClick={() => window.location.assign(`/${orgPrefix}/cases/${caseId}`)}
                  >
                    관련 케이스 보기
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3 mb-5">
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger
                      style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
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
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={18}
                    style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)", resize: "vertical" }}
                  />
                </div>
              ) : (
                <>
                  {displayDoc.tags && displayDoc.tags.filter((tag) => tag !== "ai-generated").length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-5">
                      {displayDoc.tags.filter((tag) => tag !== "ai-generated").map((tag) => (
                        <Badge
                          key={tag}
                          className="text-xs border-0 px-2 py-0.5"
                          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mb-5" style={{ borderTop: "1px solid var(--border-default)" }} />
                  <MarkdownBody text={displayDoc.body} />
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24">
              <FileText size={40} style={{ color: "var(--text-tertiary)" }} />
              <p className="mt-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
                왼쪽에서 문서를 선택하세요
              </p>
            </div>
          )}
        </ScrollArea>
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
        <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
        <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
              className="border-0 text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
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
