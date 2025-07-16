"use client"

import * as React from "react"

import type { ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToastsMap = Map<
  string,
  {
    toast: ToastProps
    timeout: ReturnType<typeof setTimeout>
  }
>

type Action =
  | {
      type: "ADD_TOAST"
      toast: ToastProps
    }
  | {
      type: "UPDATE_TOAST"
      toast: ToastProps
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: string
    }
  | {
      type: "REMOVE_TOAST"
      toastId?: string
    }

interface State {
  toasts: ToastProps[]
}

const reducers = {
  ADD_TOAST: (state: State, toast: ToastProps) => {
    return {
      ...state,
      toasts: [toast, ...state.toasts].slice(0, TOAST_LIMIT),
    }
  },
  UPDATE_TOAST: (state: State, toast: ToastProps) => {
    return {
      ...state,
      toasts: state.toasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t)),
    }
  },
  DISMISS_TOAST: (state: State, toastId?: string) => {
    const { toasts } = state
    if (toastId) {
      return {
        ...state,
        toasts: toasts.map((toast) => (toast.id === toastId ? { ...toast, open: false } : toast)),
      }
    }
    return {
      ...state,
      toasts: toasts.map((toast) => ({ ...toast, open: false })),
    }
  },
  REMOVE_TOAST: (state: State, toastId?: string) => {
    const { toasts } = state
    if (toastId) {
      return {
        ...state,
        toasts: toasts.filter((toast) => toast.id !== toastId),
      }
    }
    return {
      ...state,
      toasts: [],
    }
  },
}

const toast = ((options?: ToastProps) => {
  const id = options?.id || Math.random().toString(36).substring(2, 9)

  const update = (options: ToastProps) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...options, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...options,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}) as ToasterToast

type ToasterToast = (props?: ToastProps) => {
  id: string
  dismiss: () => void
  update: (props: ToastProps) => void
}

let toastsMap: ToastsMap
let dispatch: React.Dispatch<Action>

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return reducers.ADD_TOAST(state, action.toast)

    case "UPDATE_TOAST":
      return reducers.UPDATE_TOAST(state, action.toast)

    case "DISMISS_TOAST":
      return reducers.DISMISS_TOAST(state, action.toastId)

    case "REMOVE_TOAST":
      return reducers.REMOVE_TOAST(state, action.toastId)
    default:
      return state
  }
}

export function useToast() {
  const [state, localDispatch] = React.useReducer(reducer, { toasts: [] })

  React.useEffect(() => {
    toastsMap = new Map(state.toasts.map((toast) => [toast.id, { toast, timeout: setTimeout(() => {}, 0) }]))
    dispatch = localDispatch
  }, [state])

  React.useEffect(() => {
    state.toasts.forEach((currentToast) => {
      const { toast: existingToast, timeout: existingTimeout } = toastsMap.get(currentToast.id) || {}

      if (currentToast.open === false && existingToast?.open === true) {
        clearTimeout(existingTimeout)
        toastsMap.set(currentToast.id, {
          toast: currentToast,
          timeout: setTimeout(() => {
            dispatch({ type: "REMOVE_TOAST", toastId: currentToast.id })
          }, TOAST_REMOVE_DELAY),
        })
      } else if (currentToast.open === true && existingToast?.open === false) {
        clearTimeout(existingTimeout)
      }
    })
  }, [state.toasts])

  return {
    ...state,
    toast,
  }
}
