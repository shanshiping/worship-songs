import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查编辑权限
    await requirePermission(PERMISSIONS.CATEGORY_EDIT)

    const { id } = await params

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: '分类名称为必填项' },
        { status: 400 }
      )
    }

    // 检查分类名是否已存在
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        id: { not: id },
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: '该分类名已存在' },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: error.message || '更新分类失败' },
      { status: error.message === '请先登录' ? 401 : 403 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查删除权限
    await requirePermission(PERMISSIONS.CATEGORY_DELETE)

    const { id } = await params

    // 检查分类下是否有歌曲
    const songsCount = await prisma.song.count({
      where: { categoryId: id },
    })

    if (songsCount > 0) {
      // 将歌曲移动到"其他"分类
      const otherCategory = await prisma.category.findUnique({
        where: { name: '其他' },
      })

      if (otherCategory) {
        await prisma.song.updateMany({
          where: { categoryId: id },
          data: { categoryId: otherCategory.id },
        })
      }
    }

    await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json({ message: '分类已删除' })
  } catch (error: any) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: error.message || '删除分类失败' },
      { status: error.message === '请先登录' ? 401 : 403 }
    )
  }
}
