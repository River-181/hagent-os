// v0.3.0
import { Bot, User, Zap, Brain, Shield, Heart, Calendar, Sparkles, Cpu, Cog, Lightbulb } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type IdentitySize = "xs" | "sm" | "default" | "lg"
type IdentityType = "agent" | "user" | "system"

interface IdentityProps {
  name: string
  avatarUrl?: string
  size?: IdentitySize
  type?: IdentityType
  icon?: string
  className?: string
  showName?: boolean
}

const agentIconMap: Record<string, React.FC<{ size: number }>> = {
  brain: ({ size }) => <Brain size={size} style={{ color: "var(--color-teal-500)" }} />,
  shield: ({ size }) => <Shield size={size} style={{ color: "var(--color-teal-500)" }} />,
  heart: ({ size }) => <Heart size={size} style={{ color: "#ef4444" }} />,
  calendar: ({ size }) => <Calendar size={size} style={{ color: "#8b5cf6" }} />,
  sparkles: ({ size }) => <Sparkles size={size} style={{ color: "#f59e0b" }} />,
  cpu: ({ size }) => <Cpu size={size} style={{ color: "#3b82f6" }} />,
  cog: ({ size }) => <Cog size={size} style={{ color: "#6b7280" }} />,
  lightbulb: ({ size }) => <Lightbulb size={size} style={{ color: "#10b981" }} />,
}

const sizeConfig: Record<IdentitySize, { avatar: string; icon: number; text: string; gap: string }> = {
  xs: { avatar: "h-5 w-5", icon: 10, text: "text-xs", gap: "gap-1" },
  sm: { avatar: "h-6 w-6", icon: 12, text: "text-sm", gap: "gap-1.5" },
  default: { avatar: "h-8 w-8", icon: 16, text: "text-sm", gap: "gap-2" },
  lg: { avatar: "h-10 w-10", icon: 20, text: "text-base", gap: "gap-2.5" },
}

const typeConfig: Record<IdentityType, { bg: string; icon: React.FC<{ size: number }> }> = {
  agent: {
    bg: "bg-teal-500/10",
    icon: ({ size }) => <Bot size={size} style={{ color: "var(--color-teal-500)" }} />,
  },
  user: {
    bg: "bg-gray-400/10",
    icon: ({ size }) => <User size={size} style={{ color: "var(--text-secondary)" }} />,
  },
  system: {
    bg: "bg-orange-500/10",
    icon: ({ size }) => <Zap size={size} className="text-orange-500" />,
  },
}

export function Identity({
  name,
  avatarUrl,
  size = "default",
  type = "user",
  icon,
  className,
  showName = true,
}: IdentityProps) {
  const { avatar, icon: iconSize, text, gap } = sizeConfig[size]
  const { bg, icon: TypeIcon } = typeConfig[type] ?? typeConfig.user
  const CustomIcon = icon ? agentIconMap[icon] : undefined

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      <Avatar className={cn(avatar, "shrink-0")}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className={cn("rounded-full", bg)}>
          {CustomIcon
            ? <CustomIcon size={iconSize} />
            : <TypeIcon size={iconSize} />
          }
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className={cn("font-medium truncate", text)} style={{ color: "var(--text-primary)" }}>
          {name}
        </span>
      )}

    </span>
  )
}
