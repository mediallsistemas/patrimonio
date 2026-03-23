'use client'

import { CheckCircle } from 'lucide-react'

interface CheckFeedbackProps {
  show: boolean
  variant?: 'icon' | 'card'
}

export default function CheckFeedback({ show, variant = 'icon' }: CheckFeedbackProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.6)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {variant === 'card' ? (
        <div
          className="rounded-full p-6"
          style={{ backgroundColor: '#f97316', boxShadow: '0 8px 32px rgba(249,115,22,0.45)' }}
        >
          <CheckCircle className="w-16 h-16" style={{ color: '#ffffff' }} strokeWidth={2.5} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 transition-transform duration-300">
          <CheckCircle
            className="w-24 h-24 drop-shadow-lg"
            style={{ color: '#f97316', transform: show ? 'scale(1)' : 'scale(0.75)' }}
          />
        </div>
      )}
    </div>
  )
}
