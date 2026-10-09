import { z } from "zod";

// Esquema Zod aplicado por POST /api/transactions; hash es opcional para poder registrar
// también el caso sin HMAC como HASH_INVALIDO en vez de rechazar la transacción.
export const txnSchema = z.object({
  // El identificador de entrada debe ser numérico y no negativo.
  idTxn: z.number().nonnegative(),
  // trim elimina espacios externos y email comprueba el formato del correo.
  user: z.string().trim().email(),
  // Comprueba que la fecha se pueda interpretar y la transforma en Date en el resultado Zod.
  date: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: "date debe ser una fecha válida.",
    })
    .transform((value) => new Date(value)),
  // El monto no puede ser negativo; el método debe tener al menos dos caracteres.
  value: z.number().nonnegative(),
  paymentMethod: z.string().trim().min(2),
  hash: z.string().trim().optional(),
});
