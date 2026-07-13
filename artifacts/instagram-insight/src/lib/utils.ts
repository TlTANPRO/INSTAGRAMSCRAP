import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

export function formatPercent(num: number): string {
  if (num === undefined || num === null) return "0%";
  return num.toFixed(2) + "%";
}

export function formatDate(date: string | number): string {
  if (!date) return "";
  return format(new Date(typeof date === "number" ? date * 1000 : date), "d MMM yyyy", { locale: id });
}
