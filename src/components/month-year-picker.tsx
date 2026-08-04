'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_VALUES = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
] as const

type Translate = (
  key: string,
  params?: Record<string, string | number>
) => string

interface MonthYearPickerProps {
  value: string
  years: number[]
  onChange: (value: string) => void
  t: Translate
}

export function MonthYearPicker({
  value,
  years,
  onChange,
  t,
}: MonthYearPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'month' | 'year'>('month')

  const isYearOnly = /^\d{4}$/.test(value)
  const selectedYear = value ? Number(value.slice(0, 4)) : null
  const selectedMonth = isYearOnly ? '' : value.slice(5, 7)

  const fallbackYear = years[0] ?? new Date().getFullYear()
  const [viewYear, setViewYear] = useState(selectedYear ?? fallbackYear)

  useEffect(() => {
    if (!open) return
    setMode('month')
    setViewYear(selectedYear ?? years[0] ?? new Date().getFullYear())
  }, [open, selectedYear, years])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const minYear = years.length ? Math.min(...years) : viewYear - 10
  const maxYear = years.length ? Math.max(...years) : viewYear + 10
  const yearOptions = years.length
    ? years
    : Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

  const label = !value
    ? t('meetings.selectMonthYear')
    : isYearOnly
      ? t('meetings.wholeYearLabel', { year: selectedYear! })
      : t('meetings.monthYearLabel', {
          year: selectedYear!,
          month: Number(selectedMonth),
        })

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="min-w-48 justify-start gap-2"
        aria-label={t('meetings.selectMonthYear')}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border bg-white p-3 shadow-md">
          {mode === 'month' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={viewYear <= minYear}
                  onClick={() => setViewYear((y) => y - 1)}
                  aria-label={t('meetings.prevYear')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
                  onClick={() => setMode('year')}
                >
                  {t('meetings.yearOption', { year: viewYear })}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={viewYear >= maxYear}
                  onClick={() => setViewYear((y) => y + 1)}
                  aria-label={t('meetings.nextYear')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MONTH_VALUES.map((m) => {
                  const active =
                    !isYearOnly && selectedYear === viewYear && selectedMonth === m
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`rounded-md px-2 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        onChange(`${viewYear}-${m}`)
                        setOpen(false)
                      }}
                    >
                      {t('meetings.monthOption', { month: Number(m) })}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className={`mt-2 w-full rounded-md px-2 py-2 text-sm transition-colors ${
                  isYearOnly && selectedYear === viewYear
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-muted'
                }`}
                onClick={() => {
                  onChange(`${viewYear}`)
                  setOpen(false)
                }}
              >
                {t('meetings.wholeYear')}
              </button>
            </>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <div className="mb-2 text-center text-sm font-medium text-muted-foreground">
                {t('meetings.selectYear')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {yearOptions.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`rounded-md px-2 py-2 text-sm transition-colors ${
                      y === viewYear
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setViewYear(y)
                      setMode('month')
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
