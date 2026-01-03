'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { formatRupiah } from '@/lib/utils';
import { Loader2 } from "lucide-react";

interface Transaction {
  id: string;
  isDeleted?: boolean;
  costPrice?: number;
  payments?: { amount: number; cardId?: string }[];
  fundSources?: { amount: number; cardId: string }[];
  nominal?: number;
  fundSourceId?: string;
  type?: 'income' | 'expense';
}

export default function FinanceDashboardPage() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = (path: string, prefix: string) => onValue(ref(db, path), (snapshot) => {
        const data = snapshot.val() || {};
        const activeData = Object.values(data).filter((item: any) => item.isDeleted !== true);

        setAllTransactions(prev => [
            ...prev.filter(t => !t.id.startsWith(prefix)), 
            ...Object.entries(data).map(([key, value]: [string, any]) => ({...value, id: `${prefix}${key}`}))
        ]);
        setIsLoading(false);
    });

    const unsubscribeRegular = fetchData('transaksi_reguler', 'reg-');
    const unsubscribeAkrab = fetchData('transaksi_akrab', 'akrab-');
    const unsubscribeExpenses = fetchData('pengeluaran', 'exp-');
    const unsubscribeIncomes = fetchData('pemasukan', 'inc-');
    const unsubscribeCards = onValue(ref(db, 'keuangan/cards'), () => {
      // This is just to trigger re-calculation when cards change.
    });

    return () => {
      unsubscribeRegular();
      unsubscribeAkrab();
      unsubscribeExpenses();
      unsubscribeIncomes();
      unsubscribeCards();
    };
  }, []);

  useEffect(() => {
    const activeTransactions = allTransactions.filter(trx => trx.isDeleted !== true);

    if(activeTransactions.length === 0) {
      setTotalBalance(0);
      return;
    }

    const currentTotal = activeTransactions.reduce((acc: number, trx: Transaction) => {
        let balanceChange = 0;
        
        // Income from payments (Regular & Akrab)
        if (trx.payments) {
            balanceChange += trx.payments.reduce((paymentAcc, p) => paymentAcc + (p.cardId ? p.amount : 0), 0);
        }

        // Specific Incomes
        if (trx.id.startsWith('inc-') && trx.nominal) {
            balanceChange += trx.nominal;
        }

        // Expense from product cost (Regular)
        if (trx.id.startsWith('reg-') && trx.costPrice) {
            balanceChange -= trx.costPrice;
        }

        // Expense from Akrab fund sources
        if (trx.id.startsWith('akrab-') && trx.fundSources) {
            balanceChange -= trx.fundSources.reduce((fsAcc, fs) => fsAcc + fs.amount, 0);
        }
        
        // General expenses from 'pengeluaran'
        if (trx.id.startsWith('exp-') && trx.nominal) {
            balanceChange -= trx.nominal;
        }

        return acc + balanceChange;
    }, 0);
    
    setTotalBalance(currentTotal);

  }, [allTransactions]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Dashboard Keuangan</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Saldo Gabungan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-10 flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="text-2xl font-bold">{formatRupiah(totalBalance)}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Dari semua akun keuangan yang aktif
                </p>
              </CardContent>
            </Card>
        </div>
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
