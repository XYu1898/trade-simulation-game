import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Order {
  id: string
  playerId: string
  playerName: string
  stock: string
  type: "BUY" | "SELL"
  price: number
  quantity: number
  round: number
  status: "PENDING" | "FILLED" | "PARTIAL"
  filledQuantity: number
}

interface OrderBook {
  buyOrders: Order[]
  sellOrders: Order[]
}

interface OrderBookDisplayProps {
  orderBook: OrderBook
}

export default function OrderBookDisplay({ orderBook }: OrderBookDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-green-600">Buy Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Player</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderBook.buyOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No buy orders
                  </TableCell>
                </TableRow>
              ) : (
                orderBook.buyOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">${order.price}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.playerName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-600">Sell Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Player</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderBook.sellOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No sell orders
                  </TableCell>
                </TableRow>
              ) : (
                orderBook.sellOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">${order.price}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.playerName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
