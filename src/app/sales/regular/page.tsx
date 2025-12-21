'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, remove, update, serverTimestamp, runTransaction } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Loader2 } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';


interface Transaction {
  id: string;
  datetime: string;
  customerId: string;
  productName: string;
  sellingPrice: number;
  costPrice: number;
  fundSource: string;
  fundSourceId?: string;
  paymentMethod: string;
  paymentMethodId?: string;
  profit: number;
  createdAt: number;
}

interface FinancialCard {
    id: string;
    name: string;
    balance: number;
}

export default function RegularSalesPage() {
  const { toast } = useToast();
  const [datetime, setDatetime] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDatetime(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    const transactionsRef = ref(db, 'transaksi_reguler');
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransactions: Transaction[] = [];
      for (const key in data) {
        const profit = (data[key].sellingPrice || 0) - (data[key].costPrice || 0);
        loadedTransactions.push({ id: key, ...data[key], profit });
      }
      loadedTransactions.sort((a, b) => b.createdAt - a.createdAt);
      setTransactions(loadedTransactions);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const cardsRef = ref(db, 'keuangan/cards');
    const unsubscribe = onValue(cardsRef, (snapshot) => {
        const data = snapshot.val();
        const loadedCards: FinancialCard[] = [];
        if (data) {
            for (const key in data) {
                loadedCards.push({ id: key, ...data[key] });
            }
        }
        setFinancialCards(loadedCards);
        setIsLoadingCards(false);
    }, (error) => {
        console.error("Firebase read failed: " + error.message);
        setIsLoadingCards(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setCustomerId('');
    setProductName('');
    setSellingPrice('');
    setCostPrice('');
    setFundSource('');
    setPaymentMethod('');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDatetime(now.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productName || !sellingPrice || !costPrice || !fundSource || !paymentMethod) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Harap isi semua field yang wajib diisi.",
      });
      return;
    }
    setIsSubmitting(true);

    const cost = Number(costPrice);
    const price = Number(sellingPrice);
    const fundSourceCard = financialCards.find(c => c.id === fundSource);
    const paymentMethodCard = financialCards.find(c => c.id === paymentMethod);

    if (!fundSourceCard || !paymentMethodCard) {
        toast({ variant: "destructive", title: "Gagal", description: "Sumber dana atau metode pembayaran tidak valid." });
        setIsSubmitting(false);
        return;
    }

    const newTransaction = {
      datetime,
      customerId,
      productName,
      sellingPrice: price,
      costPrice: cost,
      fundSource: fundSourceCard.name,
      fundSourceId: fundSourceCard.id,
      paymentMethod: paymentMethodCard.name,
      paymentMethodId: paymentMethodCard.id,
      createdAt: serverTimestamp()
    };

    const transactionsRef = ref(db, 'transaksi_reguler');
    push(transactionsRef, newTransaction)
      .then(() => {
        // Update balances
        const fundSourceRef = ref(db, `keuangan/cards/${fundSourceCard.id}`);
        runTransaction(fundSourceRef, (card) => {
            if (card) {
                card.balance -= cost;
            }
            return card;
        });

        const paymentMethodRef = ref(db, `keuangan/cards/${paymentMethodCard.id}`);
        runTransaction(paymentMethodRef, (card) => {
            if (card) {
                card.balance += price;
            }
            return card;
        });

        toast({
          title: "Sukses",
          description: "Transaksi berhasil disimpan.",
        });
        resetForm();
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


  const handleDelete = (id: string) => {
    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    remove(transactionRef)
      .then(() => {
        toast({
          title: "Sukses",
          description: "Transaksi berhasil dihapus.",
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Gagal Menghapus",
          description: `Terjadi kesalahan: ${error.message}`,
        });
      });
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdate = () => {
    if (!editingTransaction) return;
    setIsUpdating(true);

    const { id, profit, ...dataToUpdate } = editingTransaction;
    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    
    const plainData = {
        ...dataToUpdate,
        sellingPrice: Number(dataToUpdate.sellingPrice),
        costPrice: Number(dataToUpdate.costPrice),
    }

    update(transactionRef, plainData)
      .then(() => {
        toast({
          title: "Sukses",
          description: "Transaksi berhasil diperbarui.",
        });
        setIsEditDialogOpen(false);
        setEditingTransaction(null);
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Gagal Memperbarui",
          description: `Terjadi kesalahan: ${error.message}`,
        });
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };


  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Pulsa, Token, &amp; Paket Data</h1>
          <p className="text-sm text-muted-foreground">Proses transaksi baru untuk produk reguler.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Transaksi Baru</CardTitle>
            <CardDescription>Isi detail transaksi untuk penjualan Pulsa, Token Listrik, dan Paket Data.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="datetime">Tanggal &amp; Waktu</Label>
                  <Input id="datetime" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">Nomor HP / ID Pelanggan</Label>
                  <Input id="customerId" placeholder="08123456789" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Nama Produk</Label>
                  <Input id="productName" placeholder="Contoh: Pulsa 50k" value={productName} onChange={(e) => setProductName(e.target.value)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Harga Jual</Label>
                  <Input id="sellingPrice" type="number" placeholder="52000" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Modal</Label>
                  <Input id="costPrice" type="number" placeholder="50500" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundSource">Sumber Modal</Label>
                   <Select value={fundSource} onValueChange={setFundSource} required>
                    <SelectTrigger className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2">
                        <SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih sumber modal"} />
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
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                   <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                    <SelectTrigger className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2">
                        <SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih metode pembayaran"} />
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
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isSubmitting || isLoadingCards} className="transition-all duration-300 hover:scale-105">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Riwayat Transaksi Reguler</CardTitle>
            <CardDescription>Daftar semua transaksi yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {transactions.map((trx) => (
                <Card key={trx.id} className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">{trx.productName}</CardTitle>
                    <CardDescription>{trx.customerId}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Waktu:</span> <span className="font-medium">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</span></div>
                    <div className="flex justify-between"><span>Harga Jual:</span> <span className="font-medium">Rp {trx.sellingPrice.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between"><span>Modal:</span> <span className="font-medium">Rp {trx.costPrice.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between"><span>Laba:</span> <Badge variant={trx.profit > 0 ? 'default' : 'destructive'}>Rp {trx.profit.toLocaleString('id-ID')}</Badge></div>
                    <div className="flex justify-between"><span>Sumber:</span> <span className="font-medium">{trx.fundSource || '-'}</span></div>
                    <div className="flex justify-between"><span>Pembayaran:</span> <span className="font-medium">{trx.paymentMethod || '-'}</span></div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(trx)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                          <AlertDialogDescription>Tindakan ini akan menghapus transaksi secara permanen. Anda yakin?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(trx.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>

             {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Waktu</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">ID Pelanggan</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Produk</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Harga</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Modal</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Laba</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Sumber</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Pembayaran</th>
                    <th className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{trx.customerId}</td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.productName}</td>
                      <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">Rp {trx.sellingPrice.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-sm text-right text-muted-foreground whitespace-nowrap">Rp {trx.costPrice.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                        <Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="font-semibold">
                          Rp {trx.profit.toLocaleString('id-ID')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{trx.fundSource || '-'}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{trx.paymentMethod || '-'}</td>
                      <td className="px-4 py-4 text-center space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(trx)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Ini akan menghapus transaksi secara permanen.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(trx.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {editingTransaction && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Transaksi</DialogTitle>
                <DialogDescription>Perbarui detail transaksi dan klik simpan.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-datetime">Tanggal &amp; Waktu</Label>
                  <Input id="edit-datetime" type="datetime-local" value={editingTransaction.datetime} onChange={(e) => setEditingTransaction({ ...editingTransaction, datetime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-customerId">Nomor HP / ID Pelanggan</Label>
                  <Input id="edit-customerId" value={editingTransaction.customerId} onChange={(e) => setEditingTransaction({ ...editingTransaction, customerId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-productName">Nama Produk</Label>
                  <Input id="edit-productName" value={editingTransaction.productName} onChange={(e) => setEditingTransaction({ ...editingTransaction, productName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sellingPrice">Harga Jual</Label>
                  <Input id="edit-sellingPrice" type="number" value={editingTransaction.sellingPrice} onChange={(e) => setEditingTransaction({ ...editingTransaction, sellingPrice: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-costPrice">Modal</Label>
                  <Input id="edit-costPrice" type="number" value={editingTransaction.costPrice} onChange={(e) => setEditingTransaction({ ...editingTransaction, costPrice: Number(e.target.value) })} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="edit-fundSource">Sumber Modal</Label>
                   <Select 
                      value={editingTransaction.fundSourceId || financialCards.find(c => c.name === editingTransaction.fundSource)?.id} 
                      onValueChange={(value) => {
                          const card = financialCards.find(c => c.id === value);
                          if (card) {
                            setEditingTransaction({ ...editingTransaction, fundSourceId: card.id, fundSource: card.name });
                          }
                      }}
                    >
                    <SelectTrigger className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2">
                        <SelectValue placeholder="Pilih sumber modal" />
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
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentMethod">Metode Pembayaran</Label>
                  <Select 
                      value={editingTransaction.paymentMethodId || financialCards.find(c => c.name === editingTransaction.paymentMethod)?.id} 
                      onValueChange={(value) => {
                          const card = financialCards.find(c => c.id === value);
                          if (card) {
                            setEditingTransaction({ ...editingTransaction, paymentMethodId: card.id, paymentMethod: card.name });
                          }
                      }}
                    >
                    <SelectTrigger className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2">
                        <SelectValue placeholder="Pilih metode pembayaran" />
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
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
