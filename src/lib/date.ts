// 日本時間(JST = UTC+9)の現在日時を取得するユーティリティ
// Vercel等のサーバーがUTCで動作しても正しい日本日付を返す

export function nowJST(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 9 * 60 * 60000)
}

export function todayJST(): string {
  const d = nowJST()
  return formatDateJST(d)
}

export function tomorrowJST(): string {
  const d = nowJST()
  d.setDate(d.getDate() + 1)
  return formatDateJST(d)
}

export function daysAgoJST(n: number): string {
  const d = nowJST()
  d.setDate(d.getDate() - n)
  return formatDateJST(d)
}

function formatDateJST(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
