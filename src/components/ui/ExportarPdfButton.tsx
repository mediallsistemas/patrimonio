'use client'

import { Download } from 'lucide-react'

interface ExportarPdfButtonProps {
  onClick: () => void
  label?: string
  disabled?: boolean
}

export default function ExportarPdfButton({
  onClick,
  label = 'Exportar PDF',
  disabled,
}: ExportarPdfButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ring-1 ring-gray-200 bg-white text-gray-500 hover:ring-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
