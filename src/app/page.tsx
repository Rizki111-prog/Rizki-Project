import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, CreditCard, Activity, ArrowUpRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className='min-w-0 flex-1'>
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Dasbor</h1>
            <p className="text-sm text-muted-foreground truncate whitespace-nowrap">Ringkasan bisnis Anda.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Penjualan
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp 45.231.890</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-emerald-500 flex items-center mr-1">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    20.1%
                  </span>
                  dari bulan lalu
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Laba Bersih
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp 12.234.560</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-emerald-500 flex items-center mr-1">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    180.1%
                  </span>
                   dari bulan lalu
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
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
