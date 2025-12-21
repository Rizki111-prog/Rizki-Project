import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function FinanceDashboardPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Dashboard Keuangan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan dan statistik keuangan Anda.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Ringkasan Keuangan</CardTitle>
            <CardDescription>Grafik dan metrik utama akan ditampilkan di sini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
              <p className="text-muted-foreground">Konten dashboard keuangan akan segera hadir.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
