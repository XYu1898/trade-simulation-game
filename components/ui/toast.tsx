"use client"

import * as React from "react"
import type { ToastProps } from "@radix-ui/react-toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastPrimitives = {
  Root: React.forwardRef<
    React.ElementRef<"div">,
    ToastProps & {
      type?: "default" | "success" | "destructive"
    }
  >(({ className, type, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
          type === "default" && "border-gray-200 bg-white text-gray-900",
          type === "success" && "border-green-500 bg-green-50 text-green-900",
          type === "destructive" && "border-red-500 bg-red-50 text-red-900",
          className,
        )}
        {...props}
      >
        {children}
        <div className="absolute right-2 top-2 rounded-md p-1 text-gray-900/50 opacity-0 transition-opacity hover:text-gray-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
          <X className="h-4 w-4" />
        </div>
      </div>
    )
  }),
  Title: React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />,
  ),
  Description: React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />,
  ),
  Action: React.forwardRef<React.ElementRef<"button">, React.ComponentPropsWithoutRef<"button">>(
    ({ className, ...props }, ref) => (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-100 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-red-400",
          className,
        )}
        {...props}
      />
    ),
  ),
  Viewport: React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn(
          "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
          className,
        )}
        {...props}
      />
    ),
  ),
}

export { ToastPrimitives }
