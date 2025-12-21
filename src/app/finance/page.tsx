import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function FinancePage() {
  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Keuangan</h1>
            <p className="text-sm text-muted-foreground">Laporan keuangan, laba/rugi, dan saldo.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Dasbor Keuangan</CardTitle>
            <CardDescription>Ringkasan laba/rugi, dan saldo.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Grafik dan laporan keuangan akan ada di sini.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
