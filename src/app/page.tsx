import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Penjualan</h1>
            <p className="text-sm text-muted-foreground">Proses transaksi baru.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Baru</CardTitle>
            <CardDescription>Proses penjualan baru untuk Pulsa, Token, dll.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Formulir pemrosesan penjualan akan ada di sini.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
