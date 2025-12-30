'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, update, serverTimestamp, runTransaction } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, X, Trash2 } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah, cleanRupiah } from '@/lib/utils';

interface Expense {
  id: string;
  name: string;
  nominal: number;
  fundSourceId: string;
  fundSourceName: string;
  date: string;
  description: string;
  createdAt: number;
  isDeleted?: boolean;
}

interface FinancialCard {
    id: string;
    name: string;
    balance: number;
}

export default function ExpensesPage() {
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [nominal, setNominal] = useState('');
  const [fundSourceId, setFundSourceId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  
  // Data & UI State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    const now = new Date();
    const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    setDate(localIsoString.split('T')[0]);

    setName('');
    setNominal('');
    setDescription('');
    setFundSourceId('');
    
    setShowForm(false);
  }, []);

  useEffect(() => {
    resetForm();
  }, [resetForm]);
  
  useEffect(() => {
    const expensesRef = ref(db, 'pengeluaran');
    const unsubscribeExpenses = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedExpenses: Expense[] = [];
      for (const key in data) {
        if (!data[key].isDeleted) {
          loadedExpenses.push({ id: key, ...data[key] });
        }
      }
      loadedExpenses.sort((a, b) => b.createdAt - a.createdAt);
      setExpenses(loadedExpenses);
      setIsLoadingExpenses(false);
    });

    const cardsRef = ref(db, 'keuangan/cards');
    const unsubscribeCards = onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedCards: FinancialCard[] = [];
      for (const key in data) {
        loadedCards.push({ id: key, ...data[key] });
      }
      setFinancialCards(loadedCards);
      setIsLoadingCards(false);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeCards();
    };
  }, []);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setNominal(formatRupiah(cleanedValue));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expenseNominal = cleanRupiah(nominal);

    if (!name || expenseNominal <= 0 || !fundSourceId || !date) {
      toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua field yang wajib diisi." });
      return;
    }
    
    const fundSourceCard = financialCards.find(c => c.id === fundSourceId);
    if (!fundSourceCard) {
      toast({ variant: "destructive", title: "Gagal", description: "Sumber dana tidak valid." });
      return;
    }

    setIsSubmitting(true);

    const newExpense = {
      name,
      nominal: expenseNominal,
      fundSourceId,
      fundSourceName: fundSourceCard.name,
      date,
      description,
      createdAt: serverTimestamp(),
      isDeleted: false,
    };

    push(ref(db, 'pengeluaran'), newExpense)
      .then(() => {
        const fundSourceRef = ref(db, `keuangan/cards/${fundSourceId}`);
        runTransaction(fundSourceRef, (card) => {
          if (card) {
            card.balance -= expenseNominal;
          }
          return card;
        });
        toast({ title: "Sukses", description: "Pengeluaran berhasil dicatat." });
        resetForm();
      })
      .catch((error) => {
        toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDelete = (expense: Expense) => {
    const updates: { [key: string]: any } = {};
    updates[`/pengeluaran/${expense.id}/isDeleted`] = true;
    updates[`/pengeluaran/${expense.id}/deletedAt`] = serverTimestamp();

    update(ref(db), updates).then(() => {
      const fundSourceRef = ref(db, `keuangan/cards/${expense.fundSourceId}`);
      runTransaction(fundSourceRef, (card) => {
        if (card) {
          card.balance += expense.nominal;
        }
        return card;
      });
      toast({ title: "Sukses", description: "Pengeluaran dipindahkan ke folder sampah." });
    }).catch((error) => {
      toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
    });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
            <h1 className="text-xl font-semibold md:text-2xl">Pengeluaran</h1>
            <p className="text-sm text-muted-foreground">Catat dan kelola biaya operasional.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "default"} className="transition-all duration-300">
            {showForm ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {showForm ? 'Tutup' : 'Tambah'}
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {showForm && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Catat Pengeluaran Baru</CardTitle>
              <CardDescription>Isi detail untuk mencatat biaya operasional.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-name">Nama Pengeluaran</Label>
                    <Input id="expense-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bayar Listrik" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-nominal">Nominal</Label>
                    <Input id="expense-nominal" value={nominal} onChange={handleNominalChange} placeholder="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-fund">Sumber Dana</Label>
                    <Select value={fundSourceId} onValueChange={setFundSourceId} required>
                      <SelectTrigger id="expense-fund">
                        <SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih sumber dana"} />
                      </SelectTrigger>
                      <SelectContent>
                        {financialCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-date">Tanggal</Label>
                    <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="expense-description">Keterangan</Label>
                    <Textarea id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Catatan tambahan (opsional)" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
        
        <Card className="rounded-xl shadow-sm">
            <CardHeader>
                <CardTitle>Riwayat Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoadingExpenses ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : expenses.length > 0 ? (
                     <div className="space-y-4">
                        {expenses.map(expense => (
                            <Card key={expense.id} className="rounded-lg">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold">{expense.name}</p>
                                        <p className="text-sm text-muted-foreground">{format(parseISO(expense.date), "d MMM yyyy", { locale: id })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600 dark:text-red-500">{formatRupiah(expense.nominal)}</p>
                                        <p className="text-xs text-muted-foreground">dari {expense.fundSourceName}</p>
                                    </div>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tindakan ini akan memindahkan pengeluaran ke folder sampah dan mengembalikan saldo. Anda dapat memulihkannya nanti.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(expense)}>Ya, Pindahkan</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Belum ada data pengeluaran.</p>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
