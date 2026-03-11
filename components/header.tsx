import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Text from './text'

interface HeaderProps {
  title: string
  backHref?: string
}

export default function Header({ title, backHref = '/' }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
      <Link
        href={backHref}
        className="text-gray-300 hover:text-red-base transition-colors p-2 rounded-xl hover:bg-red-light"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <Text as="h1" variant="heading-sm" className="text-dark">
        {title}
      </Text>
    </header>
  )
}
