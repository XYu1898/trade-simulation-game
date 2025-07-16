"use client"

import { Toast, ToastPrimitives } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastPrimitives.Viewport>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastPrimitives.Title>{title}</ToastPrimitives.Title>}
            {description && <ToastPrimitives.Description>{description}</ToastPrimitives.Description>}
          </div>
          {action}
          <ToastPrimitives.Close />
        </Toast>
      ))}
      <ToastPrimitives.Viewport />
    </ToastPrimitives.Viewport>
  )
}
