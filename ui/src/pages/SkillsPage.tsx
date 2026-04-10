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
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/lib/queryKeys"
import {
  Bot,
  CircleAlert,
  CloudDownload,
  Copy,
  Download,
  FileCode2,
  FileText,
  FolderTree,
  GitBranch,
  Loader2,
  PackagePlus,
  Puzzle,
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

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "installed", label: "설치됨" },
  { key: "owned", label: "우리 소유" },
  { key: "imported", label: "외부/래퍼" },
  { key: "issues", label: "설정 필요" },
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
              className="rounded-xl p-4 overflow-x-auto text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-secondary)",
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
              className="rounded-xl p-4 text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-secondary)",
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
                backgroundColor: isSelected ? "rgba(20,184,166,0.08)" : "transparent",
                color: isSelected ? "var(--color-teal-500)" : "var(--text-secondary)",
              }}
              onClick={() => node.type === "file" && onSelect(node.path)}
            >
              {node.type === "directory" ? <FolderTree size={14} /> : <FileCode2 size={14} />}
              <span className="text-xs font-medium truncate">{node.name}</span>
              {node.type === "file" && (
                <span className="ml-auto text-[11px]" style={{ color: "var(--text-tertiary)" }}>
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
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge className="border-0 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
        {item.namespace}
      </Badge>
      <Badge
        className="border-0 text-xs"
        style={{
          backgroundColor: item.installed ? "rgba(20,184,166,0.12)" : "var(--bg-secondary)",
          color: item.installed ? "var(--color-teal-500)" : "var(--text-tertiary)",
        }}
      >
        {item.installed ? "Installed" : "Not Installed"}
      </Badge>
      <Badge
        className="border-0 text-xs"
        style={{
          backgroundColor: item.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
          color: item.ready ? "var(--color-success)" : "var(--color-warning, #f59e0b)",
        }}
      >
        {item.ready ? "Ready" : "Config Needed"}
      </Badge>
      <Badge className="border-0 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
        {item.sourceBadge}
      </Badge>
    </div>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all"
      style={{
        background: active
          ? "linear-gradient(180deg, rgba(20,184,166,0.12), rgba(15,23,42,0.02))"
          : "var(--bg-elevated)",
        border: `1px solid ${active ? "rgba(20,184,166,0.32)" : "var(--border-default)"}`,
        boxShadow: active ? "0 16px 30px rgba(15,23,42,0.08)" : "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: active ? "rgba(20,184,166,0.14)" : "var(--bg-secondary)",
            color: active ? "var(--color-teal-500)" : "var(--text-tertiary)",
          }}
        >
          <Puzzle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {item.displayName}
            </p>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              v{item.version}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {item.summary}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge className="border-0 text-[11px]" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
              {item.packageType}
            </Badge>
            <Badge className="border-0 text-[11px]" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
              {item.mountedAgents.length} agents
            </Badge>
            {!item.ready && (
              <Badge className="border-0 text-[11px]" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706" }}>
                dependency
              </Badge>
            )}
          </div>
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
  const [selectedFilePath, setSelectedFilePath] = useState("SKILL.md")
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    setBreadcrumbs([
      { label: "스킬 라이브러리", href: `/${orgPrefix}/skills` },
      ...(slug ? [{ label: slug }] : []),
    ])
  }, [orgPrefix, setBreadcrumbs, slug])

  const skillsQuery = useQuery({
    queryKey: [...queryKeys.skills.all, selectedOrgId],
    queryFn: async () => {
      const data = await skillsApi.list(selectedOrgId ?? undefined)
      return Array.isArray(data) ? data.map(normalizeSkillListItem) : []
    },
    enabled: Boolean(selectedOrgId),
  })

  const filteredSkills = useMemo(
    () => filterSkills(skillsQuery.data ?? [], search, filter),
    [filter, search, skillsQuery.data],
  )

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
  const headings = useMemo(() => (detail ? extractHeadings(detail.skillMarkdown) : []), [detail])

  return (
    <>
      <CreateSkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        loading={createMutation.isPending}
      />
      <ImportSkillDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSubmit={(payload) => importMutation.mutate(payload)}
        loading={importMutation.isPending}
      />

      <div className="space-y-6">
        <div
          className="rounded-3xl p-6 md:p-8"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(20,184,166,0.18), rgba(15,23,42,0.02) 55%), var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Badge className="border-0 text-xs" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "var(--color-teal-500)" }}>
                Paperclip-inspired Skill Library
              </Badge>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  HagentOS Skill Packages
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                  `repo-backed package registry`, `file tree browser`, `org install`, `agent mount`, `export bundle`
                  를 한 곳에서 다룹니다. `SKILL.md` 본문과 `agents/openai.yaml`, source provenance, runtime
                  dependency까지 함께 봅니다.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: "var(--text-tertiary)" }}>
                <span>{skillsQuery.data?.length ?? 0} packages</span>
                <span>•</span>
                <span>{(skillsQuery.data ?? []).filter((item) => item.installed).length} installed</span>
                <span>•</span>
                <span>{(skillsQuery.data ?? []).filter((item) => !item.ready).length} need config</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload size={15} />
                Import
              </Button>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <PackagePlus size={15} />
                Create Skill
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "var(--border-default)" }}>
              <div
                className="flex items-center gap-2 rounded-xl px-3"
                style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
              >
                <Search size={14} style={{ color: "var(--text-tertiary)" }} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className="rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: filter === item.key ? "rgba(20,184,166,0.12)" : "var(--bg-secondary)",
                      color: filter === item.key ? "var(--color-teal-500)" : "var(--text-tertiary)",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-21rem)] min-h-[540px]">
              <div className="p-4 space-y-3">
                {skillsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    <Loader2 size={16} className="animate-spin" />
                    스킬 카탈로그를 불러오는 중...
                  </div>
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
          </aside>

          <section
            className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            {detailQuery.isLoading || !detail ? (
              <div className="h-full min-h-[720px] flex flex-col items-center justify-center gap-3">
                <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  스킬 상세 정보를 불러오는 중...
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 md:p-8 border-b" style={{ borderColor: "var(--border-default)" }}>
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <SkillStatusBadge item={detail} />
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                            {detail.displayName}
                          </h2>
                          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            {detail.namespace}/{detail.slug}
                          </span>
                        </div>
                        <p className="max-w-3xl text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                          {detail.summary}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {detail.compatibility.agentTypes.map((agentType) => (
                          <Badge key={agentType} className="border-0 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                            {agentType}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {detail.installed ? (
                        <Button
                          variant="outline"
                          disabled={uninstallMutation.isPending}
                          className="gap-2"
                          onClick={() => uninstallMutation.mutate()}
                        >
                          {uninstallMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                          Uninstall
                        </Button>
                      ) : (
                        <Button
                          disabled={installMutation.isPending || !selectedOrgId}
                          className="gap-2"
                          onClick={() => installMutation.mutate()}
                        >
                          {installMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                          Install to Org
                        </Button>
                      )}
                      {detail.readOnly && (
                        <Button variant="outline" className="gap-2" disabled={forkMutation.isPending} onClick={() => forkMutation.mutate()}>
                          {forkMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <GitBranch size={15} />}
                          Fork as Local
                        </Button>
                      )}
                      <Button variant="outline" className="gap-2" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                        {syncMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                        Sync Check
                      </Button>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="min-h-[660px]">
                  <div className="px-6 pt-4 md:px-8">
                    <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="skillmd">SKILL.md</TabsTrigger>
                      <TabsTrigger value="runtime">Runtime</TabsTrigger>
                      <TabsTrigger value="agents">Agents</TabsTrigger>
                      <TabsTrigger value="source">Source</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="p-6 md:p-8 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Version", value: `v${detail.version}`, icon: <FileText size={16} /> },
                        { label: "Package Type", value: detail.packageType, icon: <Puzzle size={16} /> },
                        { label: "Mounted Agents", value: String(detail.mountedAgents.length), icon: <Bot size={16} /> },
                        { label: "Files", value: String(detail.fileTree.length), icon: <FolderTree size={16} /> },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="rounded-2xl p-4"
                          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                        >
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {card.icon}
                            {card.label}
                          </div>
                          <p className="mt-3 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          <Sparkles size={16} />
                          Skill Summary
                        </div>
                        <p className="mt-4 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                          {detail.summary}
                        </p>
                        <div className="mt-5 flex gap-2 flex-wrap">
                          {detail.distribution.exportTargets.map((target) => (
                            <Button
                              key={target}
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={exportMutation.isPending}
                              onClick={() => exportMutation.mutate(target as "codex" | "claude-code" | "cursor")}
                            >
                              {exportMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              Export {target}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          <ShieldCheck size={16} />
                          Runtime Readiness
                        </div>
                        <div className="mt-4 space-y-3">
                          {detail.runtimeHealth.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                              등록된 external dependency가 없습니다.
                            </p>
                          ) : (
                            detail.runtimeHealth.map((item) => (
                              <div key={item.key} className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                                <div className="flex items-center gap-2">
                                  {item.ready ? (
                                    <ShieldCheck size={15} style={{ color: "var(--color-success)" }} />
                                  ) : (
                                    <CircleAlert size={15} style={{ color: "#d97706" }} />
                                  )}
                                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {item.label}
                                  </span>
                                </div>
                                {item.missingEnv.length > 0 && (
                                  <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                                    missing env: {item.missingEnv.join(", ")}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="p-6 md:p-8">
                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          <FolderTree size={16} />
                          Package File Tree
                        </div>
                        <div className="mt-4">
                          <FileTree nodes={detail.fileTree} selectedPath={selectedFilePath} onSelect={setSelectedFilePath} />
                        </div>
                      </div>

                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border-default)" }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {fileContentQuery.data?.path ?? selectedFilePath}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                              {fileContentQuery.data?.language ?? "text"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => navigator.clipboard.writeText(fileContentQuery.data?.content ?? "")}
                          >
                            <Copy size={14} />
                            Copy
                          </Button>
                        </div>
                        <ScrollArea className="h-[480px]">
                          <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                            <code>{fileContentQuery.data?.content ?? detail.skillMarkdown}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="skillmd" className="p-6 md:p-8">
                    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
                      <div
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          <Zap size={16} />
                          Heading Map
                        </div>
                        <div className="mt-4 space-y-2">
                          {headings.map((heading) => (
                            <button
                              key={heading.id}
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                              style={{
                                paddingLeft: heading.depth === 1 ? 12 : heading.depth === 2 ? 18 : 26,
                                backgroundColor: "var(--bg-elevated)",
                                color: "var(--text-secondary)",
                              }}
                              onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                            >
                              {heading.text}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div
                        className="rounded-2xl p-6"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <MarkdownPreview markdown={detail.skillMarkdown} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="runtime" className="p-6 md:p-8">
                    <div className="grid gap-6 xl:grid-cols-2">
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Declarative Contract
                        </h3>
                        <div className="mt-4 space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <p>injection mode: <strong>{detail.runtime.injectionMode}</strong></p>
                          <p>required integrations: {detail.runtime.requiredIntegrations.join(", ") || "없음"}</p>
                          <p>required secrets: {detail.runtime.requiredSecrets.join(", ") || "없음"}</p>
                          <p>required env: {detail.runtime.requiredEnv.join(", ") || "없음"}</p>
                          <p>required files: {detail.runtime.requiredFiles.join(", ") || "없음"}</p>
                        </div>
                      </div>
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Dependency Health
                        </h3>
                        <div className="mt-4 space-y-3">
                          {detail.runtimeHealth.map((item) => (
                            <div key={item.key} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-elevated)" }}>
                              <div className="flex items-center gap-2">
                                {item.ready ? (
                                  <ShieldCheck size={15} style={{ color: "var(--color-success)" }} />
                                ) : (
                                  <CircleAlert size={15} style={{ color: "#d97706" }} />
                                )}
                                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                  {item.label}
                                </span>
                              </div>
                              <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                                required env: {item.requiredEnv.join(", ") || "없음"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="agents" className="p-6 md:p-8">
                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Mounted Agents
                        </h3>
                        <div className="mt-4 space-y-3">
                          {detail.mountedAgents.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                              아직 이 스킬을 장착한 에이전트가 없습니다.
                            </p>
                          ) : (
                            detail.mountedAgents.map((agent) => (
                              <div key={agent.agentId} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-elevated)" }}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                      {agent.agentName}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                      mount order {agent.mountOrder} · {agent.enabled ? "enabled" : "disabled"}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => orgPrefix && navigate(`/${orgPrefix}/agents/${agent.agentId}`)}>
                                    <Bot size={14} />
                                    Open Agent
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Equip to Agent
                        </h3>
                        <div className="mt-4 space-y-3">
                          {(agentsQuery.data ?? []).map((agent) => {
                            const mounted = detail.mountedAgents.find((item) => item.agentId === agent.id)
                            return (
                              <div key={agent.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(20,184,166,0.08)", color: "var(--color-teal-500)" }}>
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

                  <TabsContent value="source" className="p-6 md:p-8">
                    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Source & Provenance
                        </h3>
                        <div className="mt-4 space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <p>kind: <strong>{detail.source.kind}</strong></p>
                          <p>repo: {detail.source.repo ?? "-"}</p>
                          <p>commit: {detail.source.commit ?? "-"}</p>
                          <p>license: {detail.source.license ?? "-"}</p>
                          <p>path: {detail.source.path ?? "-"}</p>
                        </div>
                        {detail.source.repo && (
                          <Button variant="outline" className="mt-4 gap-1.5" asChild>
                            <a href={detail.source.repo} target="_blank" rel="noreferrer">
                              <CloudDownload size={14} />
                              Open Source Repo
                            </a>
                          </Button>
                        )}
                      </div>
                      <div
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          agents/openai.yaml
                        </h3>
                        <pre className="mt-4 rounded-xl p-4 text-xs overflow-x-auto" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                          <code>{detail.openaiYaml ?? "No agents/openai.yaml"}</code>
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
