'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { ref, onValue, update, get, serverTimestamp } from 'firebase/database';
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info, ArrowLeft, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';

// Interfaces copied from hutang/page.tsx
interface Debt {
  id: string;
  nama: string;
  nominal: number;
  tanggal: string;
  status: 'Belum Lunas' | 'Lunas';
  transactionId?: string;
  sourcePath?: 'transaksi_reguler' | 'transaksi_akrab';
  tanggal_pelunasan?: string;
  isDeleted?: boolean;
}

interface FinancialCard {
    id: string;
    name: string;
    isDeleted?: boolean;
}

function SelectedDebtsPageComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [allDebts, setAllDebts] = useState<Debt[]>([]);
    const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedIds = useMemo(() => {
        const ids = searchParams.get('ids');
        if (!ids) {
            if (typeof window !== 'undefined') {
                router.push('/hutang');
            }
            return [];
        }
        return ids ? ids.split(',') : [];
    }, [searchParams, router]);

    useEffect(() => {
        const debtsRef = ref(db, 'hutang');
        const unsubscribeDebts = onValue(debtsRef, (snapshot) => {
            const data = snapshot.val();
            const activeDebts = Object.entries(data || {})
                .map(([key, value]: [string, any]) => ({ id: key, ...value }))
                .filter((debt: any) => debt.isDeleted !== true);
            setAllDebts(activeDebts);
            setIsLoadingData(false);
        });

        const cardsRef = ref(db, 'keuangan/cards');
        const unsubscribeCards = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            const activeCards = Object.entries(data || {})
                .map(([key, value]: [string, any]) => ({ id: key, ...value }))
                .filter((card: any) => card.isDeleted !== true);
            setFinancialCards(activeCards);
        });

        return () => {
            unsubscribeDebts();
            unsubscribeCards();
        };
    }, []);

    const selectedDebts = useMemo(() => {
        if (isLoadingData) return [];
        return allDebts.filter(debt => selectedIds.includes(debt.id));
    }, [allDebts, selectedIds, isLoadingData]);
    
    const selectedTotal = useMemo(() => {
        return selectedDebts.reduce((total, debt) => total + debt.nominal, 0);
    }, [selectedDebts]);

    const handleBulkPay = async () => {
        if (selectedDebts.length === 0 || !paymentMethod) {
            toast({ variant: "destructive", title: "Gagal", description: "Pilih metode pembayaran." });
            return;
        }
        setIsSubmitting(true);
        try {
            const updates: { [key: string]: any } = {};
            const settlementDate = new Date().toISOString();
            const paymentCard = financialCards.find(card => card.id === paymentMethod);
            if (!paymentCard) throw new Error("Metode pembayaran tidak valid.");

            for (const debt of selectedDebts) {
                updates[`/hutang/${debt.id}/status`] = 'Lunas';
                updates[`/hutang/${debt.id}/tanggal_pelunasan`] = settlementDate;
                if (debt.transactionId && debt.sourcePath) {
                    const trxRef = ref(db, `${debt.sourcePath}/${debt.transactionId}`);
                    const trxSnapshot = await get(trxRef);
                    if (trxSnapshot.exists()) {
                        const trxData = trxSnapshot.val();
                        const paymentIndex = trxData.payments?.findIndex((p: any) => p.method === 'Hutang' && p.debtorName === debt.nama);
                        if (paymentIndex !== -1) {
                            updates[`${debt.sourcePath}/${debt.transactionId}/payments/${paymentIndex}/method`] = paymentCard.name;
                            updates[`${debt.sourcePath}/${debt.transactionId}/payments/${paymentIndex}/cardId`] = paymentCard.id;
                            updates[`${debt.sourcePath}/${debt.transactionId}/payments/${paymentIndex}/debtorName`] = null;
                        }
                    }
                }
            }
            await update(ref(db), updates);
            toast({ title: "Sukses", description: `${selectedDebts.length} hutang berhasil dilunasi.` });
            router.push('/hutang');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
            setPaymentMethod('');
        }
    };
    
    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isLoadingData && selectedDebts.length === 0) {
        return (
             <div className="flex flex-col w-full min-h-screen bg-background">
                <AppHeader title="Daftar Hutang Terpilih">
                    <Button variant="outline" size="sm" onClick={() => router.push('/hutang')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                </AppHeader>
                <main className="flex flex-1 flex-col p-4 md:p-6">
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                         <div className="text-center">
                            <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">Tidak Ada Data Terpilih</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Kembali ke halaman hutang untuk memilih data.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
         <div className="flex flex-col w-full min-h-screen bg-background">
            <AppHeader title="Daftar Hutang Terpilih">
                <Button variant="outline" size="sm" onClick={() => router.push('/hutang')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </AppHeader>
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Ringkasan Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Total Hutang dari {selectedDebts.length} item terpilih:</p>
                        <p className="text-3xl font-bold tracking-tight">{formatRupiah(selectedTotal)}</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
                            <Wallet className="mr-2 h-4 w-4" /> Lunasi Semua
                        </Button>
                    </CardFooter>
                 </Card>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {selectedDebts.map((debt) => (
                        <Card key={debt.id} className="rounded-xl shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">{debt.nama}</CardTitle>
                                <CardDescription>{format(parseISO(debt.tanggal), "d MMMM yyyy, HH:mm", { locale: id })}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold tracking-tight">{formatRupiah(debt.nominal)}</p>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
             </main>
             
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pelunasan Hutang Massal</DialogTitle>
                        <DialogDescription>
                           Anda akan melunasi <strong>{selectedDebts.length} hutang</strong> dengan total <strong>{formatRupiah(selectedTotal)}</strong>. Pilih akun penerima pembayaran.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bulk-payment-method">Pindahkan ke Akun</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger id="bulk-payment-method">
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
                        <Button onClick={handleBulkPay} disabled={isSubmitting || !paymentMethod}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Konfirmasi Lunas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
         </div>
    );
}

export default function SelectedDebtsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SelectedDebtsPageComponent />
        </Suspense>
    );
}
