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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { DetailModal } from '@/components/modals/detail-modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';
import { formatRupiah, cleanRupiah } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

// ─────────────────────────────────────────────────────────────────────────────
// FormComponent — sepenuhnya mengelola state-nya sendiri.
// Re-render pada komponen induk TIDAK akan memengaruhi form ini.
// ─────────────────────────────────────────────────────────────────────────────
interface FormComponentProps {
    financialCards: FinancialCard[];
    productMaster: ProductMaster[];
    isLoadingCards: boolean;
    isLoadingProducts: boolean;
    editingTransaction: Transaction | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const getDefaultDatetime = () => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

const FormComponent: React.FC<FormComponentProps> = React.memo(({
    financialCards,
    productMaster,
    isLoadingCards,
    isLoadingProducts,
    editingTransaction,
    onSuccess,
    onCancel,
}) => {
    const { toast } = useToast();

    // ── State form — terisolasi di dalam komponen ini ──
    const [datetime, setDatetime] = useState(getDefaultDatetime);
    const [customerId, setCustomerId] = useState('');
    const [productName, setProductName] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [sellingPrice, setSellingPrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [fundSource, setFundSource] = useState('');
    const [payments, setPayments] = useState<Payment[]>([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const productNameInputRef = useRef<HTMLDivElement>(null);

    // ── Saat editingTransaction berubah, isi ulang atau reset form ──
    useEffect(() => {
        if (editingTransaction) {
            setDatetime(editingTransaction.datetime);
            setCustomerId(editingTransaction.customerId);
            setProductName(editingTransaction.productName);
            setSellingPrice(formatRupiah(editingTransaction.sellingPrice));
            setCostPrice(formatRupiah(editingTransaction.costPrice));
            setFundSource(editingTransaction.fundSourceId || '');
            setPayments(editingTransaction.payments);
            const match = productMaster.find(p => p.name === editingTransaction.productName);
            setSelectedProductId(match ? match.id : null);
        } else {
            setDatetime(getDefaultDatetime());
            setCustomerId('');
            setProductName('');
            setSelectedProductId(null);
            setSellingPrice('');
            setCostPrice('');
            setPayments([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
            // Set default fundSource dari kartu 'agen pulsa'
            const agenPulsaCard = financialCards.find(c => c.name.toLowerCase() === 'agen pulsa');
            setFundSource(agenPulsaCard ? agenPulsaCard.id : (financialCards[0]?.id || ''));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingTransaction]);

    // ── Set default fundSource pertama kali kartu dimuat ──
    useEffect(() => {
        if (!isLoadingCards && !fundSource && !editingTransaction) {
            const agenPulsaCard = financialCards.find(c => c.name.toLowerCase() === 'agen pulsa');
            setFundSource(agenPulsaCard ? agenPulsaCard.id : (financialCards[0]?.id || ''));
        }
    }, [isLoadingCards, financialCards, fundSource, editingTransaction]);

    // ── Tutup dropdown produk saat klik di luar ──
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (productNameInputRef.current && !productNameInputRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Kalkulasi yang dimemoize ──
    const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
    const remainingAmount = useMemo(() => (cleanRupiah(sellingPrice) || 0) - totalPaid, [sellingPrice, totalPaid]);
    const isPaymentValid = useMemo(() => {
        const price = cleanRupiah(sellingPrice) || 0;
        return price === totalPaid;
    }, [sellingPrice, totalPaid]);

    // ── Produk yang sudah difilter — hanya dihitung ulang saat productName atau productMaster berubah ──
    const filteredProducts = useMemo(
        () => productMaster.filter(p => p.name.toLowerCase().includes(productName.toLowerCase())),
        [productMaster, productName]
    );

    // ── Handler harga — referensi stabil, tidak perlu dependency ──
    const handleSellingPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSellingPrice(formatRupiah(e.target.value.replace(/[^0-9]/g, '')));
    }, []);

    const handleCostPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCostPrice(formatRupiah(e.target.value.replace(/[^0-9]/g, '')));
    }, []);

    // ── Handler payments — gunakan functional update agar tidak perlu [payments] sebagai dep ──
    const handlePaymentAmountChange = useCallback((index: number, value: string) => {
        const cleanedValue = value.replace(/[^0-9]/g, '');
        setPayments(prev => prev.map((p, i) =>
            i === index ? { ...p, amount: cleanRupiah(cleanedValue) } : p
        ));
    }, []);

    const handlePaymentMethodChange = useCallback((index: number, value: string) => {
        setPayments(prev => prev.map((p, i) => {
            if (i !== index) return p;
            if (value === 'Hutang') return { ...p, method: 'Hutang', cardId: undefined, debtorName: '' };
            const card = financialCards.find(c => c.id === value);
            if (card) return { ...p, method: card.name, cardId: card.id, debtorName: undefined };
            return p;
        }));
    }, [financialCards]);

    const handleDebtorNameChange = useCallback((index: number, value: string) => {
        setPayments(prev => prev.map((p, i) =>
            i === index ? { ...p, debtorName: value } : p
        ));
    }, []);

    const addPayment = useCallback(() => {
        setPayments(prev => {
            const remaining = (cleanRupiah(sellingPrice) || 0) - prev.reduce((acc, p) => acc + p.amount, 0);
            return [...prev, { method: '', cardId: '', amount: remaining > 0 ? remaining : 0, debtorName: '' }];
        });
    }, [sellingPrice]);

    const removePayment = useCallback((index: number) => {
        setPayments(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleProductSelect = useCallback((product: ProductMaster) => {
        setProductName(product.name);
        const newSellingPrice = formatRupiah(String(product.sellingPrice || ''));
        setSellingPrice(newSellingPrice);
        setCostPrice(formatRupiah(String(product.costPrice || '')));
        setSelectedProductId(product.id);
        setShowSuggestions(false);
        setPayments([{ method: '', cardId: '', amount: cleanRupiah(newSellingPrice), debtorName: '' }]);
    }, []);

    // ── Update harga produk master jika berubah ──
    const updateMasterProduct = useCallback(async (productId: string, newSellingPrice: number, newCostPrice: number) => {
        const productInMaster = productMaster.find(p => p.id === productId);
        if (!productInMaster) return;
        if (newSellingPrice !== productInMaster.sellingPrice || newCostPrice !== productInMaster.costPrice) {
            await update(ref(db, `produk_master/${productId}`), { sellingPrice: newSellingPrice, costPrice: newCostPrice });
            toast({ title: "Data Master Diperbarui", description: `Harga untuk "${productInMaster.name}" telah diupdate.` });
        }
    }, [productMaster, toast]);

    // ── Submit ──
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const price = cleanRupiah(sellingPrice) || 0;
        const cost = cleanRupiah(costPrice) || 0;

        if (!productName || !fundSource) {
            toast({ variant: "destructive", title: "Gagal", description: "Nama Produk dan Sumber Modal wajib diisi." });
            return;
        }
        if (!isPaymentValid) {
            toast({ variant: "destructive", title: "Gagal", description: "Total pembayaran tidak sesuai dengan harga jual." });
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

        const transactionData = {
            datetime, customerId: customerId || '', productName,
            sellingPrice: price, costPrice: cost,
            fundSource: fundSourceCard.name, fundSourceId: fundSourceCard.id,
            payments: payments.map(({ amount, method, cardId, debtorName }) => {
                const d: any = { amount, method };
                if (cardId) d.cardId = cardId;
                if (debtorName) d.debtorName = debtorName;
                return d;
            }),
            isDeleted: false,
        };

        let promise: Promise<void>;
        if (editingTransaction) {
            promise = update(ref(db, `transaksi_reguler/${editingTransaction.id}`), transactionData);
        } else {
            const newRef = push(ref(db, 'transaksi_reguler'));
            promise = update(newRef, { ...transactionData, createdAt: serverTimestamp() });
            const transactionId = newRef.key;
            if (transactionId) {
                payments.forEach(payment => {
                    if (payment.method === 'Hutang' && payment.amount > 0) {
                        push(ref(db, 'hutang'), {
                            nama: payment.debtorName, productName, nominal: payment.amount,
                            tanggal: datetime, status: 'Belum Lunas', transactionId,
                            sourcePath: 'transaksi_reguler', isDeleted: false,
                        });
                    }
                });
            }
        }

        promise.then(() => {
            if (selectedProductId) updateMasterProduct(selectedProductId, price, cost);
            toast({ title: "Sukses", description: `Transaksi berhasil ${editingTransaction ? 'diperbarui' : 'disimpan'}.` });
            onSuccess();
        }).catch(error => {
            toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
        }).finally(() => {
            setIsSubmitting(false);
        });
    }, [
        datetime, customerId, productName, sellingPrice, costPrice, fundSource,
        payments, isPaymentValid, editingTransaction, financialCards, selectedProductId,
        toast, updateMasterProduct, onSuccess,
    ]);

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
                        if (!showSuggestions) setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                    required
                    className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
                    />
                    {showSuggestions && filteredProducts.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredProducts.map((product) => (
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
                <Input id="sellingPrice" type="text" placeholder="Harga Jual (Opsional)" value={sellingPrice} onChange={handleSellingPriceChange}
                        className="focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"/>
                </div>
                <div className="space-y-2">
                <Label htmlFor="costPrice">Modal</Label>
                <Input id="costPrice" type="text" placeholder="Modal (Opsional)" value={costPrice} onChange={handleCostPriceChange}
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
                {isSubmitting ? 'Menyimpan...' : (editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi')}
            </Button>
        </CardFooter>
        </form>
    );
});
FormComponent.displayName = 'FormComponent';


// ─────────────────────────────────────────────────────────────────────────────
// Halaman utama — HANYA mengelola: daftar transaksi, data master, dan UI state
// Re-render di sini TIDAK akan memengaruhi FormComponent
// ─────────────────────────────────────────────────────────────────────────────
export default function RegularSalesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Data & UI State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [productMaster, setProductMaster] = useState<ProductMaster[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Editing State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Detail Modal State
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Firebase listeners ──
  useEffect(() => {
    const transactionsRef = ref(db, 'transaksi_reguler');
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransactions: Transaction[] = [];
      for (const key in data) {
        const trxData = data[key];
        if (trxData.isDeleted) continue;
        loadedTransactions.push({ id: key, ...trxData, profit: (trxData.sellingPrice || 0) - (trxData.costPrice || 0) });
      }
      loadedTransactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
                if (!data[key].isDeleted) loadedCards.push({ id: key, ...data[key] });
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

  // ── Handler untuk menutup/reset form ──
  const handleFormSuccess = useCallback(() => {
    setEditingTransaction(null);
    setShowForm(false);
  }, []);

  const handleFormCancel = useCallback(() => {
    setEditingTransaction(null);
    setShowForm(false);
  }, []);

  // ── Handler tabel ──
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
    setShowForm(true);
  };

  const handleDetailClick = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const getPaymentMethodsString = (payments: Payment[] | undefined) => {
    if (!payments || payments.length === 0) return 'Tidak Diketahui';
    if (payments.length === 1) return payments[0].method;
    return `${payments.length} metode`;
  };

  const getDetailData = (trx: Transaction | null) => {
    if (!trx) return [];
    const details: any[] = [
        { label: 'Waktu Transaksi', value: format(parseISO(trx.datetime), "d MMMM yyyy, HH:mm:ss", { locale: id }) },
        { label: 'ID Pelanggan', value: trx.customerId || '-' },
        { label: 'Nama Produk', value: trx.productName },
        { label: 'Harga Jual', value: formatRupiah(trx.sellingPrice) },
        { label: 'Harga Modal', value: formatRupiah(trx.costPrice) },
        { label: 'Laba', value: formatRupiah(trx.profit), badge: trx.profit > 0 ? 'default' : 'destructive' },
        { label: 'Sumber Modal', value: trx.fundSource },
    ];
    trx.payments?.forEach((p, i) => {
        details.push({ label: `Pembayaran ${i+1}${p.method === 'Hutang' ? ` (${p.debtorName})` : ''}`, value: `${p.method} - ${formatRupiah(p.amount)}` });
    });
    return details;
  };

  // Props stabil untuk FormComponent — tidak berubah kecuali data benar-benar berubah
  const formProps = useMemo(() => ({
    financialCards,
    productMaster,
    isLoadingCards,
    isLoadingProducts,
    editingTransaction,
    onSuccess: handleFormSuccess,
    onCancel: handleFormCancel,
  }), [financialCards, productMaster, isLoadingCards, isLoadingProducts, editingTransaction, handleFormSuccess, handleFormCancel]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <AppHeader title="Pulsa, Token, & Paket Data">
        <Button onClick={() => { editingTransaction ? handleFormCancel() : setShowForm(!showForm) }} variant={showForm ? "outline" : "default"} className="hidden md:flex">
            {showForm ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {showForm ? (editingTransaction ? 'Batalkan Edit' : 'Tutup') : 'Tambah Transaksi'}
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
          <Sheet open={showForm} onOpenChange={(isOpen) => { if (!isOpen) handleFormCancel(); else setShowForm(true); }}>
            <SheetContent side="right" className="w-full p-0">
              <SheetHeader className="p-6">
                <SheetTitle>{editingTransaction ? 'Edit Transaksi' : 'Transaksi Baru'}</SheetTitle>
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
                className="p-4 sm:px-6"
              >
                <Card className="rounded-xl shadow-sm w-full">
                  <CardHeader className='flex flex-row items-center justify-between'>
                      <div>
                          <CardTitle>{editingTransaction ? 'Edit Transaksi' : 'Transaksi Baru'}</CardTitle>
                          <CardDescription>Isi detail untuk penjualan Pulsa, Token, dan Paket Data.</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={handleFormCancel}>
                          <X className="h-4 w-4" />
                      </Button>
                  </CardHeader>
                  <FormComponent {...formProps} />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="px-4 pt-0 sm:px-6">
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
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(trx)} className="h-9 w-9"><Edit className="h-4 w-4" /></Button>
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
                            <Button variant="outline" size="icon" onClick={() => handleEditClick(trx)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
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
