import { z } from "zod";

export const reservationSchema = z.object({
  isMember: z.boolean(),
  checkinDate: z.date().nullable(),
  checkoutDate: z.date().nullable(),
  vehicleCount: z.number().int().min(1).max(5),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  pets: z.number().int().min(0).max(5),
  rentalTent: z.boolean(),
  rentalTentCount: z.number().int().min(0).max(5),
  rentalFirepit: z.boolean(),
  rentalFirepitCount: z.number().int().min(0).max(5),
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
  rentalTent: false,
  rentalTentCount: 1,
  rentalFirepit: false,
  rentalFirepitCount: 1,
  agreedToTerms: false,
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  notes: "",
  couponCode: "",
};
