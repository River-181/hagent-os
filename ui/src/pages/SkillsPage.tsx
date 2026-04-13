import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { agentsApi } from "@/api/agents"
import { skillsApi } from "@/api/skills"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/context/ToastContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  WorkspaceEmptyState,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import { queryKeys } from "@/lib/queryKeys"
import { CAPABILITY_BUNDLES, findBundleByCapability } from "@/lib/capabilityBundles"
import {
  Bot,
  ChevronDown,
  CircleAlert,
  CloudDownload,
  Copy,
  Download,
  FileCode2,
  FolderTree,
  GitBranch,
  Loader2,
  MoreHorizontal,
  PackagePlus,
  Trash2,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react"

type SkillListItem = {
  id: string
  slug: string
  namespace: string
  displayName: string
  version: string
  summary: string
  packageType: string
  source: { kind: string; repo?: string; url?: string; path?: string; commit?: string; license?: string }
  compatibility: { agentTypes: string[]; adapters: string[]; locales: string[] }
  distribution: { exportTargets: string[]; editable: boolean; publishable: boolean }
  installed: boolean
  sourceBadge: string
  runtimeHealth: Array<{ key: string; label: string; ready: boolean; requiredEnv: string[]; missingEnv: string[] }>
  ready: boolean
  mountedAgents: Array<{ agentId: string; agentName: string; mountOrder: number; enabled: boolean }>
  fileCount: number
}

type SkillDetail = SkillListItem & {
  curatedSource?: { label: string; repo?: string }
  runtime: {
    injectionMode: string
    requiredIntegrations: string[]
    requiredSecrets: string[]
    requiredEnv: string[]
    requiredFiles: string[]
  }
  fileTree: SkillTreeNode[]
  skillMarkdown: string
  openaiYaml: string | null
  installation: { status: string; config?: Record<string, unknown> } | null
  readOnly: boolean
}

type SkillTreeNode = {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  children?: SkillTreeNode[]
}

type AgentRecord = {
  id: string
  name: string
  agentType: string
}

type SkillMount = {
  slug: string
  enabled?: boolean
  mountOrder?: number
}

type FilterKey = "all" | "installed" | "owned" | "imported" | "issues"
type CategoryKey = "all" | string

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "installed", label: "설치됨" },
  { key: "owned", label: "우리 스킬" },
  { key: "imported", label: "외부 스킬" },
  { key: "issues", label: "점검 필요" },
]

function normalizeSkillListItem(item: any): SkillListItem {
  return {
    id: String(item?.id ?? `${item?.namespace ?? "skill"}/${item?.slug ?? item?.name ?? "unknown"}`),
    slug: String(item?.slug ?? item?.name ?? "unknown"),
    namespace: String(item?.namespace ?? "legacy"),
    displayName: String(item?.displayName ?? item?.name ?? item?.slug ?? "이름 없는 스킬"),
    version: String(item?.version ?? "0.1.0"),
    summary: String(item?.summary ?? item?.description ?? "설명이 없습니다."),
    packageType: String(item?.packageType ?? item?.type ?? "builtin"),
    source: {
      kind: String(item?.source?.kind ?? item?.type ?? "local"),
      repo: item?.source?.repo,
      url: item?.source?.url,
      path: item?.source?.path,
      commit: item?.source?.commit,
      license: item?.source?.license,
    },
    compatibility: {
      agentTypes: Array.isArray(item?.compatibility?.agentTypes) ? item.compatibility.agentTypes : Array.isArray(item?.agentTypes) ? item.agentTypes : [],
      adapters: Array.isArray(item?.compatibility?.adapters) ? item.compatibility.adapters : [],
      locales: Array.isArray(item?.compatibility?.locales) ? item.compatibility.locales : [],
    },
    distribution: {
      exportTargets: Array.isArray(item?.distribution?.exportTargets) ? item.distribution.exportTargets : ["codex", "claude-code", "cursor"],
      editable: Boolean(item?.distribution?.editable ?? false),
      publishable: Boolean(item?.distribution?.publishable ?? false),
    },
    installed: Boolean(item?.installed ?? false),
    sourceBadge: String(item?.sourceBadge ?? item?.type ?? "Local"),
    runtimeHealth: Array.isArray(item?.runtimeHealth) ? item.runtimeHealth : [],
    ready: Boolean(item?.ready ?? true),
    mountedAgents: Array.isArray(item?.mountedAgents) ? item.mountedAgents : [],
    fileCount: Number(item?.fileCount ?? 0),
  }
}

function normalizeSkillDetail(item: any): SkillDetail {
  const normalized = normalizeSkillListItem(item)
  return {
    ...normalized,
    runtime: {
      injectionMode: String(item?.runtime?.injectionMode ?? "instructions"),
      requiredIntegrations: Array.isArray(item?.runtime?.requiredIntegrations) ? item.runtime.requiredIntegrations : [],
      requiredSecrets: Array.isArray(item?.runtime?.requiredSecrets) ? item.runtime.requiredSecrets : [],
      requiredEnv: Array.isArray(item?.runtime?.requiredEnv) ? item.runtime.requiredEnv : [],
      requiredFiles: Array.isArray(item?.runtime?.requiredFiles) ? item.runtime.requiredFiles : [],
    },
    fileTree: Array.isArray(item?.fileTree) ? item.fileTree : [],
    skillMarkdown: String(item?.skillMarkdown ?? item?.instructions ?? item?.description ?? ""),
    openaiYaml: typeof item?.openaiYaml === "string" ? item.openaiYaml : null,
    installation: item?.installation ?? null,
    readOnly: Boolean(item?.readOnly ?? normalized.namespace !== "hagent"),
  }
}

function filterSkills(items: SkillListItem[], search: string, filter: FilterKey) {
  const searchLower = search.trim().toLowerCase()
  return items.filter((item) => {
    const matchesSearch =
      searchLower.length === 0 ||
      [item.displayName, item.summary, item.slug, item.namespace].some((value) =>
        value.toLowerCase().includes(searchLower),
      )

    if (!matchesSearch) return false

    switch (filter) {
      case "installed":
        return item.installed
      case "owned":
        return item.namespace === "hagent"
      case "imported":
        return item.namespace !== "hagent"
      case "issues":
        return !item.ready
      default:
        return true
    }
  })
}

function humanFileSize(size?: number) {
  if (!size) return "0 B"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function extractHeadings(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#"))
    .map((line) => ({
      depth: line.match(/^#+/)?.[0].length ?? 1,
      text: line.replace(/^#+\s*/, ""),
      id: line.replace(/^#+\s*/, "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-"),
    }))
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.startsWith("```")) {
          return (
            <pre
              key={index}
              className="rounded-lg p-4 overflow-x-auto text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <code>{block.replace(/^```[^\n]*\n?/, "").replace(/\n```$/, "")}</code>
            </pre>
          )
        }

        const lines = block.split("\n")
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="space-y-2 pl-5 list-disc">
              {lines.map((line) => (
                <li key={line} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {line.replace(/^- /, "")}
                </li>
              ))}
            </ul>
          )
        }

        const headingMatch = block.match(/^(#{1,3})\s+(.+)$/)
        if (headingMatch) {
          const depth = headingMatch[1].length
          const text = headingMatch[2]
          const Tag = depth === 1 ? "h1" : depth === 2 ? "h2" : "h3"
          return (
            <Tag
              key={index}
              id={text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-")}
              className={depth === 1 ? "text-2xl font-semibold" : depth === 2 ? "text-lg font-semibold" : "text-base font-semibold"}
              style={{ color: "var(--text-primary)" }}
            >
              {text}
            </Tag>
          )
        }

        if (block.startsWith("---")) {
          return (
            <div
              key={index}
              className="rounded-lg p-4 text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                color: "var(--text-tertiary)",
              }}
            >
              {block}
            </div>
          )
        }

        return (
          <p key={index} className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
            {block}
          </p>
        )
      })}
    </div>
  )
}

function FileTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: SkillTreeNode[]
  selectedPath: string
  onSelect: (nextPath: string) => void
  depth?: number
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isSelected = selectedPath === node.path
        return (
          <div key={node.path}>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left flex items-center gap-2 transition-colors"
              style={{
                paddingLeft: 12 + depth * 14,
                backgroundColor: isSelected ? "var(--accent-primary-soft)" : "transparent",
                color: isSelected ? "var(--accent-primary)" : "var(--text-secondary)",
              }}
              onClick={() => node.type === "file" && onSelect(node.path)}
            >
              {node.type === "directory" ? <FolderTree size={14} /> : <FileCode2 size={14} />}
              <span className="text-xs font-medium truncate">{node.name}</span>
              {node.type === "file" && (
                <span className="ml-auto text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {humanFileSize(node.size)}
                </span>
              )}
            </button>
            {node.type === "directory" && node.children && node.children.length > 0 && (
              <FileTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SkillStatusBadge({ item }: { item: SkillListItem }) {
  // §7.2 규칙: 상태 1개만. 문제 있을 때만 warning을 추가.
  if (!item.ready) {
    return (
      <Badge
        className="border-0 text-xs"
        style={{
          backgroundColor: "var(--status-warning-soft)",
          color: "var(--status-warning)",
        }}
      >
        설정 필요
      </Badge>
    )
  }
  return (
    <Badge
      className="border-0 text-xs"
      style={{
        backgroundColor: item.installed ? "var(--accent-primary-soft)" : "var(--bg-muted)",
        color: item.installed ? "var(--accent-primary)" : "var(--text-tertiary)",
      }}
    >
      {item.installed ? "설치됨" : "미설치"}
    </Badge>
  )
}

function DetailSection({
  title,
  icon,
  children,
  action,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="border-t pt-5 first:border-t-0 first:pt-0" style={{ borderColor: "var(--border-default)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function SkillCard({
  item,
  active,
  onClick,
}: {
  item: SkillListItem
  active: boolean
  onClick: () => void
}) {
  // §7.6 dense row: 제목 / 보조 1줄 / 우측 메타 1개. 아이콘 타일 제거.
  const bundleTitle = findBundleByCapability(item.slug)?.title
  const metaBits = [bundleTitle, item.namespace !== "hagent" ? item.sourceBadge : null].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: active ? "var(--accent-primary-soft)" : "transparent",
        boxShadow: active ? "inset 2px 0 0 var(--accent-primary)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {item.displayName}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {[item.summary, ...metaBits].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="shrink-0">
          <SkillStatusBadge item={item} />
        </div>
      </div>
    </button>
  )
}

function CreateSkillDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { slug: string; displayName: string; summary: string }) => void
  loading: boolean
}) {
  const [displayName, setDisplayName] = useState("")
  const [slug, setSlug] = useState("")
  const [summary, setSummary] = useState("")

  useEffect(() => {
    if (!open) {
      setDisplayName("")
      setSlug("")
      setSummary("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 k-skill 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="표시 이름" />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} placeholder="스킬 요약" />
          <Button
            className="w-full"
            disabled={loading || !displayName.trim() || !slug.trim() || !summary.trim()}
            onClick={() => onSubmit({ displayName, slug, summary })}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            생성
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImportSkillDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { slug: string; displayName: string; summary: string; github_repo: string }) => void
  loading: boolean
}) {
  const [displayName, setDisplayName] = useState("")
  const [slug, setSlug] = useState("")
  const [summary, setSummary] = useState("")
  const [repo, setRepo] = useState("")

  useEffect(() => {
    if (!open) {
      setDisplayName("")
      setSlug("")
      setSummary("")
      setRepo("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>외부 스킬 가져오기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="표시 이름" />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="요약" />
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="GitHub repository URL" />
          <Button
            className="w-full"
            disabled={loading || !displayName.trim() || !slug.trim() || !summary.trim() || !repo.trim()}
            onClick={() => onSubmit({ displayName, slug, summary, github_repo: repo })}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            가져오기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SkillsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { orgPrefix, slug } = useParams<{ orgPrefix: string; slug?: string }>()
  const { selectedOrgId } = useOrganization()
  const { setBreadcrumbs } = useBreadcrumbs()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [category, setCategory] = useState<CategoryKey>("all")
  const [selectedFilePath, setSelectedFilePath] = useState("SKILL.md")
  const [showRaw, setShowRaw] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    setBreadcrumbs([
      { label: "스킬", href: `/${orgPrefix}/skills` },
      ...(slug ? [{ label: slug }] : []),
    ])
  }, [orgPrefix, setBreadcrumbs, slug])

  const skillsQuery = useQuery({
    queryKey: [...queryKeys.skills.all, selectedOrgId],
    queryFn: async () => {
      const data = await skillsApi.list(selectedOrgId ?? undefined)
      if (!Array.isArray(data)) {
        throw new Error("Unexpected /api/skills response")
      }
      return data.map(normalizeSkillListItem)
    },
    enabled: Boolean(selectedOrgId),
  })

  const filteredSkills = useMemo(() => {
    const base = filterSkills(skillsQuery.data ?? [], search, filter)
    if (category === "all") return base
    return base.filter((item) => findBundleByCapability(item.slug)?.id === category)
  }, [category, filter, search, skillsQuery.data])

  useEffect(() => {
    if (!slug && filteredSkills.length > 0 && orgPrefix) {
      navigate(`/${orgPrefix}/skills/${filteredSkills[0].slug}`, { replace: true })
    }
  }, [filteredSkills, navigate, orgPrefix, slug])

  const detailQuery = useQuery({
    queryKey: [...queryKeys.skills.detail(slug ?? "__empty__"), selectedOrgId],
    queryFn: async () => normalizeSkillDetail(await skillsApi.get(slug!, selectedOrgId ?? undefined)),
    enabled: Boolean(slug),
  })

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? "__none__"),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: Boolean(selectedOrgId),
  })

  const fileContentQuery = useQuery({
    queryKey: ["skills", slug, "file", selectedFilePath],
    queryFn: () => skillsApi.getFileContent(slug!, selectedFilePath),
    enabled: Boolean(slug && selectedFilePath),
  })

  useEffect(() => {
    setSelectedFilePath("SKILL.md")
    setShowRaw(false)
  }, [slug])

  const invalidateSkills = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.skills.all })
    if (slug) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.detail(slug) })
    }
  }

  const installMutation = useMutation({
    mutationFn: () => skillsApi.install(selectedOrgId!, slug!),
    onSuccess: async () => {
      toast.success("스킬을 조직에 설치했습니다.")
      await invalidateSkills()
    },
    onError: () => toast.error("스킬 설치에 실패했습니다."),
  })

  const uninstallMutation = useMutation({
    mutationFn: () => skillsApi.uninstall(selectedOrgId!, slug!),
    onSuccess: async () => {
      toast.success("스킬 설치를 해제했습니다.")
      await invalidateSkills()
    },
    onError: () => toast.error("스킬 제거에 실패했습니다."),
  })

  const createMutation = useMutation({
    mutationFn: (payload: { slug: string; displayName: string; summary: string }) =>
      skillsApi.create({ ...payload, namespace: "hagent" }),
    onSuccess: async (created) => {
      setCreateOpen(false)
      toast.success("새 스킬 패키지를 만들었습니다.")
      await invalidateSkills()
      if (orgPrefix) navigate(`/${orgPrefix}/skills/${created.slug}`)
    },
    onError: () => toast.error("스킬 생성에 실패했습니다."),
  })

  const importMutation = useMutation({
    mutationFn: (payload: { slug: string; displayName: string; summary: string; github_repo: string }) =>
      skillsApi.import({ ...payload, namespace: "community", packageType: "wrapper" }),
    onSuccess: async (created) => {
      setImportOpen(false)
      toast.success("외부 스킬 메타데이터를 등록했습니다.")
      await invalidateSkills()
      if (orgPrefix) navigate(`/${orgPrefix}/skills/${created.slug}`)
    },
    onError: () => toast.error("스킬 import에 실패했습니다."),
  })

  const forkMutation = useMutation({
    mutationFn: () => skillsApi.fork(slug!),
    onSuccess: async () => {
      toast.success("`hagent` 네임스페이스로 포크했습니다.")
      await invalidateSkills()
    },
    onError: () => toast.error("포크에 실패했습니다."),
  })

  const syncMutation = useMutation({
    mutationFn: () => skillsApi.syncCheck(slug!),
    onSuccess: () => toast.success("업스트림 확인 작업을 기록했습니다."),
    onError: () => toast.error("sync check에 실패했습니다."),
  })

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const deleteMutation = useMutation({
    mutationFn: () => skillsApi.delete(slug!),
    onSuccess: async () => {
      setDeleteConfirmOpen(false)
      toast.success("스킬을 삭제했습니다.")
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.all })
      if (orgPrefix) navigate(`/${orgPrefix}/skills`, { replace: true })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "스킬 삭제에 실패했습니다."),
  })

  const exportMutation = useMutation({
    mutationFn: (target: "codex" | "claude-code" | "cursor") => skillsApi.exportBundle(slug!, target),
    onSuccess: (bundle) => {
      downloadJson(bundle.bundleName, bundle)
      toast.success("export bundle을 다운로드했습니다.")
    },
    onError: () => toast.error("bundle export에 실패했습니다."),
  })

  const equipMutation = useMutation({
    mutationFn: async (agent: AgentRecord) => {
      const current = (await agentsApi.listSkills(agent.id)) as SkillMount[]
      if (current.some((item) => item.slug === slug)) return agent
      const nextSkills = [...current, { slug: slug!, enabled: true, mountOrder: current.length }]
      await agentsApi.updateSkills(agent.id, nextSkills)
      return agent
    },
    onSuccess: async (agent) => {
      toast.success(`${agent.name} 에이전트에 스킬을 장착했습니다.`)
      await invalidateSkills()
    },
    onError: () => toast.error("에이전트 장착에 실패했습니다."),
  })

  const unequipMutation = useMutation({
    mutationFn: async (agent: AgentRecord) => {
      const current = (await agentsApi.listSkills(agent.id)) as SkillMount[]
      const nextSkills = current
        .filter((item) => item.slug !== slug)
        .map((item, index) => ({ ...item, mountOrder: index }))
      await agentsApi.updateSkills(agent.id, nextSkills)
      return agent
    },
    onSuccess: async (agent) => {
      toast.success(`${agent.name} 에이전트에서 스킬을 분리했습니다.`)
      await invalidateSkills()
    },
    onError: () => toast.error("에이전트 분리에 실패했습니다."),
  })

  const detail = detailQuery.data as SkillDetail | undefined
  const categoryOptions = useMemo(
    () => {
      const discoveredIds = new Set(
        (skillsQuery.data ?? [])
          .map((item) => findBundleByCapability(item.slug)?.id)
          .filter((value): value is string => Boolean(value)),
      )
      return [
        { id: "all", title: "전체" },
        ...CAPABILITY_BUNDLES.filter((item) => discoveredIds.has(item.id)).map((item) => ({ id: item.id, title: item.title })),
      ]
    },
    [skillsQuery.data],
  )
  const detailCategory = detail ? findBundleByCapability(detail.slug) : null
  const detailMode = detail ? (detail.readOnly ? "읽기 전용" : detail.distribution.editable ? "편집 가능" : "관리형") : "-"
  const usedByLabel = detail ? (detail.mountedAgents.length > 0 ? `${detail.mountedAgents.length}명 장착` : "장착 없음") : "-"
  const hasConnectionNeeds = detail ? (detail.runtime.requiredIntegrations.length > 0 || detail.runtimeHealth.some((item) => !item.ready)) : false

  return (
    <>
      <CreateSkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        loading={createMutation.isPending}
      />
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>스킬 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <strong>{detail?.displayName}</strong> 스킬을 삭제하면 파일과 DB 레코드가 모두 제거됩니다.
            장착된 에이전트에서도 해제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              className="gap-2 border-0 text-white"
              style={{ backgroundColor: "var(--color-danger)" }}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ImportSkillDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSubmit={(payload) => importMutation.mutate(payload)}
        loading={importMutation.isPending}
      />

      <div className="p-6 md:p-8 space-y-6">
        <WorkspaceHeader
          title="스킬"
          description={
            <>
              작업에 쓰는 스킬을 고르고 내용을 확인합니다. 연결은 <span className="font-medium">설정 &gt; 연결</span>에서 따로 준비합니다.
            </>
          }
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload size={15} />
                가져오기
              </Button>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <PackagePlus size={15} />
                스킬 만들기
              </Button>
            </div>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <WorkspacePanel className="overflow-hidden">
            <div className="p-3 border-b space-y-2" style={{ borderColor: "var(--border-default)" }}>
              <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5" style={{ border: "1px solid var(--border-default)" }}>
                <Search size={14} style={{ color: "var(--text-tertiary)" }} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="스킬 검색"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-6"
                />
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      style={{
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      {FILTERS.find((f) => f.key === filter)?.label ?? "전체"}
                      <ChevronDown size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
                      {FILTERS.map((item) => (
                        <DropdownMenuRadioItem key={item.key} value={item.key}>
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {categoryOptions.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                        style={{
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        {categoryOptions.find((c) => c.id === category)?.title ?? "전체 분류"}
                        <ChevronDown size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px]">
                      <DropdownMenuRadioGroup value={category} onValueChange={(v) => setCategory(v)}>
                        {categoryOptions.map((item) => (
                          <DropdownMenuRadioItem key={item.id} value={item.id}>
                            {item.title}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-20rem)] min-h-[540px]">
              <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {skillsQuery.isLoading ? (
                  <WorkspaceEmptyState
                    className="min-h-[200px]"
                    icon={<Loader2 size={18} className="animate-spin" />}
                    title="스킬 카탈로그를 불러오는 중입니다."
                    description="설치된 스킬과 가져온 스킬을 정리하고 있습니다."
                  />
                ) : skillsQuery.isError ? (
                  <WorkspaceEmptyState
                    className="min-h-[200px]"
                    icon={<CircleAlert size={18} />}
                    title="스킬 목록을 불러오지 못했습니다."
                    description={(skillsQuery.error as Error | undefined)?.message ?? "서버 응답을 다시 확인해 주세요."}
                  />
                ) : filteredSkills.length === 0 ? (
                  <WorkspaceEmptyState
                    className="min-h-[200px]"
                    icon={<Search size={18} />}
                    title="조건에 맞는 스킬이 없습니다."
                    description="검색어나 카테고리를 바꿔 다시 확인해 주세요."
                  />
                ) : (
                  filteredSkills.map((item) => (
                    <SkillCard
                      key={item.id}
                      item={item}
                      active={slug === item.slug}
                      onClick={() => orgPrefix && navigate(`/${orgPrefix}/skills/${item.slug}`)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </WorkspacePanel>

          <WorkspacePanel className="overflow-hidden">
            {detailQuery.isLoading || (!detail && !detailQuery.isError) ? (
              <div className="p-6 md:p-8">
                <WorkspaceEmptyState
                  className="min-h-[320px]"
                  icon={<Loader2 size={22} className="animate-spin" />}
                  title="스킬 상세 정보를 불러오는 중입니다."
                  description="SKILL.md와 연결 상태, 에이전트 장착 현황을 정리하고 있습니다."
                />
              </div>
            ) : detailQuery.isError || !detail ? (
              <div className="p-6 md:p-8">
                <WorkspaceEmptyState
                  className="min-h-[320px]"
                  icon={<CircleAlert size={22} />}
                  title="스킬 상세를 불러오지 못했습니다."
                  description={(detailQuery.error as Error | undefined)?.message ?? "선택한 스킬의 메타데이터를 다시 확인해 주세요."}
                />
              </div>
            ) : (
              <>
                <div className="p-6 md:p-8 border-b" style={{ borderColor: "var(--border-default)" }}>
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-5">
                      <div className="space-y-3">
                        {detailCategory ? (
                          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                            {detailCategory.title}
                          </p>
                        ) : null}
                        <h2 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                          {detail.displayName}
                        </h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          <span>출처 {detail.curatedSource?.label ?? detail.sourceBadge}</span>
                          <span>키 {detail.namespace}/{detail.slug}</span>
                          <span>모드 {detailMode}</span>
                          <span>사용 에이전트 {usedByLabel}</span>
                        </div>
                        <p className="max-w-3xl text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                          {detail.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <SkillStatusBadge item={detail} />
                        {detail.compatibility.agentTypes.length > 0 ? (
                          <span>추천 역할 {detail.compatibility.agentTypes.join(", ")}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {detail.installed ? (
                        <Button
                          disabled={uninstallMutation.isPending}
                          variant="outline"
                          className="gap-2"
                          onClick={() => uninstallMutation.mutate()}
                        >
                          {uninstallMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                          설치 해제
                        </Button>
                      ) : (
                        <Button
                          disabled={installMutation.isPending || !selectedOrgId}
                          className="gap-2"
                          onClick={() => installMutation.mutate()}
                        >
                          {installMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                          기관에 설치
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" aria-label="추가 작업">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[200px]">
                          {detail.readOnly && (
                            <DropdownMenuItem disabled={forkMutation.isPending} onClick={() => forkMutation.mutate()}>
                              <GitBranch size={14} />
                              로컬 복제
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                            <RefreshCcw size={14} />
                            동기화 점검
                          </DropdownMenuItem>
                          {detail.source.repo ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => window.open(detail.source.repo, "_blank", "noreferrer")}>
                                <CloudDownload size={14} />
                                저장소 열기
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {!detail.readOnly ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500"
                                onClick={() => setDeleteConfirmOpen(true)}
                              >
                                <Trash2 size={14} />
                                스킬 삭제
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="min-h-[560px]">
                  <div className="px-6 pt-4 md:px-8">
                    <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
                      <TabsTrigger value="overview">개요</TabsTrigger>
                      <TabsTrigger value="files">파일</TabsTrigger>
                      <TabsTrigger value="agents">에이전트</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="p-6 md:p-8 space-y-8">
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_320px]">
                      <div className="space-y-8">
                        <DetailSection
                          title="필요한 연결"
                          icon={<Zap size={16} />}
                          action={
                            hasConnectionNeeds ? (
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => orgPrefix && navigate(`/${orgPrefix}/settings#integrations`)}>
                                <Zap size={14} />
                                설정으로 이동
                              </Button>
                            ) : undefined
                          }
                        >
                          <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                            <p>
                              {detail.runtime.requiredIntegrations.length > 0 ? detail.runtime.requiredIntegrations.join(", ") : "별도 연결 없이 바로 사용할 수 있습니다."}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                              주입 방식 {detail.runtime.injectionMode}
                              {detail.runtime.requiredSecrets.length > 0 ? ` · 비밀값 ${detail.runtime.requiredSecrets.join(", ")}` : ""}
                              {detail.runtime.requiredEnv.length > 0 ? ` · 환경 변수 ${detail.runtime.requiredEnv.join(", ")}` : ""}
                            </p>
                          </div>
                        </DetailSection>

                        <DetailSection
                          title="내보내기"
                          icon={<Download size={16} />}
                          action={
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1.5" disabled={exportMutation.isPending}>
                                  {exportMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                  내보내기
                                  <ChevronDown size={12} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>타겟 선택</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {detail.distribution.exportTargets.map((target) => (
                                  <DropdownMenuItem
                                    key={target}
                                    onClick={() => exportMutation.mutate(target as "codex" | "claude-code" | "cursor")}
                                  >
                                    <Download size={14} />
                                    {target}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        >
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Codex / Claude Code / Cursor 중 선택해 번들을 다운로드합니다.
                          </p>
                        </DetailSection>

                        <DetailSection title="출처" icon={<CloudDownload size={16} />}>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            {[
                              ["kind", detail.source.kind],
                              ["repo", detail.source.repo ?? "-"],
                              ["commit", detail.source.commit ?? "-"],
                              ["license", detail.source.license ?? "-"],
                              ["path", detail.source.path ?? "-"],
                            ].map(([key, value]) => (
                              <div key={key as string} className="contents">
                                <dt className="text-xs" style={{ color: "var(--text-tertiary)" }}>{key}</dt>
                                <dd className="truncate" style={{ color: "var(--text-secondary)" }}>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </DetailSection>
                      </div>

                      <DetailSection title="연결 상태" icon={<ShieldCheck size={16} />}>
                        {detail.runtimeHealth.length === 0 ? (
                          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            별도 연결 없이 바로 사용할 수 있습니다.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {detail.runtimeHealth.map((item) => (
                              <div key={item.key} className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {item.ready ? (
                                      <ShieldCheck size={15} style={{ color: "var(--color-success)" }} />
                                    ) : (
                                      <CircleAlert size={15} style={{ color: "var(--status-warning)" }} />
                                    )}
                                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                      {item.label}
                                    </span>
                                  </div>
                                  {item.missingEnv.length > 0 && (
                                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
                                      필요한 환경 변수: {item.missingEnv.join(", ")}
                                    </p>
                                  )}
                                </div>
                                {!item.ready ? (
                                  <span className="shrink-0 text-xs" style={{ color: "var(--status-warning)" }}>
                                    설정 필요
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </DetailSection>
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="p-6 md:p-8">
                    <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          파일 트리
                        </p>
                        <FileTree nodes={detail.fileTree} selectedPath={selectedFilePath} onSelect={(p) => { setSelectedFilePath(p); setShowRaw(false) }} />
                      </div>

                      <div className="overflow-hidden">
                        {(() => {
                          const content = fileContentQuery.data?.content ?? (selectedFilePath === "SKILL.md" ? detail.skillMarkdown : "")
                          const isMarkdown = selectedFilePath.endsWith(".md")
                          return (
                            <>
                              <div className="flex items-center justify-between gap-3 pb-4">
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                    {fileContentQuery.data?.path ?? selectedFilePath}
                                  </p>
                                  {!isMarkdown || showRaw ? (
                                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                      {fileContentQuery.data?.language ?? "text"}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isMarkdown && (
                                    <button
                                      type="button"
                                      onClick={() => setShowRaw((v) => !v)}
                                      className="rounded-md px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)]"
                                      style={{
                                        color: "var(--text-tertiary)",
                                        border: "1px solid var(--border-default)",
                                      }}
                                    >
                                      {showRaw ? "미리보기" : "Raw"}
                                    </button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => navigator.clipboard.writeText(content)}
                                  >
                                    <Copy size={14} />
                                    복사
                                  </Button>
                                </div>
                              </div>
                              {isMarkdown && !showRaw ? (
                                <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
                                  <MarkdownPreview markdown={content} />
                                </div>
                              ) : (
                                <ScrollArea className="h-[480px]">
                                  <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                                    <code>{content}</code>
                                  </pre>
                                </ScrollArea>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="agents" className="p-6 md:p-8">
                    <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          장착한 에이전트
                        </h3>
                        <div className="mt-4 space-y-3">
                          {detail.mountedAgents.length === 0 ? (
                            <WorkspaceEmptyState
                              className="min-h-[180px]"
                              icon={<Bot size={18} />}
                              title="아직 이 스킬을 장착한 에이전트가 없습니다."
                              description="필요한 에이전트에 장착하면 케이스와 프로젝트에서 바로 사용할 수 있습니다."
                            />
                          ) : (
                            detail.mountedAgents.map((agent) => (
                              <div key={agent.agentId} className="border-t pt-4 first:border-t-0 first:pt-0" style={{ borderColor: "var(--border-default)" }}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                      {agent.agentName}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                      장착 순서 {agent.mountOrder} · {agent.enabled ? "활성" : "비활성"}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => orgPrefix && navigate(`/${orgPrefix}/agents/${agent.agentId}`)}>
                                    <Bot size={14} />
                                    에이전트 열기
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          에이전트에 장착
                        </h3>
                        <div className="mt-4 space-y-3">
                          {(agentsQuery.data ?? []).map((agent) => {
                            const mounted = detail.mountedAgents.find((item) => item.agentId === agent.id)
                            return (
                              <div key={agent.id} className="flex items-center gap-3 border-t pt-4 first:border-t-0 first:pt-0" style={{ borderColor: "var(--border-default)" }}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--accent-primary-soft)", color: "var(--accent-primary)" }}>
                                  <Bot size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                    {agent.name}
                                  </p>
                                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                    {agent.agentType}
                                  </p>
                                </div>
                                {mounted ? (
                                  <Button size="sm" variant="outline" disabled={unequipMutation.isPending} onClick={() => unequipMutation.mutate(agent)}>
                                    분리
                                  </Button>
                                ) : (
                                  <Button size="sm" disabled={equipMutation.isPending} onClick={() => equipMutation.mutate(agent)}>
                                    장착
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                </Tabs>
              </>
            )}
          </WorkspacePanel>
        </div>
      </div>
    </>
  )
}
