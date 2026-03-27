import Papa from 'papaparse'

export interface CsvRow {
  date: string
  sales_count?: string
  sales_amount?: string
  cooked_rice_go?: string
  waste_count?: string
  sold_out?: string
  note?: string
}

export interface ParsedRecord {
  date: string
  sales_count: number | null
  sales_amount: number | null
  cooked_rice_go: number | null
  waste_count: number | null
  sold_out_flag: boolean
  note: string | null
}

export interface CsvParseResult {
  records: ParsedRecord[]
  errors: string[]
}

export function parseCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const records: ParsedRecord[] = []
        const errors: string[] = []

        results.data.forEach((row, index) => {
          const lineNum = index + 2 // header + 0-indexed

          // 日付バリデーション
          if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date.trim())) {
            errors.push(`${lineNum}行目: 日付が不正です (${row.date})`)
            return
          }

          const date = row.date.trim()
          const d = new Date(date)
          if (isNaN(d.getTime())) {
            errors.push(`${lineNum}行目: 無効な日付です (${date})`)
            return
          }

          records.push({
            date,
            sales_count: parseNumOrNull(row.sales_count),
            sales_amount: parseNumOrNull(row.sales_amount),
            cooked_rice_go: parseFloatOrNull(row.cooked_rice_go),
            waste_count: parseNumOrNull(row.waste_count),
            sold_out_flag: row.sold_out?.trim()?.toLowerCase() === 'true' || row.sold_out?.trim() === '1',
            note: row.note?.trim() || null,
          })
        })

        resolve({ records, errors })
      },
    })
  })
}

function parseNumOrNull(val?: string): number | null {
  if (!val || val.trim() === '') return null
  const n = parseInt(val.trim(), 10)
  return isNaN(n) ? null : n
}

function parseFloatOrNull(val?: string): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val.trim())
  return isNaN(n) ? null : n
}

export const CSV_TEMPLATE = `date,sales_count,sales_amount,cooked_rice_go,waste_count,sold_out,note
2025-01-06,180,54000,14,5,false,通常営業
2025-01-07,210,63000,16,3,false,
2025-01-08,150,45000,12,8,false,雨で客足少なめ
2025-01-09,240,72000,18,2,true,昼過ぎに売り切れ`
