import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

interface Order {
  id: string
  playerId: string
  type: "buy" | "sell"
  price: number
  quantity: number
  round: number
}

interface OrderBookDisplayProps {
  orders: Order[]
  currentRound: number
}

export function OrderBookDisplay({ orders, currentRound }: OrderBookDisplayProps) {
  const currentRoundOrders = orders.filter((order) => order.round === currentRound)

  const buyOrders = currentRoundOrders.filter((order) => order.type === "buy").sort((a, b) => b.price - a.price) // Sort buy orders by price descending
  const sellOrders = currentRoundOrders.filter((order) => order.type === "sell").sort((a, b) => a.price - b.price) // Sort sell orders by price ascending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Book (Round {currentRound})</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-green-600">Buy Orders</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buyOrders.length > 0 ? (
                buyOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>${order.price}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    No buy orders
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2 text-red-600">Sell Orders</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellOrders.length > 0 ? (
                sellOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>${order.price}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    No sell orders
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
