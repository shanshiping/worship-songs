'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'

interface ShareButtonProps {
  type: 'song' | 'meeting' | 'playlist'
  id: string
}

export function ShareButton({ type, id }: ShareButtonProps) {
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
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={sharing}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          {t('share.copied')}
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          {sharing ? t('share.sharing') : t('share.share')}
        </>
      )}
    </Button>
  )
}
