'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Loader2, Users } from 'lucide-react'

interface TeamOption {
  id: string
  name: string
  _count?: { members: number }
}

interface ShareToTeamDialogProps {
  songId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareToTeamDialog({
  songId,
  open,
  onOpenChange,
}: ShareToTeamDialogProps) {
  const { t } = useI18n()
  const { status } = useSession()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [sharedId, setSharedId] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams', { credentials: 'include' })
      if (res.ok) {
        const data = (await res.json()) as TeamOption[]
        setTeams(data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || status !== 'authenticated') return
    setSharedId(null)
    void fetchTeams()
  }, [open, status, fetchTeams])

  const shareToTeam = async (teamId: string) => {
    const res = await fetch(`/api/teams/${teamId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ songId }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      toast.error(data?.error || t('teams.shareSongFailed'))
      return false
    }

    return true
  }

  const handleSelect = async (teamId: string) => {
    setSharingId(teamId)
    try {
      const ok = await shareToTeam(teamId)
      if (ok) {
        toast.success(t('teams.shareSongSuccess'))
        setSharedId(teamId)
        onOpenChange(false)
      }
    } finally {
      setSharingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('teams.shareToTeam')}</DialogTitle>
          <DialogDescription>{t('teams.shareToTeamDesc')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {status === 'unauthenticated' ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('teams.loginToShare')}
            </p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('teams.noTeams')}</p>
            </div>
          ) : (
            teams.map((team) => {
              const isSharing = sharingId === team.id
              const isShared = sharedId === team.id
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={isSharing}
                  onClick={() => handleSelect(team.id)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('teams.membersCount', {
                        count: team._count?.members ?? 0,
                      })}
                    </p>
                  </div>
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : isShared ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
