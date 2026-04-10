import { cn } from "@/lib/utils"

interface PageSkeletonProps {
  variant?: "default" | "dashboard" | "detail" | "list"
  className?: string
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg", className)}
      style={{ backgroundColor: "var(--bg-tertiary)" }}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Metric cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 space-y-3"
            style={{ backgroundColor: "var(--bg-base)", boxShadow: "var(--shadow-sm)" }}
          >
            <Shimmer className="h-9 w-9 rounded-xl" />
            <Shimmer className="h-7 w-16" />
            <Shimmer className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "var(--bg-base)", boxShadow: "var(--shadow-sm)" }}
        >
          <Shimmer className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "var(--bg-base)", boxShadow: "var(--shadow-sm)" }}
        >
          <Shimmer className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-6 w-6 rounded" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Shimmer className="h-7 w-2/3" />
        <Shimmer className="h-4 w-1/3" />
      </div>

      {/* Meta badges */}
      <div className="flex gap-2">
        <Shimmer className="h-6 w-16 rounded-full" />
        <Shimmer className="h-6 w-20 rounded-full" />
        <Shimmer className="h-6 w-14 rounded-full" />
      </div>

      {/* Body content */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ backgroundColor: "var(--bg-base)", boxShadow: "var(--shadow-sm)" }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className={cn("h-4", i === 4 ? "w-2/3" : "w-full")} />
        ))}
      </div>

      {/* Activity */}
      <div className="space-y-3">
        <Shimmer className="h-5 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Shimmer className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="p-6 space-y-3">
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <Shimmer className="h-8 w-24 rounded-lg" />
        <Shimmer className="h-8 w-24 rounded-lg" />
        <Shimmer className="h-8 flex-1 max-w-xs rounded-lg" />
      </div>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: "var(--bg-base)", boxShadow: "var(--shadow-sm)" }}
        >
          <Shimmer className="h-5 w-5 rounded shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className={cn("h-4", i % 3 === 0 ? "w-2/3" : "w-1/2")} />
            <Shimmer className="h-3 w-1/3" />
          </div>
          <Shimmer className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

function DefaultSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Shimmer className="h-8 w-48" />
      <Shimmer className="h-4 w-64" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton({ variant = "default", className }: PageSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "detail" && <DetailSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "default" && <DefaultSkeleton />}
    </div>
  )
}
