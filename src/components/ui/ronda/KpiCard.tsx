'use client'

import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  valueColor?: string
  highlight?: boolean
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg = 'bg-gray-50',
  iconColor = 'text-gray-400',
  valueColor = 'text-gray-900',
  highlight = false,
}: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl px-5 py-4 shadow-sm ring-1 transition-all ${
      highlight ? 'ring-orange-200' : 'ring-gray-100'
    }`}>
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}
