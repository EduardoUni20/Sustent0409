import { z } from "zod";

export const txnSchema = z.object({
  idTxn: z.number().nonnegative(),
  user: z.string().trim().email(),
  date: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: "date debe ser una fecha válida.",
    })
    .transform((value) => new Date(value)),
  value: z.number().nonnegative(),
  paymentMethod: z.string().trim().min(2),
  hash: z.string().trim().optional(),
});
