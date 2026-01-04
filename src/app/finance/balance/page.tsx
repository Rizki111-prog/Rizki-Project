'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/firebase';
import { ref, onValue, push, serverTimestamp, update } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, Landmark, CreditCard, PlusCircle, ArrowUp, Loader2, ArrowUpCircle, ArrowDownCircle, Info, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah, cleanRupiah } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';


interface FinancialCard {
  id: string;
  name: string;
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

interface TopUpTransaction {
    id: string;
    destinationAccountId: string;
    destinationAccountName: string;
    sourceAccountId: string;
    sourceAccountName: string;
    amount: number;
    adminFee: number;
    date: string;
    description: string;
    createdAt: number | {'.sv': string};
    isDeleted?: boolean;
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

interface TopUpState {
    destinationAccountId: string;
    sourceAccountId: string;
    amount: string;
    adminFee: string;
    date: string;
    description: string;
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
    const [topUpTransactions, setTopUpTransactions] = useState<TopUpTransaction[]>([]);
    const [selectedCard, setSelectedCard] = useState<FinancialCard | null>(null);
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [newCardName, setNewCardName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const initialTopUpState: TopUpState = {
        destinationAccountId: '',
        sourceAccountId: '',
        amount: '',
        adminFee: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    };
    const [topUpState, setTopUpState] = useState<TopUpState>(initialTopUpState);
    const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
    const [editingTopUp, setEditingTopUp] = useState<TopUpTransaction | null>(null);


    const resetTopUpForm = useCallback(() => {
        setTopUpState(initialTopUpState);
        setEditingTopUp(null);
        setIsTopUpModalOpen(false);
    }, [initialTopUpState]);


    useEffect(() => {
        const cardsRef = ref(db, 'keuangan/cards');
        const unsubscribeCards = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedCards = Object.entries(data || {})
                .map(([key, value]: [string, any]) => ({ id: key, ...value }))
                .filter((card: any) => card.isDeleted !== true)
                .map((card: any) => ({
                    ...card,
                    icon: getIconForCard(card.name),
                }))
                .sort((a, b) => a.createdAt - b.createdAt);
            
            setCards(loadedCards);
            setIsLoading(cards.length > 0);
        });

        const fetchData = (path: string, prefix: string) => onValue(ref(db, path), (snapshot) => {
            const data = snapshot.val() || {};
            setAllTransactions(prev => [
                ...prev.filter(t => !t.id.startsWith(prefix)), 
                ...Object.entries(data).map(([key, value]: [string, any]) => ({...value, id: `${prefix}${key}`}))
            ]);
            setIsLoading(false);
        });

        const unsubscribeTopUps = onValue(ref(db, 'transaksi_topup'), (snapshot) => {
            const data = snapshot.val() || {};
            const loadedTopUps = Object.entries(data)
                .map(([key, value]) => ({ id: key, ...(value as Omit<TopUpTransaction, 'id'>) }))
                .filter(t => !t.isDeleted);
            setTopUpTransactions(loadedTopUps.sort((a, b) => (b.createdAt as number) - (a.createdAt as number)));
        });

        const unsubscribeRegular = fetchData('transaksi_reguler', 'reg-');
        const unsubscribeAkrab = fetchData('transaksi_akrab', 'akrab-');
        const unsubscribeExpenses = fetchData('pengeluaran', 'exp-');
        
        return () => {
            unsubscribeCards();
            unsubscribeRegular();
            unsubscribeAkrab();
            unsubscribeExpenses();
            unsubscribeTopUps();
        };
    }, []);

    const cardBalances = useMemo(() => {
        const balances: { [key: string]: number } = {};
        cards.forEach(card => { balances[card.id] = 0; });
        
        const activeTransactions = allTransactions.filter(trx => trx.isDeleted !== true);

        // Process standard transactions
        activeTransactions.forEach(trx => {
            if (trx.id.startsWith('exp-') && trx.fundSourceId && balances[trx.fundSourceId] !== undefined) {
                balances[trx.fundSourceId] -= trx.nominal || 0;
            }
            if (trx.id.startsWith('reg-')) {
                 if (trx.fundSourceId && trx.costPrice && trx.costPrice > 0 && balances[trx.fundSourceId] !== undefined) {
                    balances[trx.fundSourceId] -= trx.costPrice;
                }
                 trx.payments?.forEach(payment => {
                    if (payment.cardId && balances[payment.cardId] !== undefined) {
                        balances[payment.cardId] += payment.amount;
                    }
                });
            }
            if (trx.id.startsWith('akrab-')) {
                trx.fundSources?.forEach(source => {
                    if (source.cardId && source.amount > 0 && balances[source.cardId] !== undefined) {
                        balances[source.cardId] -= source.amount;
                    }
                });
                trx.payments?.forEach(payment => {
                    if (payment.cardId && balances[payment.cardId] !== undefined) {
                       balances[payment.cardId] += payment.amount;
                    }
                });
            }
        });

        // Process top-up transactions
        topUpTransactions.forEach(trx => {
             if (balances[trx.destinationAccountId] !== undefined) {
                balances[trx.destinationAccountId] += trx.amount;
            }
            if (balances[trx.sourceAccountId] !== undefined) {
                balances[trx.sourceAccountId] -= (trx.amount + trx.adminFee);
            }
        });

        return balances;
    }, [allTransactions, cards, topUpTransactions]);


    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCardName.trim()) {
            toast({ variant: "destructive", title: "Gagal", description: "Nama akun tidak boleh kosong." });
            return;
        }
        setIsSubmitting(true);
        const newCard = { name: newCardName, createdAt: serverTimestamp(), icon: getIconForCard(newCardName) };
        push(ref(db, 'keuangan/cards'), newCard)
            .then(() => {
                toast({ title: "Sukses", description: `Akun '${newCardName}' berhasil ditambahkan.` });
                setIsAddCardModalOpen(false);
                setNewCardName('');
            })
            .catch((error) => { toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` }); })
            .finally(() => { setIsSubmitting(false); });
    };
    
    const handleCardClick = (card: FinancialCard) => {
        setSelectedCard(card);
        setIsHistorySheetOpen(true);
    };
    
    const handleEditTopUp = (trx: TopUpTransaction) => {
        setEditingTopUp(trx);
        setTopUpState({
            destinationAccountId: trx.destinationAccountId,
            sourceAccountId: trx.sourceAccountId,
            amount: formatRupiah(trx.amount),
            adminFee: formatRupiah(trx.adminFee),
            date: trx.date,
            description: trx.description
        });
        setIsTopUpModalOpen(true);
    };

    const handleTopUpStateChange = (field: keyof TopUpState, value: string) => {
        if (field === 'amount' || field === 'adminFee') {
            setTopUpState(prev => ({...prev, [field]: formatRupiah(value)}));
        } else {
            setTopUpState(prev => ({...prev, [field]: value}));
        }
    };

    const handleTopUpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { destinationAccountId, sourceAccountId, amount, adminFee, date, description } = topUpState;

        const amountNum = cleanRupiah(amount);
        const adminFeeNum = cleanRupiah(adminFee);

        const destinationCard = cards.find(c => c.id === destinationAccountId);
        const sourceCard = cards.find(c => c.id === sourceAccountId);

        if (!destinationAccountId || !sourceAccountId || amountNum <= 0 || !destinationCard || !sourceCard) {
            toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua field yang wajib diisi." });
            return;
        }
        if(destinationAccountId === sourceAccountId) {
            toast({ variant: "destructive", title: "Gagal", description: "Akun tujuan dan sumber dana tidak boleh sama." });
            return;
        }

        setIsSubmittingTopUp(true);
        
        const topUpData: Omit<TopUpTransaction, 'id' | 'createdAt'> & {createdAt?: any} = {
            destinationAccountId,
            destinationAccountName: destinationCard.name,
            sourceAccountId,
            sourceAccountName: sourceCard.name,
            amount: amountNum,
            adminFee: adminFeeNum,
            date,
            description: description || `Top Up dari ${sourceCard.name} ke ${destinationCard.name}`,
            isDeleted: false
        };

        let promise;
        if (editingTopUp) {
            // Update existing transaction
            promise = update(ref(db, `transaksi_topup/${editingTopUp.id}`), topUpData);
        } else {
            // Create new transaction
            topUpData.createdAt = serverTimestamp();
            promise = push(ref(db, 'transaksi_topup'), topUpData);
        }

        promise.then(() => {
                toast({ title: "Sukses", description: `Top up berhasil ${editingTopUp ? 'diperbarui' : 'dicatat'}.` });
                resetTopUpForm();
            })
            .catch((error) => {
                toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
            })
            .finally(() => {
                setIsSubmittingTopUp(false);
            });
    };

    const handleDeleteTopUp = (id: string) => {
      const updates: { [key: string]: any } = {};
      updates[`/transaksi_topup/${id}/isDeleted`] = true;
      updates[`/transaksi_topup/${id}/deletedAt`] = serverTimestamp();

      update(ref(db), updates).then(() => {
          toast({ title: "Sukses", description: "Transaksi top up dipindahkan ke folder sampah." });
      }).catch((error) => {
          toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
      });
    };

    const filteredTransactions = useMemo(() => {
        if (!selectedCard) return [];
        
        const activeTransactions = allTransactions.filter(trx => trx.isDeleted !== true);
        const relatedTransactions: Transaction[] = [];

        activeTransactions.forEach(trx => {
            const trxDate = trx.datetime || trx.date;
            if (!trxDate) return;
            const datetime = typeof trxDate === 'number' ? new Date(trxDate).toISOString() : trxDate;
            
            if (trx.id.startsWith('exp-') && trx.fundSourceId === selectedCard.id) {
                relatedTransactions.push({ ...trx, datetime, type: 'expense', amount: trx.nominal || 0, description: trx.name || 'Pengeluaran', sellingPrice: 0 });
            }
            if (trx.id.startsWith('reg-')) {
                 if (trx.fundSourceId === selectedCard.id && trx.costPrice && trx.costPrice > 0) {
                    relatedTransactions.push({ ...trx, datetime, type: 'expense', amount: trx.costPrice, description: `Modal untuk ${trx.productName}`, sellingPrice: 0 });
                }
                 trx.payments?.forEach(payment => {
                    if (payment.cardId === selectedCard.id) {
                        relatedTransactions.push({ ...trx, datetime, type: 'income', amount: payment.amount, description: `Pembayaran untuk ${trx.productName}`, sellingPrice: 0 });
                    }
                });
            }
            if (trx.id.startsWith('akrab-')) {
                trx.fundSources?.forEach(source => {
                    if (source.cardId === selectedCard.id && source.amount > 0) {
                        relatedTransactions.push({ ...trx, datetime, type: 'expense', amount: source.amount, description: `Modal untuk ${trx.customerName}`, sellingPrice: 0 });
                    }
                });
                trx.payments?.forEach(payment => {
                    if (payment.cardId === selectedCard.id) {
                        relatedTransactions.push({ ...trx, datetime, type: 'income', amount: payment.amount, description: `Pembayaran untuk ${trx.customerName}`, sellingPrice: 0 });
                    }
                });
            }
        });

        // Add top-up transactions
        topUpTransactions.forEach(trx => {
            if (trx.destinationAccountId === selectedCard.id) {
                relatedTransactions.push({ id: trx.id, datetime: trx.date, type: 'income', amount: trx.amount, description: `Top Up dari ${trx.sourceAccountName}`, sellingPrice: 0 });
            }
            if (trx.sourceAccountId === selectedCard.id) {
                relatedTransactions.push({ id: trx.id, datetime: trx.date, type: 'expense', amount: trx.amount + trx.adminFee, description: `Biaya Top Up ke ${trx.destinationAccountName}`, sellingPrice: 0 });
            }
        });

        return relatedTransactions.sort((a, b) => parseISO(b.datetime).getTime() - parseISO(a.datetime).getTime());
    }, [selectedCard, allTransactions, topUpTransactions]);

    return (
        <div className="flex flex-col w-full min-h-[100dvh] bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Saldo Akun</h1>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => setIsTopUpModalOpen(true)} variant="outline" size="sm" className="md:hidden h-9 w-9 p-0">
                                    <span className="sr-only">Top Up Saldo</span>
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Top Up Saldo</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => setIsAddCardModalOpen(true)} size="sm" className="md:hidden h-9 w-9 p-0">
                                    <span className="sr-only">Tambah Akun</span>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Tambah Akun</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Button onClick={() => setIsTopUpModalOpen(true)} variant="outline" className="hidden md:inline-flex transition-all duration-300 hover:scale-105 text-sm shrink-0">
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Top Up Saldo
                    </Button>
                    <Button onClick={() => setIsAddCardModalOpen(true)} className="hidden md:inline-flex transition-all duration-300 hover:scale-105 text-sm shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Akun
                    </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                 {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                 ) : (
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
                                            {formatRupiah(cardBalances[card.id] || 0)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Saldo terhitung
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
                 )}
                {!isLoading && cards.length === 0 && (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                        <p className="text-muted-foreground text-sm text-center">Belum ada akun keuangan. Silakan tambahkan.</p>
                    </div>
                )}
                <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Riwayat Top Up Saldo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topUpTransactions.length === 0 ? (
                            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-2xl">
                                <p className="text-muted-foreground text-sm text-center">Belum ada riwayat top up.</p>
                            </div>
                        ) : (
                            <div>
                                {/* Mobile View */}
                                <div className="md:hidden space-y-4">
                                    {topUpTransactions.map((trx) => (
                                        <Card key={trx.id} className="rounded-lg">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Ke: <span className="font-semibold text-foreground">{trx.destinationAccountName}</span></p>
                                                        <p className="text-sm text-muted-foreground">Dari: <span className="font-semibold text-foreground">{trx.sourceAccountName}</span></p>
                                                    </div>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Buka menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEditTopUp(trx)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Hapus Riwayat Top Up?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan memindahkan catatan ke folder sampah dan mengembalikan saldo. Anda yakin?</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTopUp(trx.id)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <div className="border-t pt-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm">
                                                            <p className="font-bold text-lg">{formatRupiah(trx.amount)}</p>
                                                            <p className="text-xs text-muted-foreground">Biaya Admin: {formatRupiah(trx.adminFee)}</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground text-right">{format(parseISO(trx.date), "d MMM yyyy", { locale: id })}</p>
                                                    </div>
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
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tanggal</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Dari Akun</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Ke Akun</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Nominal</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Biaya Admin</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-card">
                                            {topUpTransactions.map((trx) => (
                                                <tr key={trx.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{format(parseISO(trx.date), "d MMM yyyy", { locale: id })}</td>
                                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.sourceAccountName}</td>
                                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.destinationAccountName}</td>
                                                    <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">{formatRupiah(trx.amount)}</td>
                                                    <td className="px-4 py-4 text-sm text-right text-muted-foreground whitespace-nowrap">{formatRupiah(trx.adminFee)}</td>
                                                    <td className="px-4 py-4 text-center space-x-1">
                                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditTopUp(trx)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Hapus Riwayat Top Up?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Tindakan ini akan memindahkan catatan ke folder sampah dan mengembalikan saldo. Anda yakin?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteTopUp(trx.id)}>Ya, Hapus</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Add Card Modal */}
            <Dialog open={isAddCardModalOpen} onOpenChange={setIsAddCardModalOpen}>
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

            {/* Top Up Modal */}
             <Dialog open={isTopUpModalOpen} onOpenChange={(isOpen) => { if (!isOpen) resetTopUpForm(); else setIsTopUpModalOpen(true); }}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleTopUpSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingTopUp ? 'Edit Top Up Saldo' : 'Top Up Saldo'}</DialogTitle>
                            <DialogDescription>
                                Catat transaksi penambahan saldo antar akun.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="space-y-2">
                                <Label htmlFor="topup-destination">Akun Tujuan (Yang di Top Up)</Label>
                                <Select value={topUpState.destinationAccountId} onValueChange={(value) => handleTopUpStateChange('destinationAccountId', value)} required>
                                    <SelectTrigger id="topup-destination"><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                                    <SelectContent>{cards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="topup-amount">Nominal Top Up</Label>
                                <Input id="topup-amount" value={topUpState.amount} onChange={(e) => handleTopUpStateChange('amount', e.target.value)} placeholder="0" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topup-admin">Biaya Admin</Label>
                                <Input id="topup-admin" value={topUpState.adminFee} onChange={(e) => handleTopUpStateChange('adminFee', e.target.value)} placeholder="0 (Opsional)" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topup-source">Sumber Dana (Yang Membayar)</Label>
                                <Select value={topUpState.sourceAccountId} onValueChange={(value) => handleTopUpStateChange('sourceAccountId', value)} required>
                                    <SelectTrigger id="topup-source"><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                                    <SelectContent>{cards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topup-date">Tanggal Transaksi</Label>
                                <Input id="topup-date" type="date" value={topUpState.date} onChange={(e) => handleTopUpStateChange('date', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topup-description">Keterangan</Label>
                                <Textarea id="topup-description" value={topUpState.description} onChange={(e) => handleTopUpStateChange('description', e.target.value)} placeholder="Catatan tambahan (opsional)" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={resetTopUpForm}>Batal</Button>
                            <Button type="submit" disabled={isSubmittingTopUp}>
                                {isSubmittingTopUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmittingTopUp ? 'Menyimpan...' : (editingTopUp ? 'Simpan Perubahan' : 'Simpan Top Up')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Sheet */}
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
