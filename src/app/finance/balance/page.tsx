'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, onValue, serverTimestamp, runTransaction } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, Landmark, CreditCard, PlusCircle, Loader2, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah, cleanRupiah } from '@/lib/utils';


interface FinancialCard {
  id: string;
  name: string;
  balance: number;
  createdAt: number;
  icon: string;
  isDeleted?: boolean;
}

interface Payment {
  method: string;
  cardId?: string;
  amount: number;
  debtorName?: string;
}

interface Transaction {
  id: string;
  datetime: string;
  productName?: string;
  customerName?: string;
  sellingPrice: number;
  costPrice?: number;
  fundSourceId?: string;
  fundSources?: any[];
  payments?: Payment[];
  type: 'income' | 'expense';
  amount: number;
  description: string;
  isDeleted?: boolean;
  date?: string;
  nominal?: number;
  name?: string;
  fundSourceName?: string;
}


const iconMap: { [key: string]: React.ElementType } = {
  Wallet,
  Landmark,
  CreditCard,
  DollarSign,
};

const getIconForCard = (cardName: string) => {
    if (typeof cardName !== 'string') {
        return 'DollarSign';
    }
    const lowerCaseName = cardName.toLowerCase();
    if (lowerCaseName.includes('bank')) return 'Landmark';
    if (lowerCaseName.includes('cash') || lowerCaseName.includes('tunai')) return 'Wallet';
    if (lowerCaseName.includes('credit') || lowerCaseName.includes('kredit')) return 'CreditCard';
    return 'DollarSign';
}


export default function BalancePage() {
    const { toast } = useToast();
    const [cards, setCards] = useState<FinancialCard[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [selectedCard, setSelectedCard] = useState<FinancialCard | null>(null);
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCardName, setNewCardName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const cardsRef = ref(db, 'keuangan/cards');
        const unsubscribeCards = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            const activeCards = Object.entries(data || {})
                .map(([key, value]: [string, any]) => ({ id: key, ...value }))
                .filter((card: any) => card.isDeleted !== true);

            if (activeCards.length === 0) {
                setCards([]);
            } else {
                 const loadedCards = activeCards.map((card: any) => ({
                    ...card,
                    icon: getIconForCard(card.name),
                })).sort((a, b) => a.createdAt - b.createdAt);
                setCards(loadedCards);
            }
        });

        const regularTrxRef = ref(db, 'transaksi_reguler');
        const unsubscribeRegular = onValue(regularTrxRef, (snapshot) => {
            const data = snapshot.val() || {};
            setAllTransactions(prev => [
                ...prev.filter(t => !t.id.startsWith('reg-')), 
                ...Object.entries(data).map(([key, value]: [string, any]) => ({...value, id: `reg-${key}`}))
            ]);
        });
        
        const akrabTrxRef = ref(db, 'transaksi_akrab');
        const unsubscribeAkrab = onValue(akrabTrxRef, (snapshot) => {
            const data = snapshot.val() || {};
            setAllTransactions(prev => [
                ...prev.filter(t => !t.id.startsWith('akrab-')), 
                ...Object.entries(data).map(([key, value]: [string, any]) => ({...value, id: `akrab-${key}`}))
            ]);
        });
        
        const expensesRef = ref(db, 'pengeluaran');
        const unsubscribeExpenses = onValue(expensesRef, (snapshot) => {
            const data = snapshot.val() || {};
             setAllTransactions(prev => [
                ...prev.filter(t => !t.id.startsWith('exp-')), 
                ...Object.entries(data).map(([key, value]: [string, any]) => ({...value, id: `exp-${key}`}))
            ]);
        });


        return () => {
            unsubscribeCards();
            unsubscribeRegular();
            unsubscribeAkrab();
            unsubscribeExpenses();
        };
    }, []);

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCardName.trim()) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Nama akun tidak boleh kosong.",
            });
            return;
        }
        setIsSubmitting(true);

        const balance = initialBalance === '' ? 0 : cleanRupiah(initialBalance);

        const newCard = {
            name: newCardName,
            balance: balance,
            createdAt: serverTimestamp(),
            icon: getIconForCard(newCardName)
        };

        const cardsRef = ref(db, 'keuangan/cards');
        push(cardsRef, newCard)
            .then(() => {
                toast({
                    title: "Sukses",
                    description: `Akun '${newCardName}' berhasil ditambahkan.`,
                });
                setIsModalOpen(false);
                setNewCardName('');
                setInitialBalance('');
            })
            .catch((error) => {
                toast({
                    variant: "destructive",
                    title: "Gagal",
                    description: `Terjadi kesalahan: ${error.message}`,
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };
    
    const handleCardClick = (card: FinancialCard) => {
        setSelectedCard(card);
        setIsHistorySheetOpen(true);
    };

    const filteredTransactions = useMemo(() => {
        if (!selectedCard) return [];
        
        const activeTransactions = allTransactions.filter(trx => trx.isDeleted !== true);
        const relatedTransactions: Transaction[] = [];

        activeTransactions.forEach(trx => {
            const datetime = trx.datetime || trx.date;
            if (!datetime) return;
            
            // Expenses (money out)
            if (trx.id.startsWith('exp-') && trx.fundSourceId === selectedCard.id) {
                relatedTransactions.push({
                    ...trx,
                    datetime,
                    type: 'expense',
                    amount: trx.nominal || 0,
                    description: trx.name || 'Pengeluaran'
                });
            }

            // Regular Transaction (money out from cost, money in from payment)
            if (trx.id.startsWith('reg-')) {
                 if (trx.fundSourceId === selectedCard.id && trx.costPrice && trx.costPrice > 0) {
                    relatedTransactions.push({
                        ...trx,
                        datetime,
                        type: 'expense',
                        amount: trx.costPrice,
                        description: `Modal untuk ${trx.productName}`
                    });
                }
                 trx.payments?.forEach(payment => {
                    if (payment.cardId === selectedCard.id) {
                        relatedTransactions.push({
                           ...trx,
                           datetime,
                           type: 'income',
                           amount: payment.amount,
                           description: `Pembayaran untuk ${trx.productName}`
                       });
                    }
                });
            }
            
            // Akrab Transaction (money out from fund sources, money in from payment)
            if (trx.id.startsWith('akrab-')) {
                trx.fundSources?.forEach(source => {
                    if (source.cardId === selectedCard.id && source.amount > 0) {
                        relatedTransactions.push({
                            ...trx,
                            datetime,
                            type: 'expense',
                            amount: source.amount,
                            description: `Modal untuk ${trx.customerName}`
                        });
                    }
                });
                trx.payments?.forEach(payment => {
                    if (payment.cardId === selectedCard.id) {
                        relatedTransactions.push({
                           ...trx,
                           datetime,
                           type: 'income',
                           amount: payment.amount,
                           description: `Pembayaran untuk ${trx.customerName}`
                       });
                    }
                });
            }
        });

        return relatedTransactions.sort((a, b) => parseISO(b.datetime).getTime() - parseISO(a.datetime).getTime());

    }, [selectedCard, allTransactions]);

    const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const cleanedValue = value.replace(/[^0-9]/g, '');
        setInitialBalance(formatRupiah(cleanedValue));
    };

    return (
        <div className="flex flex-col w-full min-h-[100dvh] bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Saldo Akun</h1>
                        <p className="text-sm text-muted-foreground truncate whitespace-nowrap">Kelola semua sumber saldo dan akun keuangan Anda.</p>
                    </div>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="transition-all duration-300 hover:scale-105 text-sm shrink-0 md:w-auto w-full max-w-[150px] md:max-w-none">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Akun
                </Button>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cards.map((card, index) => {
                        const Icon = iconMap[card.icon] || DollarSign;
                        return (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                onClick={() => handleCardClick(card)}
                            >
                                <Card className="rounded-2xl shadow-sm border-white/20 bg-white/30 backdrop-blur-lg hover:shadow-lg transition-all duration-300 dark:bg-slate-800/30 dark:border-slate-700/50 cursor-pointer hover:scale-[1.02]">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-foreground/80">
                                            {card.name}
                                        </CardTitle>
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold tracking-tight">
                                            {formatRupiah(card.balance || 0)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Saldo saat ini
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
                {cards.length === 0 && (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                        <p className="text-muted-foreground text-sm text-center">Belum ada akun keuangan. Silakan tambahkan.</p>
                    </div>
                )}
            </main>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleAddCard}>
                        <DialogHeader>
                            <DialogTitle>Tambah Akun Keuangan</DialogTitle>
                            <DialogDescription>
                                Buat akun baru untuk melacak saldo. Klik simpan jika sudah selesai.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="card-name">Nama Akun</Label>
                                <Input
                                    id="card-name"
                                    value={newCardName}
                                    onChange={(e) => setNewCardName(e.target.value)}
                                    placeholder="Contoh: Bank BCA, Dompet Digital"
                                    className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="initial-balance">Saldo Awal</Label>
                                <Input
                                    id="initial-balance"
                                    type="text"
                                    value={initialBalance}
                                    onChange={handleBalanceChange}
                                    placeholder="0 (Opsional)"
                                    className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Batal</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
                <SheetContent className="w-full sm:max-w-lg">
                    <SheetHeader className="pr-10">
                        <SheetTitle>Riwayat Transaksi: {selectedCard?.name}</SheetTitle>
                        <SheetDescription>
                            Daftar semua transaksi yang terkait dengan akun ini.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 h-[calc(100%-4rem)] overflow-y-auto pr-2">
                        {filteredTransactions.length > 0 ? (
                             <ul className="space-y-3">
                                {filteredTransactions.map((trx, index) => (
                                    <motion.li 
                                        key={`${trx.id}-${index}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50"
                                    >
                                        {trx.type === 'income' ? 
                                            <ArrowUpCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" /> :
                                            <ArrowDownCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                        }
                                        <div className="flex-1">
                                            <p className="text-sm font-medium leading-tight">{trx.description}</p>
                                            <p className="text-xs text-muted-foreground">{format(parseISO(trx.datetime), "d MMM yyyy, HH:mm", { locale: id })}</p>
                                        </div>
                                        <div className={`text-sm font-bold whitespace-nowrap ${trx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {trx.type === 'income' ? '+' : '-'} {formatRupiah(trx.amount)}
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold">Belum Ada Transaksi</h3>
                                <p className="text-sm text-muted-foreground">Tidak ada riwayat transaksi yang ditemukan untuk akun ini.</p>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
