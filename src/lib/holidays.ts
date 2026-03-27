// 日本の祝日データ (2024-2027)
// ソース: 内閣府「国民の祝日」

const HOLIDAYS: Record<string, string> = {
  // 2024
  '2024-01-01': '元日',
  '2024-01-08': '成人の日',
  '2024-02-11': '建国記念の日',
  '2024-02-12': '振替休日',
  '2024-02-23': '天皇誕生日',
  '2024-03-20': '春分の日',
  '2024-04-29': '昭和の日',
  '2024-05-03': '憲法記念日',
  '2024-05-04': 'みどりの日',
  '2024-05-05': 'こどもの日',
  '2024-05-06': '振替休日',
  '2024-07-15': '海の日',
  '2024-08-11': '山の日',
  '2024-08-12': '振替休日',
  '2024-09-16': '敬老の日',
  '2024-09-22': '秋分の日',
  '2024-09-23': '振替休日',
  '2024-10-14': 'スポーツの日',
  '2024-11-03': '文化の日',
  '2024-11-04': '振替休日',
  '2024-11-23': '勤労感謝の日',
  // 2025
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-02-24': '振替休日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-05-06': '振替休日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',
  // 2026
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '振替休日',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-22': '国民の休日',
  '2026-09-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
  // 2027
  '2027-01-01': '元日',
  '2027-01-11': '成人の日',
  '2027-02-11': '建国記念の日',
  '2027-02-23': '天皇誕生日',
  '2027-03-21': '春分の日',
  '2027-03-22': '振替休日',
  '2027-04-29': '昭和の日',
  '2027-05-03': '憲法記念日',
  '2027-05-04': 'みどりの日',
  '2027-05-05': 'こどもの日',
  '2027-07-19': '海の日',
  '2027-08-11': '山の日',
  '2027-09-20': '敬老の日',
  '2027-09-23': '秋分の日',
  '2027-10-11': 'スポーツの日',
  '2027-11-03': '文化の日',
  '2027-11-23': '勤労感謝の日',
}

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}

export function isHoliday(dateStr: string): boolean {
  return dateStr in HOLIDAYS
}

export function getHolidayName(dateStr: string): string | null {
  return HOLIDAYS[dateStr] ?? null
}

export function isHolidayEve(dateStr: string): boolean {
  const date = new Date(dateStr)
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  const nextStr = next.toISOString().split('T')[0]
  return isHoliday(nextStr)
}

export function getCalendarInfo(dateStr: string) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const month = date.getMonth() + 1

  // Check consecutive holiday
  const prev = new Date(date)
  prev.setDate(prev.getDate() - 1)
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  const prevStr = prev.toISOString().split('T')[0]
  const nextStr = next.toISOString().split('T')[0]

  const todayIsHoliday = isHoliday(dateStr)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const todayOff = todayIsHoliday || isWeekend

  const prevIsOff = isHoliday(prevStr) || prev.getDay() === 0 || prev.getDay() === 6
  const nextIsOff = isHoliday(nextStr) || next.getDay() === 0 || next.getDay() === 6
  const isConsecutive = todayOff && (prevIsOff || nextIsOff)

  return {
    date: dateStr,
    weekday: dayOfWeek,
    weekday_name: WEEKDAY_NAMES[dayOfWeek],
    is_weekend: isWeekend,
    is_holiday: todayIsHoliday,
    holiday_name: getHolidayName(dateStr),
    is_holiday_eve: isHolidayEve(dateStr),
    is_consecutive_holiday: isConsecutive,
    month,
    season: getSeason(month),
  }
}
