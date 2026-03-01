// Supabase テーブルの型定義

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "refunded";

export type Reservation = {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  notes: string;
  is_member: boolean;
  checkin_date: string; // YYYY-MM-DD
  checkout_date: string; // YYYY-MM-DD
  vehicle_count: number;
  adults: number;
  children: number;
  pets: number;
  rental_tent: boolean;
  rental_tent_count: number;
  rental_firepit: boolean;
  rental_firepit_count: number;
  total_amount: number;
  status: ReservationStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityOverride = {
  id: string;
  date: string;
  is_closed: boolean;
  max_sites: number | null;
  note: string | null;
  created_at: string;
};

export type DailyAvailability = {
  date: string;
  is_closed: boolean;
  max_sites: number;
  booked_sites: number;
  available_sites: number;
  note: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
};
