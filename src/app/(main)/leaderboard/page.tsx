'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Medal, Award, Music } from 'lucide-react'
import Link from 'next/link'

interface LeaderboardItem {
  rank: number
  id: string
  title: string
  artist: string | null
  category: string
  count: number
}

const PAGE_SIZES = [10, 20, 50] as const

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<string>('') // '' = 全部时间
  const [years, setYears] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (year) params.set('year', year)

        const response = await fetch(`/api/leaderboard?${params}`)
        if (!response.ok || cancelled) return

        const data = await response.json()
        if (cancelled) return

        setLeaderboard(data.leaderboard)
        setYears(data.years || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch leaderboard:', error)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [year, page, pageSize])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground w-6 text-center">
            {rank}
          </span>
        )
    }
  }

  const periodLabel = year ? `${year} 年` : '全部时间'
  const showPodium = page === 1 && leaderboard.length > 0
  const podiumItems = showPodium ? leaderboard.slice(0, 3) : []
  const listItems = showPodium ? leaderboard.slice(3) : leaderboard

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">歌曲排行榜</h1>
        <p className="text-muted-foreground">查看最受欢迎的歌曲</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label="选择年份"
        >
          <option value="">全部时间</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </select>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label="每页条数"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              每页 {size} 条
            </option>
          ))}
        </select>

        {!loading && total > 0 && (
          <span className="text-sm text-muted-foreground">
            共 {total} 首 · {periodLabel}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无数据</p>
            <p className="text-sm text-muted-foreground mt-1">
              添加聚会记录后即可查看排行榜
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {showPodium && (
            <div className="grid gap-4 md:grid-cols-3">
              {podiumItems.map((item) => (
                <Link key={item.id} href={`/songs/${item.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(item.rank)}
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      {item.artist && (
                        <CardDescription>{item.artist}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">{item.count}</span>
                        <span className="text-muted-foreground">次使用</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>完整排行榜</CardTitle>
              <CardDescription>
                {periodLabel}使用次数最多的歌曲
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {listItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/songs/${item.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-bold text-muted-foreground w-8 text-center">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.artist && (
                          <p className="text-sm text-muted-foreground">
                            {item.artist}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{item.category}</Badge>
                      <div className="flex items-center space-x-1">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{item.count}</span>
                        <span className="text-sm text-muted-foreground">次</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                上一页
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
