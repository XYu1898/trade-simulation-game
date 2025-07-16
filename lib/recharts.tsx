import type * as React from "react"

/**
 * Extremely lightweight stand-ins for the Recharts components we use.
 * They just render children so that the JSX tree doesn’t break in Next.js.
 * Replace with a real chart implementation when you’re ready.
 */

/* Containers */
export const ResponsiveContainer = ({
  width = "100%",
  height = "100%",
  children,
}: React.PropsWithChildren<{ width?: string | number; height?: string | number }>) => (
  <div style={{ width, height }}>{children}</div>
)

/* Chart shells – they simply wrap children for now */
export const LineChart = ({ children }: React.PropsWithChildren) => (
  <svg width="100%" height="100%" data-placeholder-chart>
    {children}
  </svg>
)

export const CartesianGrid = () => null

/* Axes & primitives – no-ops for layout */
export const XAxis = () => null
export const YAxis = () => null
export const Line = () => null

/* Tooltip & Legend placeholders */
export const Tooltip = () => null
export const Legend = () => null
