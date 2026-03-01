'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import type { ReservationFormData } from '@/lib/booking/schema'
import type { DailyAvailability } from '@/lib/supabase/types'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ReservationCalendar() {
  const { setValue, watch } = useFormContext<ReservationFormData>()
  const checkinDate = watch('checkinDate')
  const checkoutDate = watch('checkoutDate')
  const isMember = watch('isMember')

  const today = startOfDay(new Date())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // availability: date文字列 → DailyAvailability
  const [availability, setAvailability] = useState<Map<string, DailyAvailability>>(new Map())
  const [loadingAvail, setLoadingAvail] = useState(false)

  const maxDaysAhead = isMember ? 60 : 30
  const maxBookableDate = new Date(today)
  maxBookableDate.setDate(maxBookableDate.getDate() + maxDaysAhead)

  // 表示月の空き状況を取得
  const fetchAvailability = useCallback(async (year: number, month: number) => {
    setLoadingAvail(true)
    try {
      const from = toDateStr(new Date(year, month, 1))
      const to = toDateStr(new Date(year, month + 1, 0))
      const res = await fetch(`/api/availability?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      const map = new Map<string, DailyAvailability>()
      for (const item of json.availability ?? []) {
        map.set(item.date, item)
      }
      setAvailability(map)
    } catch {
      // APIエラー時はフォールバック（全日空きありとして扱う）
      setAvailability(new Map())
    } finally {
      setLoadingAvail(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailability(viewYear, viewMonth)
  }, [viewYear, viewMonth, fetchAvailability])

  function getAvailableSpots(date: Date): number | null {
    const avail = availability.get(toDateStr(date))
    if (!avail) return 5 // データなし = デフォルト空きあり
    if (avail.is_closed) return null
    return avail.available_sites
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleDateClick(date: Date) {
    if (date < today) return
    if (date > maxBookableDate) return
    const spots = getAvailableSpots(date)
    if (spots === null || spots === 0) return

    if (!checkinDate || (checkinDate && checkoutDate)) {
      setValue('checkinDate', date)
      setValue('checkoutDate', null)
    } else {
      if (date <= checkinDate) {
        setValue('checkinDate', date)
        setValue('checkoutDate', null)
      } else {
        setValue('checkoutDate', date)
      }
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay()

  const prevMonthLast = new Date(viewYear, viewMonth, 0)
  const paddingDays: Date[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    paddingDays.push(new Date(viewYear, viewMonth - 1, prevMonthLast.getDate() - i))
  }

  const currentDays: Date[] = []
  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentDays.push(new Date(viewYear, viewMonth, d))
  }

  const allCells = [...paddingDays, ...currentDays]
  const remaining = (7 - (allCells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) {
    allCells.push(new Date(viewYear, viewMonth + 1, d))
  }

  function getCellStyle(date: Date, isCurrentMonth: boolean) {
    const d = startOfDay(date)
    const isPast = d < today
    const isTooFar = d > maxBookableDate
    const spots = getAvailableSpots(d)
    const isFull = spots === null || spots === 0
    const isCheckin = checkinDate && isSameDay(d, checkinDate)
    const isCheckout = checkoutDate && isSameDay(d, checkoutDate)
    const isInRange =
      checkinDate && checkoutDate &&
      d > checkinDate && d < checkoutDate

    if (!isCurrentMonth) return { cell: 'bg-white p-2 h-20 flex flex-col items-center opacity-20', text: '', spots: '', spotsLabel: '' }

    if (isPast || isTooFar || isFull) {
      return {
        cell: 'bg-white p-2 h-20 flex flex-col items-center opacity-30 cursor-not-allowed',
        text: 'text-gray-400',
        spots: isFull && isCurrentMonth ? 'text-red-400 text-[10px] mt-1' : '',
        spotsLabel: isFull && isCurrentMonth && !isPast && !isTooFar ? '×' : '',
      }
    }
    if (isCheckin) {
      return {
        cell: 'bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-l-lg',
        text: 'text-white font-bold',
        spots: 'text-[10px] mt-1 text-emerald-200',
        spotsLabel: 'IN',
      }
    }
    if (isCheckout) {
      return {
        cell: 'bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-r-lg',
        text: 'text-white font-bold',
        spots: 'text-[10px] mt-1 text-emerald-200',
        spotsLabel: 'OUT',
      }
    }
    if (isInRange) {
      return {
        cell: 'bg-emerald-100 p-2 h-20 flex flex-col items-center cursor-pointer',
        text: 'text-[#2D4030]',
        spots: 'text-[10px] mt-1 text-[#2D4030]',
        spotsLabel: `残${spots}`,
      }
    }
    return {
      cell: 'bg-white p-2 h-20 flex flex-col items-center hover:bg-green-50 cursor-pointer border-2 border-transparent hover:border-[#2D4030] transition-all',
      text: '',
      spots: 'text-[10px] mt-1 text-[#2D4030]',
      spotsLabel: `残${spots}`,
    }
  }

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth <= today.getMonth())

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-stone-100 p-4 flex justify-between items-center border-b">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-colors ${
            canGoPrev ? 'hover:bg-stone-200' : 'opacity-20 cursor-not-allowed'
          }`}
        >
          ‹
        </button>
        <span className="font-bold text-lg flex items-center gap-2">
          {viewYear}年 {monthNames[viewMonth]}
          {loadingAvail && (
            <span className="w-4 h-4 border-2 border-[#2D4030] border-t-transparent rounded-full animate-spin inline-block" />
          )}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full font-bold hover:bg-stone-200 transition-colors"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center bg-stone-50 text-xs py-2 border-b">
        {DOW_LABELS.map((d, i) => (
          <div key={d} className={i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {allCells.map((date, idx) => {
          const isCurrentMonth = date.getMonth() === viewMonth
          const style = getCellStyle(date, isCurrentMonth)
          return (
            <div
              key={idx}
              className={style.cell}
              onClick={() => isCurrentMonth && handleDateClick(startOfDay(date))}
            >
              <span
                className={`text-sm ${style.text} ${date.getDay() === 0 && isCurrentMonth ? 'text-red-500' : ''} ${date.getDay() === 6 && isCurrentMonth ? 'text-blue-500' : ''}`}
              >
                {date.getDate()}
              </span>
              {style.spotsLabel && (
                <span className={style.spots}>{style.spotsLabel}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-3 bg-stone-50 border-t flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#2D4030] rounded inline-block" /> 選択中</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 border border-[#2D4030] rounded inline-block" /> 範囲内</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-gray-300 rounded inline-block" /> 空きあり</span>
        <span className="flex items-center gap-1 opacity-40"><span className="w-3 h-3 bg-gray-200 rounded inline-block" /> 満室/不可</span>
      </div>
    </div>
  )
}
