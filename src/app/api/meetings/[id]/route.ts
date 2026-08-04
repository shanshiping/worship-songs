import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            song: {
              include: {
                tags: { include: { tag: true } },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!meeting) {
      return NextResponse.json(
        { error: '聚会记录不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Get meeting error:', error)
    return NextResponse.json(
      { error: '获取聚会详情失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查编辑权限
    await requirePermission(PERMISSIONS.MEETING_EDIT)

    const { id } = await params

    const body = await request.json()
    const { date, theme, speaker, leader, type, notes, songIds } = body

    // 删除现有的歌曲关联
    await prisma.meetingSong.deleteMany({
      where: { meetingId: id },
    })

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        theme,
        speaker,
        leader,
        type,
        notes,
        songs: {
          create: songIds?.map((songId: string, index: number) => ({
            songId,
            order: index + 1,
          })) || [],
        },
      },
      include: {
        songs: {
          include: {
            song: {
              include: {
                tags: { include: { tag: true } },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return NextResponse.json(meeting)
  } catch (error: unknown) {
    console.error('Update meeting error:', error)
    const message = getErrorMessage(error, '更新聚会记录失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : 403 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查删除权限
    await requirePermission(PERMISSIONS.MEETING_DELETE)

    const { id } = await params

    await prisma.meeting.delete({
      where: { id },
    })

    return NextResponse.json({ message: '聚会记录已删除' })
  } catch (error: unknown) {
    console.error('Delete meeting error:', error)
    const message = getErrorMessage(error, '删除聚会记录失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : 403 }
    )
  }
}
