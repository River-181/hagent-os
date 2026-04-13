import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = typeof date === "string" ? new Date(date) : date
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return "방금 전"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}일 전`
  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `${diffMonth}개월 전`
  return `${Math.floor(diffMonth / 12)}년 전`
}
