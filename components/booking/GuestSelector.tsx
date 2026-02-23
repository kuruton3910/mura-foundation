'use client'

import { useFormContext } from 'react-hook-form'
import type { ReservationFormData } from '@/lib/booking/schema'

type CounterRowProps = {
  label: string
  sublabel?: string
  field: 'adults' | 'children' | 'pets' | 'vehicleCount' | 'rentalTentCount' | 'rentalFirepitCount'
  min: number
  max: number
}

function CounterRow({ label, sublabel, field, min, max }: CounterRowProps) {
  const { watch, setValue } = useFormContext<ReservationFormData>()
  const value = watch(field) as number

  return (
    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg">
      <div>
        <span className="block font-medium">{label}</span>
        {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
      </div>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setValue(field, Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          -
        </button>
        <span className="font-bold w-6 text-center">{value}</span>
        <button
          type="button"
          onClick={() => setValue(field, Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function VehicleSelector() {
  return (
    <div>
      <label className="block font-bold mb-2">車両台数（区画数）</label>
      <p className="text-xs text-gray-500 mb-3">※1台につき1区画の予約となります。</p>
      <CounterRow label="車両・区画" field="vehicleCount" min={1} max={5} />
    </div>
  )
}

export function GuestCountSelector() {
  const { formState: { errors } } = useFormContext<ReservationFormData>()
  return (
    <div className="space-y-3">
      <label className="block font-bold mb-2">人数内訳</label>
      <CounterRow label="大人" sublabel="中学生以上" field="adults" min={1} max={20} />
      <CounterRow label="子ども" sublabel="小学生以下" field="children" min={0} max={20} />
      <CounterRow label="ペット" field="pets" min={0} max={5} />
      {errors.adults && (
        <p className="text-xs text-red-500">{errors.adults.message}</p>
      )}
    </div>
  )
}

export function RentalCountSelector({ type }: { type: 'tent' | 'firepit' }) {
  if (type === 'tent') {
    return <CounterRow label="レンタルテント" sublabel="枚数" field="rentalTentCount" min={1} max={5} />
  }
  return <CounterRow label="焚き火台" sublabel="台数" field="rentalFirepitCount" min={1} max={5} />
}
