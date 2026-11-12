import { z } from "zod";

/**
 * Number fields are kept as text in forms (so they can be empty while typing)
 * and checked with these Zod rules. Convert with `toNumber` on submit.
 */

const isNumber = (v: string) => v !== "" && Number.isFinite(Number(v));

export const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

export const positiveNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => isNumber(v) && Number(v) > 0, `${label} must be more than 0`);

export const positiveInt = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => isNumber(v) && Number(v) > 0 && Number.isInteger(Number(v)), `${label} must be a whole number above 0`);

/** Empty counts as 0. */
export const optionalAmount = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (isNumber(v) && Number(v) >= 0), `${label} cannot be negative`);

export function toNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
