import { redirect } from 'next/navigation'

export default function GuidePage() {
  redirect('/dashboard?guide=1')
}
