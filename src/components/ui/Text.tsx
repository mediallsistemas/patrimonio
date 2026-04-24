import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

export const textVariants = cva('font-sans text-gray-400', {
  variants: {
    variant: {
      'heading-lg': 'text-4xl leading-10 font-bold',
      'heading-md': 'text-2xl leading-8 font-bold',
      'heading-sm': 'text-xl leading-7 font-semibold',
      'body-lg': 'text-lg leading-7 font-normal',
      'body-md': 'text-base leading-6 font-normal',
      'body-md-bold': 'text-base leading-6 font-semibold',
      'body-sm': 'text-sm leading-5 font-normal',
      'body-sm-bold': 'text-sm leading-5 font-semibold',
      caption: 'text-xs leading-4 font-normal',
    },
  },
  defaultVariants: { variant: 'body-md' },
})

interface TextProps extends VariantProps<typeof textVariants> {
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  children?: React.ReactNode
}

export default function Text({ as = 'span', variant, className, children, ...props }: TextProps) {
  return React.createElement(
    as,
    { className: textVariants({ variant, className }), ...props },
    children,
  )
}
