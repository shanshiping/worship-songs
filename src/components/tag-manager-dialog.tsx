'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type TagItem } from '@/components/tag-multi-select'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/errors'
import { Check, Loader2, Pencil, Tags, Trash2, X } from 'lucide-react'

type TagManagerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

type TagSectionProps = {
  kind: 'TYPE' | 'STYLE'
  label: string
  placeholder: string
  tags: TagItem[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  onChanged: () => void
}

function TagSection({
  kind,
  label,
  placeholder,
  tags,
  canCreate,
  canEdit,
  canDelete,
  onChanged,
}: TagSectionProps) {
  const { t } = useI18n()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return

    setCreating(true)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || t('songs.createFailed'))
        return
      }
      setNewName('')
      toast.success(t('songs.categoryCreated'))
      onChanged()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.createFailed')))
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSave = async (id: string) => {
    const name = editingName.trim()
    if (!name) return

    setSavingId(id)
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || t('songs.updateFailed'))
        return
      }
      cancelEdit()
      toast.success(t('songs.categoryUpdated'))
      onChanged()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.updateFailed')))
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (tag: TagItem) => {
    if (!confirm(t('songs.confirmDeleteTag', { name: tag.name }))) return

    setDeletingId(tag.id)
    try {
      const response = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || t('songs.deleteFailed'))
        return
      }
      toast.success(t('songs.categoryDeleted'))
      onChanged()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.deleteFailed')))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border bg-gray-50/50 p-3">
        {tags.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            {t('songs.noTagsYet')}
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm"
            >
              {editingId === tag.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-8 flex-1 rounded-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSave(tag.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-lg"
                    disabled={savingId === tag.id}
                    onClick={() => void handleSave(tag.id)}
                  >
                    {savingId === tag.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{tag.name}</span>
                  {canEdit && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => startEdit(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="rounded-lg text-destructive hover:text-destructive"
                      disabled={deletingId === tag.id}
                      onClick={() => void handleDelete(tag)}
                    >
                      {deletingId === tag.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
      {canCreate && (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={placeholder}
            className="h-10 rounded-xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
            }}
          />
          <Button
            type="button"
            className="rounded-xl"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('songs.add')
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function TagManagerDialog({
  open,
  onOpenChange,
  onChanged,
}: TagManagerDialogProps) {
  const { t } = useI18n()
  const permissions = usePermissions()
  const [typeTags, setTypeTags] = useState<TagItem[]>([])
  const [styleTags, setStyleTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTags = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        const tags = (data.tags || []) as TagItem[]
        setTypeTags(tags.filter((tag) => tag.kind === 'TYPE'))
        setStyleTags(tags.filter((tag) => tag.kind === 'STYLE'))
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void fetchTags()
  }, [open])

  const handleChanged = () => {
    void fetchTags()
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            {t('songs.tagManager')}
          </DialogTitle>
          <DialogDescription>{t('songs.tagManagerDesc')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <TagSection
              kind="TYPE"
              label={t('songs.typeTags')}
              placeholder={t('songs.newTypeTagPlaceholder')}
              tags={typeTags}
              canCreate={permissions.canCreateCategory}
              canEdit={permissions.canEditCategory}
              canDelete={permissions.canDeleteCategory}
              onChanged={handleChanged}
            />
            <TagSection
              kind="STYLE"
              label={t('songs.styleTags')}
              placeholder={t('songs.newStyleTagPlaceholder')}
              tags={styleTags}
              canCreate={permissions.canCreateCategory}
              canEdit={permissions.canEditCategory}
              canDelete={permissions.canDeleteCategory}
              onChanged={handleChanged}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
