"use client"

import { useMediaQuery } from "@/hooks/use-mobile"

export function useMobile() {
  return useMediaQuery("(max-width: 768px)")
}
