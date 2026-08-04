import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { normalizeTagName, parseTagKind } from '@/lib/tags'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind')

    const where =
      kind === 'TYPE' || kind === 'STYLE' ? { kind } : undefined

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.CATEGORY_CREATE)
    const body = await request.json()
    const name = normalizeTagName(body.name)
    const kind = parseTagKind(body.kind)

    if (!name) {
      return NextResponse.json({ error: '标签名称无效' }, { status: 400 })
    }
    if (!kind) {
      return NextResponse.json({ error: '标签类型无效' }, { status: 400 })
    }

    const duplicate = await prisma.tag.findUnique({
      where: { name_kind: { name, kind } },
    })
    if (duplicate) {
      return NextResponse.json({ error: '同名标签已存在' }, { status: 409 })
    }

    const tag = await prisma.tag.create({
      data: { name, kind },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error: unknown) {
    const message = getErrorMessage(error, '创建标签失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
