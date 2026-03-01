import { z } from "zod";

export const reservationSchema = z.object({
  isMember: z.boolean(),
  checkinDate: z.date().nullable(),
  checkoutDate: z.date().nullable(),
  vehicleCount: z.number().int().min(1).max(5),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  pets: z.number().int().min(0).max(5),
  // { optionId: count } — count 0 means not selected
  optionCounts: z.record(z.string(), z.number().int().min(0)).catch({}),
  agreedToTerms: z.boolean(),
  guestName: z.string(),
  guestEmail: z.string(),
  guestPhone: z.string(),
  notes: z.string(),
  couponCode: z.string(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;

export const defaultFormValues: ReservationFormData = {
  isMember: false,
  checkinDate: null,
  checkoutDate: null,
  vehicleCount: 1,
  adults: 1,
  children: 0,
  pets: 0,
  optionCounts: {},
  agreedToTerms: false,
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  notes: "",
  couponCode: "",
};
