import { cn, getInitials } from "@/lib/utils"

interface AvatarProps {
  name: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
}

export function Avatar({ name, className, size = "md" }: AvatarProps) {
  const initials = getInitials(name || "?")
  
  // Generate consistent color based on name
  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ]
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium shrink-0",
        colors[colorIndex],
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
