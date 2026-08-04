import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { normalizeTagName } from '@/lib/tags'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.CATEGORY_EDIT)
    const { id } = await params
    const body = await request.json()
    const name = normalizeTagName(body.name)

    if (!name) {
      return NextResponse.json({ error: '标签名称无效' }, { status: 400 })
    }

    const existing = await prisma.tag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 })
    }

    const duplicate = await prisma.tag.findUnique({
      where: { name_kind: { name, kind: existing.kind } },
    })
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: '同名标签已存在' }, { status: 409 })
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json({ tag })
  } catch (error: unknown) {
    const message = getErrorMessage(error, '更新标签失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.CATEGORY_DELETE)
    const { id } = await params

    const existing = await prisma.tag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 })
    }

    await prisma.tag.delete({ where: { id } })

    return NextResponse.json({ message: '标签已删除' })
  } catch (error: unknown) {
    const message = getErrorMessage(error, '删除标签失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
