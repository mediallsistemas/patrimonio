import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = { none: 'p-0', sm: 'p-4', md: 'p-6', lg: 'p-8' }
const shadowClasses = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg' }

export default function Card({
  children,
  className,
  glass = false,
  padding = 'md',
  shadow = 'sm',
}: CardProps) {
  void glass // reserved for future glassmorphism variant
  return (
    <div
      className={`
        rounded-2xl bg-white border border-gray-200
        ${paddingClasses[padding]}
        ${shadowClasses[shadow]}
        ${className ?? ''}
      `}
    >
      {children}
    </div>
  )
}
