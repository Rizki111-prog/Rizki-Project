'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, Landmark, CreditCard, PlusCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface FinancialCard {
  id: string;
  name: string;
  balance: number;
  createdAt: number;
  icon: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  Wallet,
  Landmark,
  CreditCard,
  DollarSign,
};

const getIconForCard = (cardName: string) => {
    const lowerCaseName = cardName.toLowerCase();
    if (lowerCaseName.includes('bank')) return 'Landmark';
    if (lowerCaseName.includes('cash') || lowerCaseName.includes('tunai')) return 'Wallet';
    if (lowerCaseName.includes('credit') || lowerCaseName.includes('kredit')) return 'CreditCard';
    return 'DollarSign';
}


export default function FinancePage() {
    const { toast } = useToast();
    const [cards, setCards] = useState<FinancialCard[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCardName, setNewCardName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const cardsRef = ref(db, 'keuangan/cards');
        const unsubscribe = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedCards: FinancialCard[] = [];
            if (data) {
                for (const key in data) {
                    loadedCards.push({ 
                        id: key, 
                        ...data[key],
                        icon: getIconForCard(data[key].name)
                    });
                }
            } else {
                 // Create a default 'Cash' card if none exist
                const defaultCard = {
                    name: 'Tunai',
                    balance: 0,
                    createdAt: serverTimestamp(),
                    icon: 'Wallet'
                };
                const newCardRef = push(cardsRef);
                push(newCardRef, defaultCard);
            }
            loadedCards.sort((a, b) => a.createdAt - b.createdAt);
            setCards(loadedCards);
        });

        return () => unsubscribe();
    }, []);

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCardName.trim() || !initialBalance.trim()) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Nama akun dan saldo awal tidak boleh kosong.",
            });
            return;
        }
        setIsSubmitting(true);

        const newCard = {
            name: newCardName,
            balance: Number(initialBalance),
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
    
    return (
        <div className="flex flex-col w-full min-h-screen bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Keuangan</h1>
                    <p className="text-sm text-muted-foreground">Kelola saldo dan laporan keuangan Anda.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="transition-all duration-300 hover:scale-105">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Akun
                </Button>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {cards.map((card, index) => {
                        const Icon = iconMap[card.icon] || DollarSign;
                        return (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card className="rounded-2xl shadow-sm border-white/20 bg-white/30 backdrop-blur-lg hover:shadow-lg transition-shadow duration-300 dark:bg-slate-800/30 dark:border-slate-700/50">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-foreground/80">
                                            {card.name}
                                        </CardTitle>
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold tracking-tight">
                                            Rp {card.balance.toLocaleString('id-ID')}
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
                        <p className="text-muted-foreground">Belum ada akun keuangan. Silakan tambahkan.</p>
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="initial-balance">Saldo Awal</Label>
                                <Input
                                    id="initial-balance"
                                    type="number"
                                    value={initialBalance}
                                    onChange={(e) => setInitialBalance(e.target.value)}
                                    placeholder="0"
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
        </div>
    );
}
