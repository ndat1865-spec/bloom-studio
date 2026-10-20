import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gop class Tailwind, xu ly xung dot (quy uoc cua shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
