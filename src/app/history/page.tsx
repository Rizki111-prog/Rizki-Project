'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Info } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';

interface Transaction {
  id: string;
  datetime: string;
  productName?: string;
  customerName?: string;
  sellingPrice: number;
  costPrice: number;
  payments: Payment[];
  profit: number;
  isDeleted?: boolean;
  [key: string]: any; 
}

interface Payment {
  method: string;
  amount: number;
}

export default function HistoryPage() {
    const [regularTransactions, setRegularTransactions] = useState<Transaction[]>([]);
    const [akrabTransactions, setAkrabTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        const fetchData = (path: string, setData: React.Dispatch<React.SetStateAction<Transaction[]>>) => {
            const transactionsRef = ref(db, path);
            return onValue(transactionsRef, (snapshot) => {
                const data = snapshot.val();
                const loadedTransactions: Transaction[] = [];
                for (const key in data) {
                    const trxData = data[key];
                    if (trxData.isDeleted) continue;
                    
                    const sellingPrice = trxData.sellingPrice || 0;
                    const costPrice = path === 'transaksi_akrab' 
                        ? (trxData.fundSources || []).reduce((acc: number, src: { amount: number }) => acc + src.amount, 0)
                        : (trxData.costPrice || 0);
                    
                    loadedTransactions.push({ 
                        id: key, 
                        ...trxData, 
                        profit: sellingPrice - costPrice
                    });
                }
                loadedTransactions.sort((a, b) => parseISO(b.datetime).getTime() - parseISO(a.datetime).getTime());
                setData(loadedTransactions);
                setIsLoading(false);
            }, (error) => {
                console.error(`Error fetching from ${path}:`, error);
                setIsLoading(false);
            });
        };

        const unsubscribeRegular = fetchData('transaksi_reguler', setRegularTransactions);
        const unsubscribeAkrab = fetchData('transaksi_akrab', setAkrabTransactions);

        return () => {
            unsubscribeRegular();
            unsubscribeAkrab();
        };
    }, []);
    
    const filterAndSearch = (transactions: Transaction[]) => {
        return transactions.filter(trx => {
            const isDateMatch = selectedDate 
                ? format(parseISO(trx.datetime), 'yyyy-MM-dd') === selectedDate
                : true;

            const searchableName = trx.productName || trx.customerName || '';
            const isSearchMatch = searchTerm 
                ? searchableName.toLowerCase().includes(searchTerm.toLowerCase())
                : true;
            
            return isDateMatch && isSearchMatch;
        });
    };

    const filteredRegular = useMemo(() => filterAndSearch(regularTransactions), [regularTransactions, searchTerm, selectedDate]);
    const filteredAkrab = useMemo(() => filterAndSearch(akrabTransactions), [akrabTransactions, searchTerm, selectedDate]);

    const getPaymentMethodsString = (payments: Payment[] | undefined) => {
        if (!payments || payments.length === 0) return 'N/A';
        return payments.map(p => `${p.method}: ${formatRupiah(p.amount)}`).join(', ');
    };

    const renderTransactionList = (transactions: Transaction[], type: 'regular' | 'akrab') => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (transactions.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl text-center p-4">
                    <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">Tidak Ada Transaksi</h3>
                    <p className="text-sm text-muted-foreground">Tidak ada riwayat transaksi yang cocok dengan filter Anda.</p>
                </div>
            );
        }
        
        const nameLabel = type === 'regular' ? 'Produk' : 'Pelanggan';

        return (
            <>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                    {transactions.map((trx) => (
                        <Card key={trx.id} className="rounded-lg border">
                            <CardHeader className="pb-3">
                               <div className="flex justify-between items-start">
                                 <div>
                                    <CardTitle className="text-base font-bold">{trx.productName || trx.customerName}</CardTitle>
                                    <CardDescription>{format(parseISO(trx.datetime), "d MMM yyyy, HH:mm", { locale: id })}</CardDescription>
                                 </div>
                                 <Badge variant={trx.profit > 0 ? 'secondary' : 'destructive'} className="capitalize text-xs">
                                    Laba: {formatRupiah(trx.profit)}
                                 </Badge>
                               </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2 pb-4">
                               <div className="flex justify-between">
                                 <span className="text-muted-foreground">Harga Jual:</span>
                                 <span className="font-semibold">{formatRupiah(trx.sellingPrice)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-muted-foreground">Pembayaran:</span>
                                 <span className="font-semibold text-right">{getPaymentMethodsString(trx.payments)}</span>
                               </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Waktu</th>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">{nameLabel}</th>
                                <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Harga Jual</th>
                                <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Laba</th>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Metode Pembayaran</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {transactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.productName || trx.customerName}</td>
                                    <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">{formatRupiah(trx.sellingPrice)}</td>
                                    <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                                        <Badge variant={trx.profit >= 0 ? 'secondary' : 'destructive'} className="font-semibold">{formatRupiah(trx.profit)}</Badge>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-muted-foreground">{getPaymentMethodsString(trx.payments)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };


    return (
        <div className="flex flex-col w-full min-h-screen bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
                <SidebarTrigger className="md:hidden" />
                <div className='min-w-0 flex-1'>
                    <h1 className="text-lg font-semibold md:text-2xl truncate whitespace-nowrap">Riwayat Transaksi</h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
                <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Filter Transaksi</CardTitle>
                        <div className="flex flex-col md:flex-row gap-2 mt-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari berdasarkan nama produk/pelanggan..."
                                    className="pl-8 sm:w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full md:w-auto"
                            />
                             {selectedDate && (
                                <Button variant="ghost" onClick={() => setSelectedDate('')}>
                                    Hapus Filter
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="regular" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="regular">Reguler</TabsTrigger>
                                <TabsTrigger value="akrab">Paket Akrab</TabsTrigger>
                            </TabsList>
                            <TabsContent value="regular" className="mt-4">
                                {renderTransactionList(filteredRegular, 'regular')}
                            </TabsContent>
                            <TabsContent value="akrab" className="mt-4">
                                {renderTransactionList(filteredAkrab, 'akrab')}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
