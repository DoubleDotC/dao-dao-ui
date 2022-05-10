import { ArrowNarrowLeftIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import { FC } from 'react'

export interface BreadcrumbsProps {
  crumbs: Array<[string, string]>
}

// Navigation breadcrumbs. We hide these on small screens prefering the nav bar.
export const Breadcrumbs: FC<BreadcrumbsProps> = ({ crumbs }) => (
  <ul className="md:flex list-none link-text hidden">
    <li key="icon">
      <Link href={crumbs[crumbs.length - 2][0]}>
        <a>
          <ArrowNarrowLeftIcon className="inline mb-1 w-5 h-5" />
        </a>
      </Link>
    </li>
    {crumbs.map(([link, name], idx) => (
      <li key={name}>
        <Link href={link}>
          <a className="mx-2">{name}</a>
        </Link>
        {idx != crumbs.length - 1 && '/'}
      </li>
    ))}
  </ul>
)
