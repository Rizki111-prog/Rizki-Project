'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, update, serverTimestamp, query, orderByChild, equalTo, get } from 'firebase/database';
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Loader2, Eye, PlusCircle, X } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Transaction {
  id: string;
  datetime: string;
  customerId: string;
  productName: string;
  sellingPrice: number;
  costPrice: number;
  fundSource: string;
  fundSourceId?: string;
  payments: Payment[];
  profit: number;
  createdAt: number;
  isDeleted?: boolean;
}

interface FinancialCard {
    id: string;
    name: string;
}

interface ProductMaster {
    id: string;
    name: string;
    sellingPrice: number;
    costPrice: number;
}

interface Payment {
  method: string;
  cardId?: string;
  amount: number;
  debtorName?: string;
}

interface FormComponentProps {
    handleSubmit: (e: React.FormEvent) => void;
    datetime: string;
    setDatetime: (value: string) => void;
    customerId: string;
    setCustomerId: (value: string) => void;
    productName: string;
    setProductName: (value: string) => void;
    sellingPrice: string;
    setSellingPrice: (value: string) => void;
    costPrice: string;
    setCostPrice: (value: string) => void;
    fundSource: string;
    setFundSource: (value: string) => void;
    payments: Payment[];
    setPayments: (value: Payment[]) => void;
    isPaymentAmountManuallySet: boolean;
    setIsPaymentAmountManuallySet: (value: boolean) => void;
    financialCards: FinancialCard[];
    productMaster: ProductMaster[];
    isLoadingCards: boolean;
    isLoadingProducts: boolean;
    showSuggestions: boolean;
    setShowSuggestions: (value: boolean) => void;
    productNameInputRef: React.RefObject<HTMLDivElement>;
    isSubmitting: boolean;
    isPaymentValid: boolean;
    setSelectedProductId: (id: string | null) => void;
}

const FormComponent: React.FC<FormComponentProps> = ({
    handleSubmit,
    datetime, setDatetime,
    customerId, setCustomerId,
    productName, setProductName,
    sellingPrice, setSellingPrice,
    costPrice, setCostPrice,
    fundSource, setFundSource,
    payments, setPayments,
    setIsPaymentAmountManuallySet,
    financialCards, productMaster,
    isLoadingCards, isLoadingProducts,
    showSuggestions, setShowSuggestions,
    productNameInputRef, isSubmitting, isPaymentValid,
    setSelectedProductId
}) => {
    
    const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const cleanedValue = value.replace(/[^0-9]/g, '');
        setter(formatRupiah(cleanedValue));

        if (setter === setSellingPrice) {
            setIsPaymentAmountManuallySet(false);
        }
    };
  
    const handlePaymentAmountChange = (index: number, value: string) => {
        const newPayments = [...payments];
        const cleanedValue = value.replace(/[^0-9]/g, '');
        newPayments[index].amount = cleanRupiah(cleanedValue);
        setPayments(newPayments);
        setIsPaymentAmountManuallySet(true);
    };
  
    const handlePaymentMethodChange = (index: number, value: string) => {
        const newPayments = [...payments];
        const card = financialCards.find(c => c.id === value);
        if (value === 'Hutang') {
            newPayments[index].method = 'Hutang';
            newPayments[index].cardId = undefined;
            newPayments[index].debtorName = ''; 
        } else if (card) {
            newPayments[index].method = card.name;
            newPayments[index].cardId = card.id;
            newPayments[index].debtorName = undefined;
        }
        setPayments(newPayments);
    };

    const handleDebtorNameChange = (index: number, value: string) => {
        const newPayments = [...payments];
        newPayments[index].debtorName = value;
        setPayments(newPayments);
    };

    const addPayment = () => {
        setIsPaymentAmountManuallySet(true); 
        const remaining = (cleanRupiah(sellingPrice) || 0) - payments.reduce((acc, p) => acc + p.amount, 0);
        setPayments([...payments, { method: '', cardId: '', amount: remaining > 0 ? remaining : 0, debtorName: '' }]);
    };

    const removePayment = (index: number) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
        if (newPayments.length === 1) {
            setIsPaymentAmountManuallySet(false);
        }
    };

    const handleProductSelect = (product: ProductMaster) => {
      setProductName(product.name);
      setSellingPrice(formatRupiah(String(product.sellingPrice || '')));
      setCostPrice(formatRupiah(String(product.costPrice || '')));
      setSelectedProductId(product.id);
      setShowSuggestions(false);
      setIsPaymentAmountManuallySet(false); 
    }
  
    const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
    const remainingAmount = useMemo(() => (cleanRupiah(sellingPrice) || 0) - totalPaid, [sellingPrice, totalPaid]);
    
    return (
        <form onSubmit={handleSubmit}>
        <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                <Label htmlFor="datetime">Tanggal &amp; Waktu</Label>
                <Input id="datetime" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required 
                        className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                <Label htmlFor="customerId">Nomor HP / ID Pelanggan</Label>
                <Input id="customerId" placeholder="ID Pelanggan (Opsional)" value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                        className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-1 relative" ref={productNameInputRef}>
                    <Label htmlFor="productName">Nama Produk</Label>
                    <Input 
                    id="productName"
                    placeholder={isLoadingProducts ? "Memuat produk..." : "Ketik nama produk"}
                    value={productName}
                    onChange={(e) => {
                        setProductName(e.target.value);
                        setSelectedProductId(null); // Clear selected product ID on manual typing
                        if (!showSuggestions) setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                    required
                    className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
                    />
                    {showSuggestions && productMaster.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                <Input id="sellingPrice" type="text" placeholder="Harga Jual (Opsional)" value={sellingPrice} onChange={handlePriceChange(setSellingPrice)} 
                        className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                <Label htmlFor="costPrice">Modal</Label>
                <Input id="costPrice" type="text" placeholder="Modal (Opsional)" value={costPrice} onChange={handlePriceChange(setCostPrice)} 
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
            </div>
                <div className="mt-6 border-t pt-4">
                <h3 className="text-md font-medium mb-2">Metode Pembayaran</h3>
                    <div className="space-y-4">
                    {payments.map((payment, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/20 relative">
                            <div className="space-y-2 col-span-12 md:col-span-5">
                                <Label htmlFor={`payment-method-${index}`}>Metode</Label>
                                <Select value={payment.cardId || (payment.method === 'Hutang' ? 'Hutang' : '')} onValueChange={(value) => handlePaymentMethodChange(index, value)} required>
                                    <SelectTrigger id={`payment-method-${index}`} className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 bg-background">
                                        <SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih metode"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Hutang">Hutang</SelectItem>
                                        {financialCards.map(card => (
                                            <SelectItem key={card.id} value={card.id}>
                                                {card.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {payment.method === 'Hutang' && (
                                <div className="space-y-2 col-span-12 md:col-span-3">
                                    <Label htmlFor={`debtor-name-${index}`}>Nama Penghutang</Label>
                                    <Input 
                                    id={`debtor-name-${index}`}
                                    placeholder="Masukkan nama"
                                    value={payment.debtorName || ''}
                                    onChange={(e) => handleDebtorNameChange(index, e.target.value)}
                                    required
                                    className="bg-background"
                                    />
                                </div>
                            )}
                            <div className={`space-y-2 col-span-12 ${payment.method === 'Hutang' ? 'md:col-span-3' : 'md:col-span-6'}`}>
                                <Label htmlFor={`payment-amount-${index}`}>Nominal</Label>
                                <Input 
                                    id={`payment-amount-${index}`}
                                    type="text"
                                    placeholder="0"
                                    value={formatRupiah(payment.amount)}
                                    onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            {payments.length > 1 && (
                                <div className="col-span-12 md:col-span-1 flex items-end justify-end md:justify-center">
                                    <Button variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4">
                        <Button type="button" variant="outline" size="sm" onClick={addPayment} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Pembayaran</Button>
                        <div className="text-right w-full md:w-auto">
                        <p>Total Terinput: <span className="font-bold">{formatRupiah(totalPaid)}</span></p>
                        <p className={remainingAmount !== 0 ? 'text-destructive' : 'text-emerald-600'}>
                            {remainingAmount > 0 ? `Sisa: ${formatRupiah(remainingAmount)}` : remainingAmount < 0 ? `Kelebihan: ${formatRupiah(Math.abs(remainingAmount))}`: 'Lunas'}
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isLoadingCards || isLoadingProducts || !isPaymentValid} className="transition-all duration-300 hover:scale-105 w-full md:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
        </CardFooter>
        </form>
    );
};


export default function RegularSalesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // Form State
  const [datetime, setDatetime] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [payments, setPayments] = useState<Payment[]>([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
  const [isPaymentAmountManuallySet, setIsPaymentAmountManuallySet] = useState(false);

  // Data & UI State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [productMaster, setProductMaster] = useState<ProductMaster[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Editing State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Detail Modal State
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const productNameInputRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback(() => {
    const now = new Date();
    const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    setDatetime(localIsoString.slice(0, 16));

    setCustomerId('');
    setProductName('');
    setSelectedProductId(null);
    setSellingPrice('');
    setCostPrice('');
    
    setPayments([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
    setIsPaymentAmountManuallySet(false);

    const agenPulsaCard = financialCards.find(card => card.name.toLowerCase() === 'agen pulsa');
    if (agenPulsaCard) {
      setFundSource(agenPulsaCard.id);
    } else if (financialCards.length > 0) {
      setFundSource(financialCards[0].id);
    }
    
    setShowForm(false);
  }, [financialCards]);

  useEffect(() => {
      resetForm();
  }, [resetForm]);

  useEffect(() => {
    const transactionsRef = ref(db, 'transaksi_reguler');
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransactions: Transaction[] = [];
      for (const key in data) {
        const trxData = data[key];
        if (trxData.isDeleted) continue;
        const profit = (trxData.sellingPrice || 0) - (trxData.costPrice || 0);
        loadedTransactions.push({ id: key, ...trxData, profit });
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

  useEffect(() => {
    if (isLoadingCards) return;

    const price = cleanRupiah(sellingPrice) || 0;
    
    if (payments.length === 1 && !isPaymentAmountManuallySet) {
        const newPayments = [...payments];
        const cashCard = financialCards.find(c => c.name.toLowerCase() === 'tunai');
        const defaultCard = cashCard || (financialCards.length > 0 ? financialCards[0] : null);

        newPayments[0].amount = price >= 0 ? price : 0;
        
        if (defaultCard) {
            newPayments[0].method = defaultCard.name;
            newPayments[0].cardId = defaultCard.id;
        }
        setPayments(newPayments);
    }
  }, [sellingPrice, financialCards, isPaymentAmountManuallySet, payments.length, isLoadingCards]);
  
  // Set default fund source once cards are loaded
  useEffect(() => {
      if (!isLoadingCards && !fundSource) {
          const agenPulsaCard = financialCards.find(card => card.name.toLowerCase() === 'agen pulsa');
          if (agenPulsaCard) {
              setFundSource(agenPulsaCard.id);
          } else if (financialCards.length > 0) {
              setFundSource(financialCards[0].id);
          }
      }
  }, [isLoadingCards, financialCards, fundSource]);
  
  const isPaymentValid = useMemo(() => {
    const price = cleanRupiah(sellingPrice) || 0;
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    return price === totalPaid;
  }, [sellingPrice, payments]);


  const updateMasterProduct = useCallback(async (productId: string, newSellingPrice: number, newCostPrice: number) => {
    const productInMaster = productMaster.find(p => p.id === productId);
    if (!productInMaster) return;

    const masterSellingPrice = productInMaster.sellingPrice || 0;
    const masterCostPrice = productInMaster.costPrice || 0;

    if (newSellingPrice !== masterSellingPrice || newCostPrice !== masterCostPrice) {
      const productRef = ref(db, `produk_master/${productId}`);
      await update(productRef, { sellingPrice: newSellingPrice, costPrice: newCostPrice });
      toast({
        title: "Data Master Diperbarui",
        description: `Harga untuk "${productInMaster.name}" telah diupdate.`
      });
    }
  }, [productMaster, toast]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const price = cleanRupiah(sellingPrice) || 0;
    const cost = cleanRupiah(costPrice) || 0;

    if (!productName || !fundSource) {
      toast({ variant: "destructive", title: "Gagal", description: "Nama Produk dan Sumber Modal wajib diisi." });
      return;
    }
    
    if (!isPaymentValid) {
        toast({ variant: "destructive", title: "Gagal", description: "Total pembayaran tidak sesuai dengan harga jual."});
        return;
    }

    if (payments.some(p => !p.method || (p.method === 'Hutang' && !p.debtorName))) {
        toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua detail pembayaran (termasuk Nama Penghutang jika ada)." });
        return;
    }

    setIsSubmitting(true);

    const fundSourceCard = financialCards.find(c => c.id === fundSource);
    
    if (!fundSourceCard) {
        toast({ variant: "destructive", title: "Gagal", description: "Sumber dana tidak valid." });
        setIsSubmitting(false);
        return;
    }
    
    const transactionsRef = ref(db, 'transaksi_reguler');
    const newTransactionRef = push(transactionsRef);
    const transactionId = newTransactionRef.key;
    
    const newTransaction = {
      datetime,
      customerId: customerId || '',
      productName,
      sellingPrice: price,
      costPrice: cost,
      fundSource: fundSourceCard.name,
      fundSourceId: fundSourceCard.id,
      payments: payments.map(({amount, method, cardId, debtorName}) => {
        const paymentData: any = { amount, method };
        if (cardId) paymentData.cardId = cardId;
        if (debtorName) paymentData.debtorName = debtorName;
        return paymentData;
      }),
      createdAt: serverTimestamp(),
      isDeleted: false
    };
    
    update(newTransactionRef, newTransaction)
      .then(() => {
        if (selectedProductId) {
          updateMasterProduct(selectedProductId, price, cost);
        }
        
        payments.forEach(payment => {
            if(payment.method === 'Hutang' && transactionId && payment.amount > 0) {
                const debtRef = ref(db, 'hutang');
                push(debtRef, {
                    nama: payment.debtorName,
                    nominal: payment.amount,
                    tanggal: datetime,
                    status: 'Belum Lunas',
                    transactionId: transactionId,
                    sourcePath: 'transaksi_reguler',
                    isDeleted: false
                });
            }
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
    if (!transactionToDelete) return;
  
    const updates: { [key: string]: any } = {};
    const deletedAt = serverTimestamp();
    updates[`/transaksi_reguler/${id}/isDeleted`] = true;
    updates[`/transaksi_reguler/${id}/deletedAt`] = deletedAt;
  
    get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(id))).then(snapshot => {
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          updates[`/hutang/${child.key}/isDeleted`] = true;
          updates[`/hutang/${child.key}/deletedAt`] = deletedAt;
        });
      }
  
      update(ref(db), updates).then(() => {
        toast({ title: "Sukses", description: "Transaksi dipindahkan ke folder sampah." });
      }).catch((error) => {
        toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
      });
    });
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  const handleDetailClick = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setIsDetailModalOpen(true);
  };
  
  const handleUpdate = () => {
    toast({
        title: "Info",
        description: "Fungsi edit untuk transaksi multi-payment sedang dalam pengembangan."
    });
    setIsEditDialogOpen(false);
  };

  const getPaymentMethodsString = (payments: Payment[] | undefined) => {
    if (!payments || payments.length === 0) return 'Tidak Diketahui';
    if (payments.length === 1) return payments[0].method;
    return `${payments.length} metode`;
  }

  const getDetailData = (trx: Transaction | null) => {
    if (!trx) return [];
    let details: any[] = [
        { label: 'Waktu Transaksi', value: format(parseISO(trx.datetime), "d MMMM yyyy, HH:mm:ss", { locale: id }) },
        { label: 'ID Pelanggan', value: trx.customerId || '-' },
        { label: 'Nama Produk', value: trx.productName },
        { label: 'Harga Jual', value: formatRupiah(trx.sellingPrice) },
        { label: 'Harga Modal', value: formatRupiah(trx.costPrice) },
        { label: 'Laba', value: formatRupiah(trx.profit), badge: trx.profit > 0 ? 'default' : 'destructive' },
        { label: 'Sumber Modal', value: trx.fundSource },
    ];
    
    trx.payments?.forEach((p, i) => {
        const paymentLabel = `Pembayaran ${i+1}${p.method === 'Hutang' ? ` (${p.debtorName})` : ''}`;
        const paymentValue = `${p.method} - ${formatRupiah(p.amount)}`;
        details.push({ label: paymentLabel, value: paymentValue });
    })

    return details;
  };
  
  const EditDialogOrSheet = isMobile ? Sheet : Dialog;
  const EditTrigger = isMobile ? (props: any) => <Button {...props} variant="outline" size="icon" className="h-9 w-9"><Edit className="h-4 w-4" /></Button> : (props: any) => <Button {...props} variant="outline" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>;
  const EditContent = isMobile ? SheetContent : DialogContent;
  const EditHeader = isMobile ? SheetHeader : DialogHeader;
  const EditTitle = isMobile ? SheetTitle : DialogTitle;
  const EditDescription = isMobile ? SheetDescription : DialogDescription;
  const EditFooter = isMobile ? SheetFooter : DialogFooter;
  const EditClose = isMobile ? SheetClose : DialogClose;

  const formProps = {
    handleSubmit, datetime, setDatetime, customerId, setCustomerId,
    productName, setProductName, sellingPrice, setSellingPrice, costPrice, setCostPrice,
    fundSource, setFundSource, payments, setPayments, isPaymentAmountManuallySet,
    setIsPaymentAmountManuallySet, financialCards, productMaster, isLoadingCards,
    isLoadingProducts, showSuggestions, setShowSuggestions, productNameInputRef,
    isSubmitting, isPaymentValid, setSelectedProductId
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <AppHeader title="Pulsa, Token, & Paket Data">
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="hidden md:flex">
            {showForm ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {showForm ? 'Tutup' : 'Tambah Transaksi'}
        </Button>
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <div className="p-4 md:hidden">
            {!showForm && (
                <Button onClick={() => setShowForm(true)} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Transaksi
                </Button>
            )}
        </div>
        {isMobile ? (
          <Sheet open={showForm} onOpenChange={setShowForm}>
            <SheetContent side="right" className="w-full p-0">
              <SheetHeader className="p-6">
                <SheetTitle>Transaksi Baru</SheetTitle>
                <SheetDescription>Isi detail untuk penjualan Pulsa, Token, dan Paket Data.</SheetDescription>
              </SheetHeader>
              <div className="px-6 h-[calc(100vh-140px)] overflow-y-auto">
                <FormComponent {...formProps} />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="px-4 sm:px-6 mb-6"
              >
                <Card className="rounded-xl shadow-sm w-full">
                  <CardHeader className='flex flex-row items-center justify-between'>
                      <div>
                          <CardTitle>Transaksi Baru</CardTitle>
                          <CardDescription>Isi detail untuk penjualan Pulsa, Token, dan Paket Data.</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                          <X className="h-4 w-4" />
                      </Button>
                  </CardHeader>
                  <FormComponent {...formProps} />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="px-4 sm:px-6">
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
                                <CardDescription>{trx.customerId || 'Tanpa ID'}</CardDescription>
                            </div>
                            <Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="text-xs">{formatRupiah(trx.profit)}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm pb-3">
                        <div className="flex justify-between"><span>Waktu:</span> <span className="font-medium text-right">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</span></div>
                        <div className="flex justify-between"><span>Harga Jual:</span> <span className="font-medium">{formatRupiah(trx.sellingPrice)}</span></div>
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
                            <AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle>
                            <AlertDialogDescription>Tindakan ini akan memindahkan transaksi ke folder sampah. Anda dapat memulihkannya nanti.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(trx.id)}>Pindahkan</AlertDialogAction>
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
                        <td className="px-4 py-4 text-sm text-foreground">{trx.customerId || '-'}</td>
                        <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.productName}</td>
                        <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">{formatRupiah(trx.sellingPrice)}</td>
                        <td className="px-4 py-4 text-sm text-right text-muted-foreground whitespace-nowrap">{formatRupiah(trx.costPrice)}</td>
                        <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                            <Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="font-semibold">
                            {formatRupiah(trx.profit)}
                            </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{trx.fundSource || '-'}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{getPaymentMethodsString(trx.payments)}</td>
                        <td className="px-4 py-4 text-center space-x-1 whitespace-nowrap">
                            <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            <EditDialogOrSheet open={editingTransaction?.id === trx.id} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                                <EditTrigger onClick={() => handleEditClick(trx)} />
                            </EditDialogOrSheet>
                            <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle>
                                <AlertDialogDescription>Tindakan ini akan memindahkan transaksi ke folder sampah. Anda dapat memulihkannya nanti.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(trx.id)}>Pindahkan</AlertDialogAction>
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
        </div>
        {editingTransaction && (
          <EditContent className={isMobile ? 'w-full' : ''}>
              <EditHeader>
                <EditTitle>Edit Transaksi</EditTitle>
                <EditDescription>Fungsi edit multi-payment sedang dalam pengembangan. Klik simpan untuk menutup.</EditDescription>
              </EditHeader>
              <div className={`py-4 ${isMobile ? 'px-4 space-y-4' : 'grid gap-4'}`}>
                 <p className="text-sm text-muted-foreground">Detail transaksi akan ditampilkan di sini.</p>
              </div>
              <EditFooter>
                <EditClose asChild><Button type="button" variant="secondary">Batal</Button></EditClose>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan Perubahan
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
