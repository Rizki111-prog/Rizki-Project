'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, onValue, update, runTransaction, get } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';


interface Debt {
  id: string;
  nama: string;
  nominal: number;
  tanggal: string;
  status: 'Belum Lunas' | 'Lunas';
  transactionId: string;
  tanggal_pelunasan?: string;
}

interface FinancialCard {
    id: string;
    name: string;
    balance: number;
}

export default function HutangPage() {
    const { toast } = useToast();
    const [allDebts, setAllDebts] = useState<Debt[]>([]);
    const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const debtsRef = ref(db, 'hutang');
        const unsubscribeDebts = onValue(debtsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedDebts: Debt[] = [];
            for (const key in data) {
                loadedDebts.push({ id: key, ...data[key] });
            }
            setAllDebts(loadedDebts);
            setIsLoadingData(false);
        });

        const cardsRef = ref(db, 'keuangan/cards');
        const unsubscribeCards = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedCards: FinancialCard[] = [];
            for (const key in data) {
                loadedCards.push({ id: key, ...data[key] });
            }
            setFinancialCards(loadedCards);
        });

        return () => {
            unsubscribeDebts();
            unsubscribeCards();
        };
    }, []);

    const activeDebts = useMemo(() => {
        return allDebts
            .filter(debt => debt.status === 'Belum Lunas')
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [allDebts]);

    const handleMarkAsPaidClick = (debt: Debt) => {
        setSelectedDebt(debt);
        setIsModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedDebt || !paymentMethod) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Silakan pilih metode pembayaran.",
            });
            return;
        }
        setIsSubmitting(true);

        try {
            const settlementDate = new Date().toISOString();
            const paymentCard = financialCards.find(card => card.id === paymentMethod);
            if (!paymentCard) {
                throw new Error("Metode pembayaran tidak valid.");
            }

            // 1. Get the original transaction
            const transactionRef = ref(db, `transaksi_reguler/${selectedDebt.transactionId}`);
            const transactionSnapshot = await get(transactionRef);
            if (!transactionSnapshot.exists()) {
                throw new Error("Transaksi asli tidak ditemukan.");
            }
            const transactionData = transactionSnapshot.val();
            const paymentIndex = transactionData.payments.findIndex((p: any) => p.method === 'Hutang' && p.debtorName === selectedDebt.nama);

            if (paymentIndex === -1) {
                throw new Error("Pembayaran hutang tidak ditemukan di transaksi asli.");
            }
            
            // 2. Prepare multi-path update
            const updates: { [key: string]: any } = {};

            // Update for /hutang/{debtId}
            updates[`/hutang/${selectedDebt.id}/status`] = 'Lunas';
            updates[`/hutang/${selectedDebt.id}/tanggal_pelunasan`] = settlementDate;
            
            // Update for original transaction in /transaksi_reguler/{transactionId}
            updates[`/transaksi_reguler/${selectedDebt.transactionId}/payments/${paymentIndex}/method`] = paymentCard.name;
            updates[`/transaksi_reguler/${selectedDebt.transactionId}/payments/${paymentIndex}/cardId`] = paymentCard.id;
            updates[`/transaksi_reguler/${selectedDebt.transactionId}/tanggal_pelunasan`] = settlementDate;


            // 3. Execute the multi-path update
            await update(ref(db), updates);

            // 4. Update the balance of the payment card
            const paymentCardRef = ref(db, `keuangan/cards/${paymentMethod}`);
            await runTransaction(paymentCardRef, (card) => {
                if (card) {
                    card.balance += selectedDebt.nominal;
                }
                return card;
            });
            
            toast({
                title: "Sukses",
                description: `Hutang lunas dan metode pembayaran transaksi telah diperbarui.`,
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: `Terjadi kesalahan: ${error.message}`,
            });
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
            setSelectedDebt(null);
            setPaymentMethod('');
        }
    };


    return (
        <div className="flex flex-col w-full min-h-screen bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
                <SidebarTrigger className="md:hidden" />
                <div>
                    <h1 className="text-xl font-semibold md:text-2xl">Manajemen Hutang</h1>
                    <p className="text-sm text-muted-foreground">Lacak dan kelola semua catatan hutang.</p>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                 {isLoadingData ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : activeDebts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeDebts.map((debt) => (
                            <Card key={debt.id} className={`rounded-xl shadow-sm ${debt.status === 'Lunas' ? 'bg-muted/50' : ''}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className={`text-lg ${debt.status === 'Lunas' ? 'text-muted-foreground' : ''}`}>{debt.nama}</CardTitle>
                                        <Badge variant={debt.status === 'Lunas' ? 'secondary' : 'destructive'}>
                                            {debt.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>{format(parseISO(debt.tanggal), "d MMMM yyyy, HH:mm", { locale: id })}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className={`text-2xl font-bold tracking-tight ${debt.status === 'Lunas' ? 'text-muted-foreground' : ''}`}>{formatRupiah(debt.nominal)}</p>
                                    {debt.status === 'Lunas' && debt.tanggal_pelunasan && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Lunas pada: {format(parseISO(debt.tanggal_pelunasan), "d MMM yyyy", { locale: id })}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    {debt.status === 'Belum Lunas' && (
                                        <Button onClick={() => handleMarkAsPaidClick(debt)} className="w-full transition-all duration-300 hover:scale-105">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Tandai Lunas
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                         <div className="text-center">
                            <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">Tidak Ada Hutang</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Semua catatan hutang sudah lunas atau belum ada sama sekali.</p>
                        </div>
                    </div>
                )}
            </main>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pelunasan Hutang</DialogTitle>
                        <DialogDescription>
                            Pilih metode pembayaran untuk melunasi hutang an. <strong>{selectedDebt?.nama}</strong> sebesar <strong>{formatRupiah(selectedDebt?.nominal || 0)}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="payment-method">Metode Pembayaran Pelunasan</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger id="payment-method">
                                    <SelectValue placeholder="Pilih akun penerima" />
                                </SelectTrigger>
                                <SelectContent>
                                    {financialCards.map(card => (
                                        <SelectItem key={card.id} value={card.id}>
                                            {card.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Batal</Button>
                        </DialogClose>
                        <Button onClick={handleConfirmPayment} disabled={isSubmitting || !paymentMethod}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Konfirmasi Lunas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
