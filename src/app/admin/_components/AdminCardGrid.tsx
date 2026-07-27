import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import Text from '@/components/ui/Text'

type CardItem = {
  href: string
  icon: LucideIcon
  title: string
  description: string
  color: string
}

export default function AdminCardGrid({ items }: { items: CardItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {items.map(({ href, icon: Icon, title, description, color }) => (
        <Link key={href} href={href} className="group">
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-200 p-6 h-full flex flex-col border-t-4"
            style={{ borderTopColor: color }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: color }}
            >
              <Icon className="text-white w-6 h-6" />
            </div>
            <Text as="h2" variant="heading-sm" className="text-dark mb-1.5 block">
              {title}
            </Text>
            <Text variant="body-sm" className="text-gray-300 flex-1 block">
              {description}
            </Text>
          </div>
        </Link>
      ))}
    </div>
  )
}
