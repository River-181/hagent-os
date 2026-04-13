import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useToast } from "@/components/ToastContext"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Bot,
  Bell,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  Calendar,
  Package,
  Database,
  Download,
  Upload,
  FlaskConical,
} from "lucide-react"

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span style={{ color: "var(--color-teal-500)" }}>{icon}</span>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {label}
      </h2>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="mb-1.5 block text-xs font-medium"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </label>
  )
}

function ReadonlyBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="ml-2 rounded px-2 py-0.5 text-xs"
      style={{
        backgroundColor: "var(--bg-tertiary)",
        color: "var(--text-tertiary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {children}
    </span>
  )
}

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {description}
          </p>
        )}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

interface PackageItem {
  name: string
  description: string
  version: string
  installed: boolean
  base?: boolean
}

const INITIAL_PACKAGES: PackageItem[] = [
  {
    name: "hagent-base",
    description: "기본 패키지",
    version: "v1.0.0",
    installed: true,
    base: true,
  },
  {
    name: "k-hagwon-pack",
    description: "학원 특화",
    version: "v0.9.2",
    installed: true,
  },
  {
    name: "kakao-integration",
    description: "카카오 연동",
    version: "v0.4.1",
    installed: false,
  },
  {
    name: "neis-connector",
    description: "나이스 교육 데이터",
    version: "v0.3.0",
    installed: false,
  },
  {
    name: "sms-gateway",
    description: "문자 발송",
    version: "v0.5.4",
    installed: false,
  },
]

export function SettingsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { success, info } = useToast()
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const [orgName] = useState("탄자니아 영어학원")
  const [orgDesc] = useState(
    "대치동 영어 전문 학원. 수준별 맞춤 교육으로 입시 영어부터 회화까지 책임집니다."
  )

  const [autoApproveLevel, setAutoApproveLevel] = useState("1")
  const [tokenLimit, setTokenLimit] = useState("500000")
  const [heartbeat] = useState("매일 07:00")

  const [notifyAgentDone, setNotifyAgentDone] = useState(true)
  const [notifyApproval, setNotifyApproval] = useState(true)
  const [notifyRisk, setNotifyRisk] = useState(true)

  const [kakaoEnabled, setKakaoEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(true)
  const [packages, setPackages] = useState<PackageItem[]>(INITIAL_PACKAGES)

  useEffect(() => {
    setBreadcrumbs([{ label: "설정" }])
  }, [setBreadcrumbs])

  const cardStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    boxShadow: "var(--shadow-sm)",
  }

  const handlePackageToggle = (name: string) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.name === name && !pkg.base ? { ...pkg, installed: !pkg.installed } : pkg
      )
    )
    const target = packages.find((pkg) => pkg.name === name)
    if (target) {
      success(target.installed ? `${name} 패키지를 제거했습니다.` : `${name} 패키지를 설치했습니다.`)
    }
  }

  const handleConnectionTest = async () => {
    await Promise.resolve()
    success("카카오 채널 연결 테스트에 성공했습니다.")
  }

  const handleExportData = () => {
    const payload = {
      organization: orgName,
      exportedAt: new Date().toISOString(),
      packages,
      channels: {
        kakaoEnabled,
        smsEnabled,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "hagentos-export.json"
    link.click()
    URL.revokeObjectURL(url)
    success("전체 데이터를 JSON으로 내보냈습니다.")
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await file.text()
    success(`데이터 가져오기를 완료했습니다: ${file.name}`)
    event.target.value = ""
  }

  const handleSeedReset = async () => {
    await Promise.resolve()
    info("시드 데이터 재실행 요청을 mock으로 처리했습니다.")
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        설정
      </h1>
      <p className="mb-8 text-sm" style={{ color: "var(--text-secondary)" }}>
        기관 정보 및 AI 정책을 관리합니다.
      </p>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Building2 size={16} />} label="기관 정보" />

          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel>학원 이름</FieldLabel>
              <input
                type="text"
                defaultValue={orgName}
                disabled
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  opacity: 0.7,
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div>
              <FieldLabel>학원 소개</FieldLabel>
              <textarea
                defaultValue={orgDesc}
                disabled
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  opacity: 0.7,
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div>
              <FieldLabel>
                Prefix
                <ReadonlyBadge>읽기 전용</ReadonlyBadge>
              </FieldLabel>
              <input
                type="text"
                value="tanzania"
                readOnly
                className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-tertiary)",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Bot size={16} />} label="AI 정책" />

          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel>자동 승인 레벨</FieldLabel>
              <select
                value={autoApproveLevel}
                onChange={(event) => setAutoApproveLevel(event.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="0">0 — 모든 작업 수동 승인</option>
                <option value="1">1 — 저위험 작업 자동 승인</option>
                <option value="2">2 — 중위험 작업 자동 승인</option>
                <option value="3">3 — 고위험 작업 자동 승인</option>
                <option value="4">4 — 전체 자동 승인</option>
              </select>
            </div>

            <div>
              <FieldLabel>월간 토큰 한도</FieldLabel>
              <input
                type="number"
                value={tokenLimit}
                onChange={(event) => setTokenLimit(event.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <FieldLabel>
                Heartbeat 스케줄
                <ReadonlyBadge>데모 고정</ReadonlyBadge>
              </FieldLabel>
              <input
                type="text"
                value={heartbeat}
                readOnly
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Bell size={16} />} label="알림 설정" />

          <div className="flex flex-col">
            <ToggleRow
              label="에이전트 완료 알림"
              description="에이전트가 작업을 완료했을 때 알림"
              value={notifyAgentDone}
              onChange={setNotifyAgentDone}
            />
            <Separator style={{ backgroundColor: "var(--border-default)" }} />
            <ToggleRow
              label="승인 요청 알림"
              description="에이전트가 승인을 요청했을 때 알림"
              value={notifyApproval}
              onChange={setNotifyApproval}
            />
            <Separator style={{ backgroundColor: "var(--border-default)" }} />
            <ToggleRow
              label="이탈 위험 알림"
              description="학생 이탈 위험 점수가 임계값을 초과할 때 알림"
              value={notifyRisk}
              onChange={setNotifyRisk}
            />
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<MessageCircle size={16} />} label="외부 채널 연동" />
          <p className="mb-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            외부 채널에서 들어오는 문의가 자동으로 케이스로 변환됩니다. 소통 에이전트가 게이트 역할을 합니다.
          </p>

          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg px-4 py-4"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "#FEE500" }}
                  >
                    <MessageCircle size={18} style={{ color: "#3C1E1E" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      카카오톡 채널
                    </p>
                    <a
                      href="http://pf.kakao.com/_raDdX"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:underline"
                      style={{ color: "var(--color-teal-500)" }}
                    >
                      pf.kakao.com/_raDdX <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: kakaoEnabled
                        ? "rgba(20,184,166,0.1)"
                        : "var(--bg-tertiary)",
                      color: kakaoEnabled
                        ? "var(--color-teal-500)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {kakaoEnabled ? "연결됨" : "비활성"}
                  </span>
                  <Switch checked={kakaoEnabled} onCheckedChange={setKakaoEnabled} />
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-lg p-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Channel ID: <code>pf.kakao.com/_raDdX</code>
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Bot ID: <code>69d80717ce25e33033041230</code>
                </p>
                <div>
                  <Button size="sm" variant="outline" onClick={handleConnectionTest}>
                    연결 테스트
                  </Button>
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(59,130,246,0.1)" }}
                >
                  <MessageCircle size={18} style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    SMS / 알림톡 (Solapi)
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    학부모 알림 발송 + 수신 문의 자동 접수
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: smsEnabled
                      ? "rgba(20,184,166,0.1)"
                      : "var(--bg-tertiary)",
                    color: smsEnabled
                      ? "var(--color-teal-500)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {smsEnabled ? "연결됨" : "미설정"}
                </span>
                <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
              </div>
            </div>

            <p className="mt-1 text-xs" style={{ color: "var(--text-disabled)" }}>
              웹훅 URL: <code className="text-xs font-mono">/api/webhook/kakao</code>,{" "}
              <code className="text-xs font-mono">/api/webhook/sms</code>
            </p>
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Package size={16} />} label="패키지 관리" />
          <div className="grid gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className="flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between"
                style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
              >
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {pkg.name}
                    </p>
                    <Badge
                      className="border-0 px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: pkg.installed
                          ? "rgba(20,184,166,0.1)"
                          : "var(--bg-tertiary)",
                        color: pkg.installed
                          ? "var(--color-teal-500)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      {pkg.installed ? "installed" : "not installed"}
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {pkg.description}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {pkg.version}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={pkg.installed ? "outline" : "default"}
                  onClick={() => handlePackageToggle(pkg.name)}
                  disabled={pkg.base}
                  className={!pkg.installed ? "border-0 text-white" : ""}
                  style={
                    !pkg.installed
                      ? { backgroundColor: "var(--color-teal-500)" }
                      : undefined
                  }
                >
                  {pkg.base ? "기본 포함" : pkg.installed ? "제거" : "설치"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Calendar size={16} />} label="모듈 관리" />
          <p className="mb-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            학원 운영에 맞게 기능 모듈을 활성화/비활성화합니다.
          </p>

          <div className="flex flex-col">
            <ToggleRow
              label="일정 관리"
              description="수업, 상담, 이벤트, 법정기한 등 일정 캘린더 기능"
              value={scheduleEnabled}
              onChange={setScheduleEnabled}
            />
            <Separator style={{ backgroundColor: "var(--border-default)" }} />
            <ToggleRow
              label="출석/수납 관리"
              description="학생 출석 및 수납 추적 (복잡할 수 있어 선택적 사용)"
              value={false}
              onChange={() => {}}
            />
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <SectionTitle icon={<Database size={16} />} label="데이터 관리" />
          <div className="flex flex-col gap-3 md:flex-row">
            <Button variant="outline" className="gap-1" onClick={handleExportData}>
              <Download size={14} />
              전체 데이터 내보내기
            </Button>
            <Button variant="outline" className="gap-1" onClick={handleImportClick}>
              <Upload size={14} />
              데이터 가져오기
            </Button>
            <Button variant="outline" className="gap-1" onClick={handleSeedReset}>
              <FlaskConical size={14} />
              시드 데이터 재실행
            </Button>
            <Badge
              className="self-start border-0 px-2 py-1 text-xs"
              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#b45309" }}
            >
              dev only
            </Badge>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>

        <div
          className="rounded-xl p-5"
          style={{ ...cardStyle, border: "1px solid var(--color-danger, #ef4444)" }}
        >
          <SectionTitle icon={<AlertTriangle size={16} />} label="위험 영역" />
          <p className="mb-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            아래 작업은 되돌릴 수 없습니다. 데모 모드에서는 비활성화되어 있습니다.
          </p>
          <div className="flex gap-3">
            <button
              disabled
              className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold opacity-40"
              style={{
                border: "1px solid #ef4444",
                color: "#ef4444",
                backgroundColor: "transparent",
              }}
            >
              데이터 초기화
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold opacity-40"
              style={{
                backgroundColor: "#ef4444",
                color: "#fff",
              }}
            >
              기관 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
