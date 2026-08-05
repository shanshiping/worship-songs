'use client'

import { Music } from 'lucide-react'
import { cn } from '@/lib/utils'

const COVER_GRADIENTS = [
  'from-emerald-600/90 via-teal-600/80 to-cyan-700/90',
  'from-amber-500/90 via-orange-500/80 to-rose-500/90',
  'from-violet-600/90 via-indigo-600/80 to-blue-600/90',
  'from-lime-600/90 via-green-600/80 to-emerald-700/90',
  'from-sky-600/90 via-cyan-600/80 to-teal-700/90',
] as const

function gradientForTitle(title: string): (typeof COVER_GRADIENTS)[number] {
  let hash = 0
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]!
}

type SongCoverArtProps = {
  title: string
  coverImage?: string | null
  className?: string
  iconClassName?: string
}

export function SongCoverArt({
  title,
  coverImage,
  className,
  iconClassName,
}: SongCoverArtProps) {
  const gradient = gradientForTitle(title)

  if (coverImage) {
    return (
      <div className={cn('music-cover w-full', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'music-cover w-full bg-gradient-to-br text-white shadow-inner',
        gradient,
        className
      )}
      aria-hidden
    >
      <Music className={cn('h-10 w-10 opacity-90', iconClassName)} />
    </div>
  )
}
