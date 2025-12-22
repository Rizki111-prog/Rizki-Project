import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const transactions = [
  {
    invoice: "INV001",
    paymentStatus: "Sukses",
    totalAmount: "Rp 250.000",
    paymentMethod: "Credit Card",
    product: "Pulsa Telkomsel 200k"
  },
  {
    invoice: "INV002",
    paymentStatus: "Proses",
    totalAmount: "Rp 150.000",
    paymentMethod: "PayPal",
    product: "Token Listrik 100k"
  },
  {
    invoice: "INV003",
    paymentStatus: "Gagal",
    totalAmount: "Rp 350.000",
    paymentMethod: "Bank Transfer",
    product: "Paket Data Indosat 10GB"
  },
];


export default function HistoryPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Riwayat Transaksi</h1>
            <p className="text-sm text-muted-foreground">Lihat, filter, dan lacak semua aktivitas sebelumnya.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Semua Transaksi</CardTitle>
            <CardDescription>Catatan semua transaksi penjualan dan pengeluaran.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {transactions.map((transaction) => (
                    <Card key={transaction.invoice} className="rounded-lg border">
                        <CardHeader className="pb-4">
                           <div className="flex justify-between items-start">
                             <div>
                                <CardTitle className="text-base font-bold">{transaction.product}</CardTitle>
                                <CardDescription>{transaction.invoice}</CardDescription>
                             </div>
                             <Badge 
                                variant={
                                    transaction.paymentStatus === "Sukses" ? "default" :
                                    transaction.paymentStatus === "Proses" ? "secondary" :
                                    "destructive"
                                }
                                className="capitalize text-xs"
                            >
                                {transaction.paymentStatus.toLowerCase()}
                            </Badge>
                           </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                           <div className="flex justify-between">
                             <span className="text-muted-foreground">Jumlah:</span>
                             <span className="font-semibold">{transaction.totalAmount}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-muted-foreground">Metode:</span>
                             <span className="font-semibold">{transaction.paymentMethod}</span>
                           </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => (
                        <TableRow key={transaction.invoice}>
                            <TableCell className="font-medium">{transaction.invoice}</TableCell>
                            <TableCell>
                                <Badge 
                                    variant={
                                        transaction.paymentStatus === "Sukses" ? "default" :
                                        transaction.paymentStatus === "Proses" ? "secondary" :
                                        "destructive"
                                    }
                                    className="capitalize"
                                >
                                    {transaction.paymentStatus.toLowerCase()}
                                </Badge>
                            </TableCell>
                            <TableCell>{transaction.paymentMethod}</TableCell>
                            <TableCell className="text-right">{transaction.totalAmount}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
