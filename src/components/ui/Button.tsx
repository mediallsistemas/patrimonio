import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-sans font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-red-base text-white hover:bg-red-dark shadow-sm active:scale-95',
        secondary: 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:scale-95',
        success: 'bg-green-base text-white hover:bg-green-dark shadow-sm active:scale-95',
        danger: 'bg-red-base text-white hover:bg-red-dark shadow-sm active:scale-95',
        outline: 'border border-gray-200 text-gray-400 hover:border-red-base hover:text-red-base bg-white active:scale-95',
        ghost: 'text-red-base hover:bg-red-light active:scale-95',
      },
      size: {
        sm: 'px-4 py-2 text-sm rounded-lg',
        md: 'px-6 py-3 text-base rounded-xl',
        lg: 'px-8 py-4 text-lg rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export default function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </button>
  )
}
