'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { formatRupiah } from '@/lib/utils';
import { Loader2 } from "lucide-react";

interface FinancialCard {
  id: string;
  name: string;
  balance: number;
}

export default function FinanceDashboardPage() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cardsRef = ref(db, 'keuangan/cards');
    const unsubscribe = onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      let currentTotal = 0;
      if (data) {
        for (const key in data) {
          if(data[key] && data[key].balance) {
            currentTotal += data[key].balance;
          }
        }
      }
      setTotalBalance(currentTotal);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Dashboard Keuangan</h1>
          <p className="text-sm text-muted-foreground truncate whitespace-nowrap">Ringkasan dan statistik keuangan Anda.</p>
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
                  Dari semua akun keuangan
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
