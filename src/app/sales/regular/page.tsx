'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, remove, update, serverTimestamp, runTransaction, query, orderByChild, equalTo, get } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Loader2, Eye } from 'lucide-react';
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
import { DetailModal } from '@/components/modals/detail-modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';
import { formatRupiah, cleanRupiah } from '@/lib/utils';


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

interface ProductMaster {
    id: string;
    name: string;
    sellingPrice: number;
    costPrice: number;
}

export default function RegularSalesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [datetime, setDatetime] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [productMaster, setProductMaster] = useState<ProductMaster[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // For Suggestion List
  const [showSuggestions, setShowSuggestions] = useState(false);
  const productNameInputRef = useRef<HTMLDivElement>(null);


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
    const unsubscribeCards = onValue(cardsRef, (snapshot) => {
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

    const productsRef = ref(db, 'produk_master');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const loadedProducts: ProductMaster[] = [];
        if (data) {
            for (const key in data) {
                loadedProducts.push({ id: key, ...data[key] });
            }
        }
        setProductMaster(loadedProducts);
        setIsLoadingProducts(false);
    });

    return () => {
        unsubscribeCards();
        unsubscribeProducts();
    };
  }, []);

  // Close suggestion list when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (productNameInputRef.current && !productNameInputRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setter(formatRupiah(cleanedValue));
  };

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
  
  const handleProductSelect = (product: ProductMaster) => {
      setProductName(product.name);
      setSellingPrice(formatRupiah(String(product.sellingPrice)));
      setCostPrice(formatRupiah(String(product.costPrice)));
      setShowSuggestions(false);
  }

  const saveToProductMaster = useCallback(async (productData: Omit<ProductMaster, 'id'>) => {
    const productsRef = query(ref(db, 'produk_master'), orderByChild('name'), equalTo(productData.name));
    const snapshot = await get(productsRef);
    if (!snapshot.exists()) {
        const newProductRef = push(ref(db, 'produk_master'));
        update(newProductRef, productData);
    }
  }, []);


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

    const cost = cleanRupiah(costPrice);
    const price = cleanRupiah(sellingPrice);
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
        if (productName && price && cost) {
          saveToProductMaster({ name: productName, sellingPrice: price, costPrice: cost });
        }

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
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) {
        toast({ variant: "destructive", title: "Error", description: "Transaksi tidak ditemukan." });
        return;
    }

    const cost = Number(transactionToDelete.costPrice);
    const price = Number(transactionToDelete.sellingPrice);
    const fundSourceCardId = transactionToDelete.fundSourceId;
    const paymentMethodCardId = transactionToDelete.paymentMethodId;

    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    remove(transactionRef)
      .then(() => {
        // Revert balance changes
        if(fundSourceCardId){
            const fundSourceRef = ref(db, `keuangan/cards/${fundSourceCardId}`);
            runTransaction(fundSourceRef, (card) => {
                if (card) {
                    card.balance += cost;
                }
                return card;
            });
        }
        if(paymentMethodCardId){
            const paymentMethodRef = ref(db, `keuangan/cards/${paymentMethodCardId}`);
            runTransaction(paymentMethodRef, (card) => {
                if (card) {
                    card.balance -= price;
                }
                return card;
            });
        }
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
    setEditSellingPrice(formatRupiah(String(transaction.sellingPrice)));
    setEditCostPrice(formatRupiah(String(transaction.costPrice)));
    setIsEditDialogOpen(true);
  };
  
  const handleDetailClick = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setIsDetailModalOpen(true);
  };
  
  const handleUpdate = () => {
    if (!editingTransaction) return;
    setIsUpdating(true);

    const updatedCostPrice = cleanRupiah(editCostPrice);
    const updatedSellingPrice = cleanRupiah(editSellingPrice);

    const dataToUpdate = { 
        ...editingTransaction,
        sellingPrice: updatedSellingPrice,
        costPrice: updatedCostPrice,
    };
    
    const { id, profit, createdAt, ...plainData } = dataToUpdate;

    const originalTransaction = transactions.find(t => t.id === id);

    if(!originalTransaction){
        toast({ variant: "destructive", title: "Error", description: "Transaksi asli tidak ditemukan untuk pembaruan."});
        setIsUpdating(false);
        return;
    }

    const transactionRef = ref(db, `transaksi_reguler/${id}`);
    
    update(transactionRef, plainData)
      .then(() => {
        saveToProductMaster({ name: plainData.productName, sellingPrice: plainData.sellingPrice, costPrice: plainData.costPrice });

        const costDiff = plainData.costPrice - originalTransaction.costPrice;
        const priceDiff = plainData.sellingPrice - originalTransaction.sellingPrice;

        if (originalTransaction.fundSourceId === plainData.fundSourceId) {
            if(costDiff !== 0 && originalTransaction.fundSourceId){
                const fundSourceRef = ref(db, `keuangan/cards/${originalTransaction.fundSourceId}`);
                runTransaction(fundSourceRef, (card) => {
                    if (card) {
                        card.balance -= costDiff;
                    }
                    return card;
                });
            }
        } else {
            // Revert old and apply new
            if(originalTransaction.fundSourceId){
                const oldFundRef = ref(db, `keuangan/cards/${originalTransaction.fundSourceId}`);
                runTransaction(oldFundRef, (card) => {
                    if (card) card.balance += originalTransaction.costPrice;
                    return card;
                });
            }
            if(plainData.fundSourceId){
                const newFundRef = ref(db, `keuangan/cards/${plainData.fundSourceId}`);
                runTransaction(newFundRef, (card) => {
                    if (card) card.balance -= plainData.costPrice;
                    return card;
                });
            }
        }

        // Handle payment method balance update
        if(originalTransaction.paymentMethodId === plainData.paymentMethodId){
            if(priceDiff !== 0 && originalTransaction.paymentMethodId){
                const paymentMethodRef = ref(db, `keuangan/cards/${originalTransaction.paymentMethodId}`);
                runTransaction(paymentMethodRef, (card) => {
                    if (card) {
                        card.balance += priceDiff;
                    }
                    return card;
                });
            }
        } else {
            // Revert old and apply new
            if(originalTransaction.paymentMethodId){
                const oldPaymentRef = ref(db, `keuangan/cards/${originalTransaction.paymentMethodId}`);
                runTransaction(oldPaymentRef, (card) => {
                    if(card) card.balance -= originalTransaction.sellingPrice;
                    return card;
                });
            }
            if(plainData.paymentMethodId){
                const newPaymentRef = ref(db, `keuangan/cards/${plainData.paymentMethodId}`);
                runTransaction(newPaymentRef, (card) => {
                    if(card) card.balance += plainData.sellingPrice;
                    return card;
                });
            }
        }

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

  const getDetailData = (trx: Transaction | null) => {
    if (!trx) return [];
    return [
        { label: 'Waktu Transaksi', value: format(parseISO(trx.datetime), "d MMMM yyyy, HH:mm:ss", { locale: id }) },
        { label: 'ID Pelanggan', value: trx.customerId },
        { label: 'Nama Produk', value: trx.productName },
        { label: 'Harga Jual', value: `Rp ${trx.sellingPrice.toLocaleString('id-ID')}` },
        { label: 'Harga Modal', value: `Rp ${trx.costPrice.toLocaleString('id-ID')}` },
        { label: 'Laba', value: `Rp ${trx.profit.toLocaleString('id-ID')}`, badge: trx.profit > 0 ? 'default' : 'destructive' },
        { label: 'Sumber Modal', value: trx.fundSource },
        { label: 'Metode Pembayaran', value: trx.paymentMethod },
    ];
  };
  
  const EditDialogOrSheet = isMobile ? Sheet : Dialog;
  const EditTrigger = isMobile ? (props: any) => <Button {...props} variant="outline" size="icon" className="h-9 w-9"><Edit className="h-4 w-4" /></Button> : (props: any) => <Button {...props} variant="outline" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>;
  const EditContent = isMobile ? SheetContent : DialogContent;
  const EditHeader = isMobile ? SheetHeader : DialogHeader;
  const EditTitle = isMobile ? SheetTitle : DialogTitle;
  const EditDescription = isMobile ? SheetDescription : DialogDescription;
  const EditFooter = isMobile ? SheetFooter : DialogFooter;
  const EditClose = isMobile ? SheetClose : DialogClose;


  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl">Pulsa, Token, &amp; Paket Data</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Proses transaksi baru untuk produk reguler.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <Card className="rounded-xl shadow-sm w-full">
          <CardHeader>
            <CardTitle>Transaksi Baru</CardTitle>
            <CardDescription>Isi detail transaksi untuk penjualan Pulsa, Token Listrik, dan Paket Data.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="space-y-2 md:col-span-2 lg:col-span-1 relative" ref={productNameInputRef}>
                    <Label htmlFor="productName">Nama Produk</Label>
                    <Input 
                      id="productName"
                      placeholder={isLoadingProducts ? "Memuat produk..." : "Ketik nama produk"}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      autoComplete="off"
                      required
                      className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
                    />
                    {showSuggestions && productMaster.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {productMaster
                              .filter(p => p.name.toLowerCase().includes(productName.toLowerCase()))
                              .map((product) => (
                                <div
                                    key={product.id}
                                    className="p-2 hover:bg-accent cursor-pointer text-sm"
                                    onClick={() => handleProductSelect(product)}
                                >
                                    {product.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Harga Jual</Label>
                  <Input id="sellingPrice" type="text" placeholder="52.000" value={sellingPrice} onChange={handlePriceChange(setSellingPrice)} required 
                         className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Modal</Label>
                  <Input id="costPrice" type="text" placeholder="50.500" value={costPrice} onChange={handlePriceChange(setCostPrice)} required 
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
              <Button type="submit" disabled={isSubmitting || isLoadingCards || isLoadingProducts} className="transition-all duration-300 hover:scale-105">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="rounded-xl shadow-sm w-full">
          <CardHeader>
            <CardTitle>Riwayat Transaksi Reguler</CardTitle>
            <CardDescription>Daftar semua transaksi yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="md:hidden space-y-4">
              {transactions.map((trx) => (
                <Card key={trx.id} className="rounded-lg border w-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{trx.productName}</CardTitle>
                            <CardDescription>{trx.customerId}</CardDescription>
                        </div>
                        <Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="text-xs">Rp {trx.profit.toLocaleString('id-ID')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pb-3">
                    <div className="flex justify-between"><span>Waktu:</span> <span className="font-medium text-right">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</span></div>
                    <div className="flex justify-between"><span>Harga Jual:</span> <span className="font-medium">Rp {trx.sellingPrice.toLocaleString('id-ID')}</span></div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-9 w-9"><Eye className="h-4 w-4" /></Button>
                    <EditDialogOrSheet open={editingTransaction?.id === trx.id} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                        <EditTrigger onClick={() => handleEditClick(trx)} />
                    </EditDialogOrSheet>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
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
                      <td className="px-4 py-4 text-center space-x-1 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                         <EditDialogOrSheet open={editingTransaction?.id === trx.id} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                            <EditTrigger onClick={() => handleEditClick(trx)} />
                         </EditDialogOrSheet>
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
          <EditContent className={isMobile ? 'w-full' : ''}>
              <EditHeader>
                <EditTitle>Edit Transaksi</EditTitle>
                <EditDescription>Perbarui detail transaksi dan klik simpan.</EditDescription>
              </EditHeader>
              <div className={`py-4 ${isMobile ? 'px-4 space-y-4' : 'grid gap-4'}`}>
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
                  <Input id="edit-sellingPrice" type="text" value={editSellingPrice} onChange={handlePriceChange(setEditSellingPrice)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-costPrice">Modal</Label>
                  <Input id="edit-costPrice" type="text" value={editCostPrice} onChange={handlePriceChange(setEditCostPrice)} />
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
              <EditFooter>
                <EditClose asChild><Button type="button" variant="secondary">Batal</Button></EditClose>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </EditFooter>
            </EditContent>
        )}

        <DetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title="Detail Transaksi"
            data={getDetailData(detailTransaction)}
        />
      </main>
    </div>
  );
}
