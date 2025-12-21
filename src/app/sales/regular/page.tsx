'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit } from 'lucide-react';
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

interface Transaction {
  id: string;
  datetime: string;
  customerId: string;
  productName: string;
  sellingPrice: number;
  costPrice: number;
  fundSource: string;
  paymentMethod: string;
  profit: number;
}

export default function RegularSalesPage() {
  const [datetime, setDatetime] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      setTransactions(loadedTransactions.reverse());
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productName || !sellingPrice || !costPrice) {
        alert("Harap isi semua field yang wajib diisi.");
        return;
    }

    const newTransaction = {
      datetime,
      customerId,
      productName,
      sellingPrice: Number(sellingPrice),
      costPrice: Number(costPrice),
      fundSource,
      paymentMethod
    };

    const transactionsRef = ref(db, 'transaksi_reguler');
    push(transactionsRef, newTransaction);

    // Reset form
    setCustomerId('');
    setProductName('');
    setSellingPrice('');
    setCostPrice('');
    setFundSource('');
    setPaymentMethod('');
  };

  const handleDelete = (id: string) => {
    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    remove(transactionRef);
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTransaction) return;

    const { id, ...dataToUpdate } = editingTransaction;
    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    update(transactionRef, {
        ...dataToUpdate,
        sellingPrice: Number(dataToUpdate.sellingPrice),
        costPrice: Number(dataToUpdate.costPrice),
    });

    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  };


  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">Pulsa, Token, &amp; Paket Data</h1>
            <p className="text-sm text-muted-foreground">Proses transaksi baru untuk produk reguler.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Transaksi Baru</CardTitle>
            <CardDescription>Proses penjualan untuk Pulsa, Token Listrik, dan Paket Data.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="datetime">Tanggal &amp; Waktu</Label>
                  <Input id="datetime" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">Nomor HP / ID Pelanggan</Label>
                  <Input id="customerId" placeholder="08123456789" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Nama Produk</Label>
                  <Input id="productName" placeholder="Contoh: Pulsa 50k" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Harga Jual</Label>
                  <Input id="sellingPrice" type="number" placeholder="52000" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Modal</Label>
                  <Input id="costPrice" type="number" placeholder="50500" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="fundSource">Sumber Modal</Label>
                  <Input id="fundSource" placeholder="Saldo Server" value={fundSource} onChange={(e) => setFundSource(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                  <Input id="paymentMethod" placeholder="Tunai" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit">Simpan Transaksi</Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Riwayat Transaksi Reguler</CardTitle>
            <CardDescription>Daftar semua transaksi yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>ID Pelanggan</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Modal</TableHead>
                        <TableHead className="text-right">Laba</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead>Pembayaran</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((trx) => (
                    <TableRow key={trx.id}>
                        <TableCell>{new Date(trx.datetime).toLocaleString('id-ID')}</TableCell>
                        <TableCell>{trx.customerId}</TableCell>
                        <TableCell>{trx.productName}</TableCell>
                        <TableCell className="text-right">{trx.sellingPrice.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">{trx.costPrice.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="font-medium">
                            {trx.profit.toLocaleString('id-ID')}
                          </Badge>
                        </TableCell>
                        <TableCell>{trx.fundSource}</TableCell>
                        <TableCell>{trx.paymentMethod}</TableCell>
                        <TableCell className="text-center space-x-2">
                           <Button variant="outline" size="icon" onClick={() => handleEditClick(trx)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tindakan ini tidak dapat diurungkan. Ini akan menghapus transaksi secara permanen.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(trx.id)}>Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editingTransaction && (
           <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Transaksi</DialogTitle>
                <DialogDescription>
                  Perbarui detail transaksi dan klik simpan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                  <Label htmlFor="edit-datetime">Tanggal &amp; Waktu</Label>
                  <Input id="edit-datetime" type="datetime-local" value={editingTransaction.datetime} onChange={(e) => setEditingTransaction({...editingTransaction, datetime: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="edit-customerId">Nomor HP / ID Pelanggan</Label>
                  <Input id="edit-customerId" value={editingTransaction.customerId} onChange={(e) => setEditingTransaction({...editingTransaction, customerId: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-productName">Nama Produk</Label>
                  <Input id="edit-productName" value={editingTransaction.productName} onChange={(e) => setEditingTransaction({...editingTransaction, productName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sellingPrice">Harga Jual</Label>
                  <Input id="edit-sellingPrice" type="number" value={editingTransaction.sellingPrice} onChange={(e) => setEditingTransaction({...editingTransaction, sellingPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-costPrice">Modal</Label>
                  <Input id="edit-costPrice" type="number" value={editingTransaction.costPrice} onChange={(e) => setEditingTransaction({...editingTransaction, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fundSource">Sumber Modal</Label>
                  <Input id="edit-fundSource" value={editingTransaction.fundSource} onChange={(e) => setEditingTransaction({...editingTransaction, fundSource: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentMethod">Metode Pembayaran</Label>
                  <Input id="edit-paymentMethod" value={editingTransaction.paymentMethod} onChange={(e) => setEditingTransaction({...editingTransaction, paymentMethod: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Batal</Button>
                  </DialogClose>
                  <Button onClick={handleUpdate}>Simpan Perubahan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
