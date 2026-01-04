
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Activity,
  ArrowUp,
  CreditCard,
  DollarSign,
  LineChart,
  PlusCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
import { AppHeader } from '@/components/layout/app-header';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { format, subDays, startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";


interface Transaction {
    id: string;
    datetime: string;
    productName?: string;
    customerName?: string;
    sellingPrice?: number;
    costPrice?: number;
    profit: number;
    isDeleted?: boolean;
    createdAt: number;
    type: 'Reguler' | 'Paket Akrab' | 'Pengeluaran';
    name?: string;
    nominal?: number;
    fundSources?: { amount: number }[];
}

interface Debt {
    id: string;
    nominal: number;
    status: 'Belum Lunas' | 'Lunas';
    isDeleted?: boolean;
}

interface Expense {
    id: string;
    nominal: number;
    date: string;
    isDeleted?: boolean;
    createdAt: number;
    name: string;
}

const chartConfig = {
  penjualan: { label: 'Penjualan' },
  reguler: { label: 'Reguler', color: 'hsl(var(--chart-1))' },
  akrab: { label: 'Paket Akrab', color: 'hsl(var(--chart-2))' },
};

export default function HomePage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const oneMonthAgo = subDays(now, 30).getTime();
    
    const listeners = [
      onValue(ref(db, 'transaksi_reguler'), (snapshot) => {
        const data = snapshot.val() || {};
        const transactions = Object.entries(data).map(([id, trx]: [string, any]) => ({
          ...trx,
          id,
          type: 'Reguler',
          profit: (trx.sellingPrice || 0) - (trx.costPrice || 0),
        })).filter(t => !t.isDeleted);
        setAllTransactions(prev => [...prev.filter(t => t.type !== 'Reguler'), ...transactions]);
      }),
      onValue(ref(db, 'transaksi_akrab'), (snapshot) => {
        const data = snapshot.val() || {};
        const transactions = Object.entries(data).map(([id, trx]: [string, any]) => ({
          ...trx,
          id,
          type: 'Paket Akrab',
          profit: (trx.sellingPrice || 0) - ((trx.fundSources || []).reduce((acc: number, src: any) => acc + (src.amount || 0), 0)),
        })).filter(t => !t.isDeleted);
        setAllTransactions(prev => [...prev.filter(t => t.type !== 'Paket Akrab'), ...transactions]);
      }),
      onValue(ref(db, 'pengeluaran'), (snapshot) => {
        const data = snapshot.val() || {};
        const loadedExpenses = Object.entries(data).map(([id, exp]: [string, any]) => ({ ...exp, id, type: 'Pengeluaran' })).filter(e => !e.isDeleted);
        setExpenses(loadedExpenses);
      }),
      onValue(ref(db, 'hutang'), (snapshot) => {
        const data = snapshot.val() || {};
        const loadedDebts = Object.entries(data).map(([id, debt]: [string, any]) => ({ ...debt, id })).filter(d => !d.isDeleted);
        setDebts(loadedDebts);
      })
    ];

    const timer = setTimeout(() => setIsLoading(false), 2000); // Failsafe loader

    return () => {
        listeners.forEach(unsub => unsub());
        clearTimeout(timer);
    };
  }, []);

  const summaryData = useMemo(() => {
      const now = new Date();
      const monthStart = startOfMonth(now);

      const transactionsThisMonth = allTransactions.filter(trx => 
          parseISO(trx.datetime).getTime() >= monthStart.getTime()
      );

      const totalSales = transactionsThisMonth.reduce((acc, trx) => acc + (trx.sellingPrice || 0), 0);
      const totalProfit = transactionsThisMonth.reduce((acc, trx) => acc + trx.profit, 0);
      
      const activeDebts = debts.filter(d => d.status === 'Belum Lunas');
      const totalActiveDebt = activeDebts.reduce((acc, debt) => acc + debt.nominal, 0);

      const expensesThisMonth = expenses.filter(exp => 
        isWithinInterval(parseISO(exp.date), { start: monthStart, end: now })
      );
      const totalExpenses = expensesThisMonth.reduce((acc, exp) => acc + exp.nominal, 0);

      return {
          totalSales,
          totalProfit,
          totalActiveDebt,
          activeDebtCount: activeDebts.length,
          totalExpenses
      };
  }, [allTransactions, debts, expenses]);

  const salesTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    return last7Days.map(date => {
        const salesOnDate = allTransactions
            .filter(trx => format(parseISO(trx.datetime), 'yyyy-MM-dd') === date)
            .reduce((sum, trx) => sum + (trx.sellingPrice || 0), 0);
        return { date, sales: salesOnDate };
    });
  }, [allTransactions]);

  const salesCompositionData = useMemo(() => {
    const composition = allTransactions.reduce((acc, trx) => {
        const type = trx.type === 'Reguler' ? 'reguler' : 'akrab';
        acc[type] = (acc[type] || 0) + (trx.sellingPrice || 0);
        return acc;
    }, {} as { [key: string]: number });

    return [
        { name: 'Reguler', value: composition.reguler || 0, fill: 'var(--color-reguler)' },
        { name: 'Paket Akrab', value: composition.akrab || 0, fill: 'var(--color-akrab)' },
    ].filter(item => item.value > 0);
  }, [allTransactions]);
  
  const recentActivities = useMemo(() => {
      const combined = [
          ...allTransactions.map(t => ({...t, name: t.productName || t.customerName, amount: t.sellingPrice, date: t.datetime, type: 'Penjualan' })),
          ...expenses.map(e => ({ ...e, amount: e.nominal, type: 'Pengeluaran' }))
      ];

      return combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  }, [allTransactions, expenses]);


  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50/50 dark:bg-background">
      <AppHeader title="Dasbor">
        <Link href="/sales/regular" passHref>
          <Button size="sm" className="hidden md:inline-flex">
            <PlusCircle />
            Tambah Transaksi
          </Button>
        </Link>
        <Link href="/expenses" passHref>
          <Button size="sm" variant="outline" className="hidden md:inline-flex">
            <ArrowUp />
            Catat Pengeluaran
          </Button>
        </Link>
      </AppHeader>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="w-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Penjualan (30 Hari)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatRupiah(summaryData.totalSales)}</div>}
                    {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Penjualan dalam 30 hari terakhir</p>}
                </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Laba (30 Hari)</CardTitle>
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatRupiah(summaryData.totalProfit)}</div>}
                    {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Laba dari penjualan 30 hari terakhir</p>}
                </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hutang Aktif</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatRupiah(summaryData.totalActiveDebt)}</div>}
                    {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{summaryData.activeDebtCount} catatan belum lunas</p>}
                </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pengeluaran (Bulan Ini)</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatRupiah(summaryData.totalExpenses)}</div>}
                    {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Total pengeluaran bulan ini</p>}
                </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 mt-4 md:mt-8">
                <Card className="col-span-1 rounded-2xl shadow-sm lg:col-span-4">
                <CardHeader>
                    <CardTitle>Tren Penjualan</CardTitle>
                    <CardDescription>7 hari terakhir</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart data={salesTrendData}>
                        <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent formatter={(value) => formatRupiah(value as number)} />} />
                        <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                    </ChartContainer>
                    )}
                </CardContent>
                </Card>

                <Card className="col-span-1 rounded-2xl shadow-sm lg:col-span-3">
                <CardHeader>
                    <CardTitle>Komposisi Penjualan</CardTitle>
                    <CardDescription>Berdasarkan tipe transaksi</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? <Skeleton className="h-[250px] w-full" /> : salesCompositionData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => <div><div className="font-medium">{chartConfig[name as keyof typeof chartConfig]?.label}</div><div className="text-muted-foreground">{formatRupiah(value as number)}</div></div>} />} />
                        <Pie data={salesCompositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return ( <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor="middle" dominantBaseline="central"> {`${(percent * 100).toFixed(0)}%`}</text> );
                        }}
                        >
                        {salesCompositionData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                        </Pie>
                    </PieChart>
                    </ChartContainer>
                    ) : <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">Belum ada data penjualan.</div>
                }
                </CardContent>
                </Card>
            </div>

            <Card className="rounded-2xl shadow-sm mt-4 md:mt-8">
                <CardHeader>
                <CardTitle>Aktivitas Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
                ) : (
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
                    {recentActivities.length > 0 ? recentActivities.map((trx, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <div className="font-medium">{trx.name}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={trx.type === "Pengeluaran" ? "destructive" : "secondary"}>
                                    {trx.type}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(parseISO(trx.date), 'd MMM, HH:mm', { locale: id })}</TableCell>
                            <TableCell className={`text-right font-semibold ${trx.type === 'Pengeluaran' ? 'text-destructive' : ''}`}>
                                {trx.type === 'Pengeluaran' ? '-' : ''}{formatRupiah(trx.amount || 0)}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">Belum ada aktivitas.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
