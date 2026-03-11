import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-gray-400 font-sans">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm
          ${error ? 'border-red-base focus:ring-red-base' : 'border-gray-200 focus:ring-red-base'}
          bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all
          placeholder:text-gray-300
          ${className ?? ''}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-base font-sans">{error}</span>}
    </div>
  )
}
