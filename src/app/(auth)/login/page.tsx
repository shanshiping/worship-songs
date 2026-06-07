'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Phone, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

type LoginMethod = 'email' | 'phone'

export default function LoginPage() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    const savedPassword = localStorage.getItem('remembered_password')
    const savedRemember = localStorage.getItem('remember_me')

    if (savedRemember === 'true' && savedEmail) {
      setEmail(savedEmail)
      if (savedPassword) {
        setPassword(savedPassword)
      }
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      toast.error('请输入正确的手机号')
      return
    }

    setSendingCode(true)
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('验证码已发送')
        setCountdown(60)
      } else {
        toast.error(data.error || '发送失败')
      }
    } catch (error) {
      toast.error('发送失败')
    } finally {
      setSendingCode(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        if (rememberMe) {
          localStorage.setItem('remembered_email', email)
          localStorage.setItem('remembered_password', password)
          localStorage.setItem('remember_me', 'true')
        } else {
          localStorage.removeItem('remembered_email')
          localStorage.removeItem('remembered_password')
          localStorage.removeItem('remember_me')
        }

        toast.success('登录成功')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('phone', {
        phone,
        code: verificationCode,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        toast.success('登录成功')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl mb-4">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">敬拜选歌平台</h1>
          <p className="text-muted-foreground mt-2">登录您的账户以继续</p>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            {/* 登录方式切换 */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="mr-2 h-4 w-4" />
                邮箱登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Phone className="mr-2 h-4 w-4" />
                手机登录
              </button>
            </div>

            {loginMethod === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 rounded-xl input-focus"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 h-11 rounded-xl input-focus"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    记住密码
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 btn-active"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>登录中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>登录</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">手机号</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={11}
                      className="pl-10 h-11 rounded-xl input-focus"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">验证码</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="请输入验证码"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                        maxLength={6}
                        className="pl-10 h-11 rounded-xl input-focus"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0}
                      className="h-11 rounded-xl px-4 whitespace-nowrap"
                    >
                      {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 btn-active"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>登录中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>登录</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                还没有账户？{' '}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  立即注册
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  )
}
