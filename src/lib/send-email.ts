import nodemailer from 'nodemailer'

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const subject = '邮箱验证码 - 敬拜选歌平台'
  const text = `您的验证码是：${code}，5 分钟内有效。如非本人操作，请忽略此邮件。`
  const html = `<p>您的验证码是：<strong>${code}</strong></p><p>5 分钟内有效。如非本人操作，请忽略此邮件。</p>`

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  if (host && from) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    })

    await transporter.sendMail({ from, to, subject, text, html })
    return
  }

  console.log(`[Email] Verification code for ${to}: ${code}`)
}
