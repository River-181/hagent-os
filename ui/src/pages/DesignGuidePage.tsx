import { useEffect } from "react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"

const colorTokens = [
  { name: "teal-50", value: "#e6fafa", label: "Teal 50" },
  { name: "teal-100", value: "#b3f0f0", label: "Teal 100" },
  { name: "teal-300", value: "#26c7c7", label: "Teal 300" },
  { name: "teal-500", value: "#0ea5b0", label: "Teal 500 (Primary)" },
  { name: "teal-600", value: "#0891a0", label: "Teal 600" },
  { name: "teal-700", value: "#077e8d", label: "Teal 700" },
  { name: "success", value: "#03b26c", label: "Success" },
  { name: "warning", value: "#ffc342", label: "Warning" },
  { name: "danger", value: "#f04452", label: "Danger" },
]

const semanticTokens = [
  { name: "--bg-base", label: "bg-base" },
  { name: "--bg-secondary", label: "bg-secondary" },
  { name: "--bg-tertiary", label: "bg-tertiary" },
  { name: "--text-primary", label: "text-primary" },
  { name: "--text-secondary", label: "text-secondary" },
  { name: "--text-tertiary", label: "text-tertiary" },
  { name: "--border-default", label: "border-default" },
]

const typographySamples = [
  { label: "Heading 1", className: "text-3xl font-bold" },
  { label: "Heading 2", className: "text-2xl font-bold" },
  { label: "Heading 3", className: "text-xl font-semibold" },
  { label: "Body", className: "text-base" },
  { label: "Small", className: "text-sm" },
  { label: "Caption", className: "text-xs" },
]

export function DesignGuidePage() {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([{ label: "디자인 가이드" }])
  }, [setBreadcrumbs])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        디자인 가이드
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>
        HagentOS Toss-style design tokens 및 컴포넌트 가이드
      </p>

      {/* Brand Colors */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          브랜드 컬러
        </h2>
        <div className="flex flex-wrap gap-3">
          {colorTokens.map((c) => (
            <div key={c.name} className="flex flex-col gap-2">
              <div
                className="rounded-xl"
                style={{ width: 80, height: 60, background: c.value, boxShadow: "var(--shadow-sm)" }}
              />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {c.label}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                  {c.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Semantic Tokens */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          시맨틱 토큰
        </h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {semanticTokens.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                border: "1px solid var(--border-default)",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <div
                className="rounded"
                style={{
                  width: 24,
                  height: 24,
                  background: `var(${t.name})`,
                  border: "1px solid var(--border-default)",
                  flexShrink: 0,
                }}
              />
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          타이포그래피
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          {typographySamples.map((t) => (
            <div key={t.label} className="flex items-baseline gap-6">
              <span className="text-xs w-20 shrink-0" style={{ color: "var(--text-tertiary)" }}>
                {t.label}
              </span>
              <span
                className={t.className}
                style={{ color: "var(--text-primary)", fontFamily: '"Toss Product Sans", "Noto Sans KR", sans-serif' }}
              >
                학원 AI 에이전트 플랫폼
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          그림자
        </h2>
        <div className="flex gap-6">
          {[
            { label: "shadow-sm", value: "var(--shadow-sm)" },
            { label: "shadow-md", value: "var(--shadow-md)" },
            { label: "shadow-lg", value: "var(--shadow-lg)" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 100,
                height: 80,
                backgroundColor: "var(--bg-elevated)",
                boxShadow: s.value,
              }}
            >
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Radius */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Border Radius
        </h2>
        <div className="flex gap-6 items-end">
          {[
            { label: "sm (6px)", r: "var(--radius-sm)" },
            { label: "md (8px)", r: "var(--radius-md)" },
            { label: "lg (10px)", r: "var(--radius-lg)" },
            { label: "xl (12px)", r: "var(--radius-xl)" },
          ].map((r) => (
            <div key={r.label} className="flex flex-col items-center gap-2">
              <div
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "var(--color-teal-100)",
                  borderRadius: r.r,
                }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          버튼 스타일
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--color-teal-500)", color: "#fff" }}
          >
            Primary
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            Secondary
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--color-danger)", color: "#fff" }}
          >
            Danger
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-disabled)", cursor: "not-allowed" }}
            disabled
          >
            Disabled
          </button>
        </div>
      </section>
    </div>
  )
}
