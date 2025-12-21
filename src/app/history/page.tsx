import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const transactions = [
  {
    invoice: "INV001",
    paymentStatus: "Sukses",
    totalAmount: "Rp 250.000",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Proses",
    totalAmount: "Rp 150.000",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Gagal",
    totalAmount: "Rp 350.000",
    paymentMethod: "Bank Transfer",
  },
];


export default function HistoryPage() {
  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Riwayat Transaksi</h1>
            <p className="text-sm text-muted-foreground">Lihat, filter, dan lacak semua aktivitas sebelumnya.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Semua Transaksi</CardTitle>
            <CardDescription>Catatan semua transaksi penjualan dan pengeluaran.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
