import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

interface MetricCardProps {
  icon: React.ReactNode
  value: number | string
  label: string
  /** Sub-label shown below the label */
  sub?: string
  description?: string
  href?: string
  trend?: "up" | "down" | "neutral"
  iconColor?: string
  /** Show amber urgent ring */
  urgent?: boolean
  loading?: boolean
  className?: string
}

const trendConfig = {
  up: { Icon: TrendingUp, color: "var(--color-success)" },
  down: { Icon: TrendingDown, color: "var(--color-danger)" },
  neutral: { Icon: Minus, color: "var(--text-tertiary)" },
}

export function MetricCard({
  icon,
  value,
  label,
  sub,
  description,
  href,
  trend,
  iconColor,
  urgent,
  loading,
  className,
}: MetricCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (href) navigate(href)
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        urgent && "ring-1 ring-amber-400/50",
        className
      )}
      style={{
        backgroundColor: "var(--bg-elevated)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-default)",
      }}
      onClick={handleClick}
    >
      <CardContent className="p-5 h-full">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                style={{ backgroundColor: "var(--bg-tertiary)", color: iconColor ?? "var(--color-teal-500)" }}
              >
                {icon}
              </div>
              {loading ? (
                <>
                  <div
                    className="h-7 w-16 rounded-lg animate-pulse mb-1"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  />
                  <div
                    className="h-4 w-24 rounded-lg animate-pulse"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="text-2xl font-bold tabular-nums mb-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {label}
                  </div>
                  {(sub ?? description) && (
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {sub ?? description}
                    </div>
                  )}
                </>
              )}
            </div>
            {trend && (
              <div className="shrink-0 ml-3 mt-1">
                {(() => {
                  const { Icon, color } = trendConfig[trend]
                  return <Icon size={16} style={{ color }} />
                })()}
              </div>
            )}
          </div>
          {!loading && href && (
            <div
              className="mt-4 text-xs font-medium"
              style={{ color: "var(--color-teal-500)" }}
            >
              보기 →
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
