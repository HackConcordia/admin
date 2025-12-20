"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TopSchoolsProps {
  schools: {
    university: string
    count: number
  }[]
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

const schoolColors: string[] = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
]

export function TopSchools({ schools }: TopSchoolsProps) {
  return (
    <div className="space-y-4">
      {schools.map((school, index) => (
        <div
          key={school.university}
          className="flex items-center gap-3 group"
        >
          <Avatar className={`h-10 w-10 ${schoolColors[index % schoolColors.length]}`}>
            <AvatarFallback className={`${schoolColors[index % schoolColors.length]} text-white text-xs font-semibold`}>
              {getInitials(school.university)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {school.university}
            </p>
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {school.count.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}

