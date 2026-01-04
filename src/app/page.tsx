
'use client';

import {
  Activity,
  ArrowUpRight,
  CircleUser,
  CreditCard,
  DollarSign,
  Menu,
  Package2,
  Search,
  Users,
  LineChart,
  ArrowDownUp,
  PlusCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { useMemo } from 'react';

const salesData = [
  { date: '2024-05-20', sales: 231400 },
  { date: '2024-05-21', sales: 342500 },
  { date: '2024-05-22', sales: 287900, average: 300000 },
  { date: '2024-05-23', sales: 410200 },
  { date: '2024-05-24', sales: 380100 },
  { date: '2024-05-25', sales: 450500 },
  { date: '2024-05-26', sales: 423400 },
];

const salesComposition = [
  { name: 'Pulsa', value: 400, fill: 'var(--color-pulsa)' },
  { name: 'Paket Data', value: 300, fill: 'var(--color-data)' },
  { name: 'Token Listrik', value: 200, fill: 'var(--color-token)' },
  { name: 'Lainnya', value: 100, fill: 'var(--color-lainnya)' },
];

const chartConfig = {
  sales: {
    label: 'Penjualan',
  },
  pulsa: {
    label: 'Pulsa',
    color: 'hsl(var(--chart-1))',
  },
  data: {
    label: 'Paket Data',
    color: 'hsl(var(--chart-2))',
  },
  token: {
    label: 'Token Listrik',
    color: 'hsl(var(--chart-3))',
  },
  lainnya: {
    label: 'Lainnya',
    color: 'hsl(var(--chart-4))',
  },
};

const recentTransactions = [
    { name: "Telkomsel 5rb", status: "Berhasil", date: "26 Mei 2024, 10:42", amount: 7000 },
    { name: "Listrik 20rb", status: "Berhasil", date: "26 Mei 2024, 09:15", amount: 22000 },
    { name: "Paket Akrab", status: "Berhasil", date: "25 Mei 2024, 21:30", amount: 67000 },
    { name: "Bayar Hutang", status: "Lunas", date: "25 Mei 2024, 18:05", amount: 50000 },
    { name: "Indosat 10rb", status: "Gagal", date: "25 Mei 2024, 15:22", amount: 12000 },
];

export default function HomePage() {
  const totalSales = useMemo(() => salesData.reduce((acc, curr) => acc + curr.sales, 0), []);
  const totalProfit = useMemo(() => totalSales * 0.15, [totalSales]); // Placeholder profit calculation

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50/50 dark:bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">
              Dasbor
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="transition-all duration-300 hover:scale-105">
                <Link href="/sales/regular">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Transaksi
                </Link>
            </Button>
             <Button asChild size="sm" className="transition-all duration-300 hover:scale-105">
                <Link href="/expenses">
                    <ArrowDownUp className="mr-2 h-4 w-4" /> Catat Pengeluaran
                </Link>
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Penjualan (Bulan Ini)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(totalSales)}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% dari bulan lalu
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Laba (Bulan Ini)
              </CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(totalProfit)}</div>
              <p className="text-xs text-muted-foreground">
                +180.1% dari bulan lalu
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hutang Aktif</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(125000)}</div>
              <p className="text-xs text-muted-foreground">3 catatan belum lunas</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pengeluaran (Bulan Ini)
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(450000)}</div>
              <p className="text-xs text-muted-foreground">
                -15% dari bulan lalu
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <Card className="col-span-1 rounded-2xl shadow-sm lg:col-span-4">
            <CardHeader>
              <CardTitle>Tren Penjualan</CardTitle>
              <CardDescription>7 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={<ChartTooltipContent formatter={(value) => formatRupiah(value as number)} />}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <ReferenceLine y={300000} label="Rata-rata" stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="col-span-1 rounded-2xl shadow-sm lg:col-span-3">
            <CardHeader>
              <CardTitle>Komposisi Penjualan</CardTitle>
              <CardDescription>Bulan ini</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={salesComposition}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor="middle" dominantBaseline="central">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {salesComposition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Transaksi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((trx, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <div className="font-medium">{trx.name}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={trx.status === "Gagal" ? "destructive" : "secondary"}>
                                {trx.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{trx.date}</TableCell>
                        <TableCell className="text-right">{formatRupiah(trx.amount)}</TableCell>
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
