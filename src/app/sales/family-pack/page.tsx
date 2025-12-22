import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function FamilyPackSalesPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Paket Akrab</h1>
            <p className="text-sm text-muted-foreground">Proses transaksi baru untuk Paket Akrab.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Transaksi Paket Akrab</CardTitle>
            <CardDescription>Proses penjualan khusus untuk Paket Akrab.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Formulir pemrosesan penjualan Paket Akrab akan ada di sini.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
