'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [period])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leaderboard?period=${period}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{rank}</span>
    }
  }

  const periodLabels: Record<string, string> = {
    all: '全部时间',
    year: '今年',
    month: '本月',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">歌曲排行榜</h1>
        <p className="text-muted-foreground">查看最受欢迎的歌曲</p>
      </div>

      <div className="flex space-x-2">
        {Object.entries(periodLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
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
          {/* Top 3 */}
          <div className="grid gap-4 md:grid-cols-3">
            {leaderboard.slice(0, 3).map((item) => (
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

          {/* Rest */}
          <Card>
            <CardHeader>
              <CardTitle>完整排行榜</CardTitle>
              <CardDescription>
                {periodLabels[period]}使用次数最多的歌曲
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.slice(3).map((item) => (
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
        </div>
      )}
    </div>
  )
}
