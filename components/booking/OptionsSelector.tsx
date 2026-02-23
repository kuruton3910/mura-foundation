'use client'

import { useFormContext } from 'react-hook-form'
import type { ReservationFormData } from '@/lib/booking/schema'
import { RentalCountSelector } from './GuestSelector'

export default function OptionsSelector() {
  const { watch, setValue } = useFormContext<ReservationFormData>()
  const rentalTent = watch('rentalTent')
  const rentalFirepit = watch('rentalFirepit')

  return (
    <div className="space-y-3">
      {/* Tent */}
      <div className="border rounded-lg overflow-hidden">
        <label className="flex items-center p-4 cursor-pointer hover:bg-stone-50 transition-colors">
          <input
            type="checkbox"
            checked={rentalTent}
            onChange={e => setValue('rentalTent', e.target.checked)}
            className="w-5 h-5 accent-[#2D4030]"
          />
          <div className="ml-4 flex-1">
            <span className="block font-bold">レンタルテント</span>
            <span className="text-sm text-gray-500">¥3,000 / 1張</span>
          </div>
        </label>
        {rentalTent && (
          <div className="px-4 pb-4 bg-stone-50 border-t">
            <RentalCountSelector type="tent" />
          </div>
        )}
      </div>

      {/* Fire pit */}
      <div className="border rounded-lg overflow-hidden">
        <label className="flex items-center p-4 cursor-pointer hover:bg-stone-50 transition-colors">
          <input
            type="checkbox"
            checked={rentalFirepit}
            onChange={e => setValue('rentalFirepit', e.target.checked)}
            className="w-5 h-5 accent-[#2D4030]"
          />
          <div className="ml-4 flex-1">
            <span className="block font-bold">焚き火台セット</span>
            <span className="text-sm text-gray-500">¥1,500 / 1台</span>
          </div>
        </label>
        {rentalFirepit && (
          <div className="px-4 pb-4 bg-stone-50 border-t">
            <RentalCountSelector type="firepit" />
          </div>
        )}
      </div>
    </div>
  )
}
