import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ExpensesPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Pengeluaran</h1>
            <p className="text-sm text-muted-foreground">Catat dan kelola biaya operasional.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Catat Pengeluaran</CardTitle>
            <CardDescription>Catat biaya operasional baru.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Formulir pencatatan pengeluaran akan ada di sini.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
