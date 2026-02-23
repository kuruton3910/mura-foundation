"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ReservationFormData } from "@/lib/booking/schema";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// Mock availability: returns remaining spots (0 = full, null = closed)
function getMockSpots(date: Date): number | null {
  const day = date.getDay();
  const d = date.getDate();
  // Closed on specific dates (demo)
  if (d === 10 || d === 20) return 0;
  // Fewer spots on weekends
  if (day === 0 || day === 6) return d % 3 === 0 ? 0 : 2;
  return d % 7 === 0 ? 1 : 5;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function ReservationCalendar() {
  const { setValue, watch } = useFormContext<ReservationFormData>();
  const checkinDate = watch("checkinDate");
  const checkoutDate = watch("checkoutDate");
  const isMember = watch("isMember");

  const today = startOfDay(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const maxDaysAhead = isMember ? 60 : 30;
  const maxBookableDate = new Date(today);
  maxBookableDate.setDate(maxBookableDate.getDate() + maxDaysAhead);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  function handleDateClick(date: Date) {
    if (date < today) return;
    if (date > maxBookableDate) return;
    const spots = getMockSpots(date);
    if (spots === 0 || spots === null) return;

    if (!checkinDate || (checkinDate && checkoutDate)) {
      // Start new selection
      setValue("checkinDate", date);
      setValue("checkoutDate", null);
    } else {
      // Second click: set checkout (must be after checkin)
      if (date <= checkinDate) {
        setValue("checkinDate", date);
        setValue("checkoutDate", null);
      } else {
        setValue("checkoutDate", date);
      }
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();

  // Previous month padding days
  const prevMonthLast = new Date(viewYear, viewMonth, 0);
  const paddingDays: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    paddingDays.push(
      new Date(viewYear, viewMonth - 1, prevMonthLast.getDate() - i),
    );
  }

  const currentDays: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentDays.push(new Date(viewYear, viewMonth, d));
  }

  const allCells = [...paddingDays, ...currentDays];
  // Fill to complete last row
  const remaining = (7 - (allCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    allCells.push(new Date(viewYear, viewMonth + 1, d));
  }

  function getCellStyle(date: Date, isCurrentMonth: boolean) {
    const d = startOfDay(date);
    const isPast = d < today;
    const isTooFar = d > maxBookableDate;
    const spots = getMockSpots(d);
    const isFull = spots === 0 || spots === null;
    const isCheckin = checkinDate && isSameDay(d, checkinDate);
    const isCheckout = checkoutDate && isSameDay(d, checkoutDate);
    const isInRange =
      checkinDate && checkoutDate && d > checkinDate && d < checkoutDate;

    if (!isCurrentMonth)
      return {
        cell: "bg-white p-2 h-20 flex flex-col items-center opacity-20",
        text: "",
        spots: "",
      };
    if (isPast || isTooFar || isFull) {
      return {
        cell: "bg-white p-2 h-20 flex flex-col items-center opacity-30 cursor-not-allowed",
        text: "text-gray-400",
        spots: isFull ? "text-red-400 text-[10px] mt-1" : "",
        spotsLabel: isFull ? "×" : "",
      };
    }
    if (isCheckin) {
      return {
        cell: "bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-l-lg",
        text: "text-white font-bold",
        spots: "text-[10px] mt-1 text-emerald-200",
        spotsLabel: "IN",
      };
    }
    if (isCheckout) {
      return {
        cell: "bg-[#2D4030] p-2 h-20 flex flex-col items-center cursor-pointer rounded-r-lg",
        text: "text-white font-bold",
        spots: "text-[10px] mt-1 text-emerald-200",
        spotsLabel: "OUT",
      };
    }
    if (isInRange) {
      return {
        cell: "bg-emerald-100 p-2 h-20 flex flex-col items-center cursor-pointer",
        text: "text-[#2D4030]",
        spots: "text-[10px] mt-1 text-[#2D4030]",
        spotsLabel: `残${spots}`,
      };
    }
    return {
      cell: "bg-white p-2 h-20 flex flex-col items-center hover:bg-green-50 cursor-pointer border-2 border-transparent hover:border-[#2D4030] transition-all",
      text: "",
      spots: "text-[10px] mt-1 text-[#2D4030]",
      spotsLabel: `残${spots}`,
    };
  }

  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  // Can we go back? Don't show past months before today's month
  const canGoPrev = !(
    viewYear === today.getFullYear() && viewMonth <= today.getMonth()
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-stone-100 p-4 flex justify-between items-center border-b">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-colors ${
            canGoPrev ? "hover:bg-stone-200" : "opacity-20 cursor-not-allowed"
          }`}
        >
          ‹
        </button>
        <span className="font-bold text-lg">
          {viewYear}年 {monthNames[viewMonth]}
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
          <div
            key={d}
            className={
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
            }
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {allCells.map((date, idx) => {
          const isCurrentMonth = date.getMonth() === viewMonth;
          const style = getCellStyle(date, isCurrentMonth);
          return (
            <div
              key={idx}
              className={style.cell}
              onClick={() =>
                isCurrentMonth && handleDateClick(startOfDay(date))
              }
            >
              <span
                className={`text-sm ${style.text} ${date.getDay() === 0 && isCurrentMonth ? "text-red-500" : ""} ${date.getDay() === 6 && isCurrentMonth ? "text-blue-500" : ""}`}
              >
                {date.getDate()}
              </span>
              {style.spotsLabel && (
                <span className={style.spots}>{style.spotsLabel}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-stone-50 border-t flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#2D4030] rounded inline-block" /> 選択中
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-emerald-100 border border-[#2D4030] rounded inline-block" />{" "}
          範囲内
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-white border border-gray-300 rounded inline-block" />{" "}
          空きあり
        </span>
        <span className="flex items-center gap-1 opacity-40">
          <span className="w-3 h-3 bg-gray-200 rounded inline-block" />{" "}
          満室/不可
        </span>
      </div>
    </div>
  );
}
