'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'

interface ShareButtonProps {
  type: 'song' | 'meeting' | 'playlist'
  id: string
  compact?: boolean
  className?: string
}

export function ShareButton({ type, id, compact = false, className }: ShareButtonProps) {
  const { t } = useI18n()
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    setSharing(true)

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, id }),
      })

      if (response.ok) {
        const data = await response.json()
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        toast.success(t('share.copySuccess'))
        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error(t('share.createFailed'))
      }
    } catch (error) {
      console.error('Share error:', error)
      toast.error(t('share.failed'))
    } finally {
      setSharing(false)
    }
  }

  return (
    <Button
      variant={compact ? 'ghost' : 'outline'}
      size={compact ? 'icon-sm' : 'sm'}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void handleShare()
      }}
      disabled={sharing}
      className={className}
      title={compact ? t('share.share') : undefined}
    >
      {copied ? (
        compact ? (
          <Check className="h-4 w-4" />
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t('share.copied')}
          </>
        )
      ) : (
        compact ? (
          <Share2 className="h-4 w-4" />
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" />
            {sharing ? t('share.sharing') : t('share.share')}
          </>
        )
      )}
    </Button>
  )
}
