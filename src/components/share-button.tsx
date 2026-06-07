'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  type: 'song' | 'meeting'
  id: string
}

export function ShareButton({ type, id }: ShareButtonProps) {
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

        // 复制到剪贴板
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        toast.success('分享链接已复制到剪贴板')

        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error('创建分享链接失败')
      }
    } catch (error) {
      console.error('Share error:', error)
      toast.error('分享失败')
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
          已复制
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          {sharing ? '分享中...' : '分享'}
        </>
      )}
    </Button>
  )
}
