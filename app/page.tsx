import TradingGame from "@/trading-game"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TradingGame />
    </ThemeProvider>
  )
}
