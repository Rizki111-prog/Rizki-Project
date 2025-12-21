import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, CreditCard, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Dasbor</h1>
            <p className="text-sm text-muted-foreground">Ringkasan bisnis Anda.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Penjualan
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp 45.231.890</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% dari bulan lalu
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Laba Bersih
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp 12.234.560</div>
                <p className="text-xs text-muted-foreground">
                  +180.1% dari bulan lalu
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaksi Aktif</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">
                  +201 sejak jam terakhir
                </p>
              </CardContent>
            </Card>
        </div>
        <div>
            <p className="text-muted-foreground">Grafik dan tabel data akan ada di sini.</p>
        </div>
      </main>
    </div>
  );
}
