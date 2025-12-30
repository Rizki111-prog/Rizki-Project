'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '@/firebase';
import { ref, push, onValue, remove, update, serverTimestamp, runTransaction, query, orderByChild, equalTo, get } from 'firebase/database';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Loader2, Eye, PlusCircle, CalendarDays } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { DetailModal } from '@/components/modals/detail-modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';
import { formatRupiah, cleanRupiah } from '@/lib/utils';


interface Transaction {
  id: string;
  datetime: string;
  customerId: string;
  customerName: string;
  sellingPrice: number;
  costPrice: number;
  fundSource: string;
  fundSourceId?: string;
  payments: Payment[];
  profit: number;
  createdAt: number;
  linkAkunPengelola: string;
  eWalletPengelola: string;
  tanggalKadaluarsa: string;
}

interface FinancialCard {
    id: string;
    name: string;
    balance: number;
}

interface Customer {
    id: string;
    name: string;
}

interface Payment {
  method: string;
  cardId?: string;
  amount: number;
  debtorName?: string;
}

const getThirtyDaysFromDate = (date: Date) => {
    const thirtyDaysFromNow = addDays(date, 30);
    return thirtyDaysFromNow.toISOString().split('T')[0];
}

export default function FamilyPackSalesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Form State
  const [datetime, setDatetime] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [linkAkunPengelola, setLinkAkunPengelola] = useState('');
  const [eWalletPengelola, setEWalletPengelola] = useState('');
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState(getThirtyDaysFromDate(new Date()));

  const [payments, setPayments] = useState<Payment[]>([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
  const [isPaymentAmountManuallySet, setIsPaymentAmountManuallySet] = useState(false);
  const isExpiryDateManuallySet = useRef(false);
  
  // Data & UI State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [akrabCustomers, setAkrabCustomers] = useState<Customer[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerNameInputRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const now = new Date();
    const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    setDatetime(localIsoString.slice(0, 16));
    setTanggalKadaluarsa(getThirtyDaysFromDate(now));
  }, []);
  
  useEffect(() => {
    if (datetime && !isExpiryDateManuallySet.current) {
        const transactionDate = new Date(datetime);
        setTanggalKadaluarsa(getThirtyDaysFromDate(transactionDate));
    }
  }, [datetime]);

  useEffect(() => {
    const transactionsRef = ref(db, 'transaksi_akrab');
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

        const agenPulsaCard = loadedCards.find(card => card.name === 'Agen Pulsa');
        if (agenPulsaCard) {
            setFundSource(agenPulsaCard.id);
        } else if (loadedCards.length > 0) {
            setFundSource(loadedCards[0].id);
        }

    }, (error) => {
        console.error("Firebase read failed: " + error.message);
        setIsLoadingCards(false);
    });

    const customersRef = ref(db, 'pelanggan_akrab');
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
        const data = snapshot.val();
        const loadedCustomers: Customer[] = [];
        if (data) {
            for (const key in data) {
                loadedCustomers.push({ id: key, ...data[key] });
            }
        }
        setAkrabCustomers(loadedCustomers);
        setIsLoadingCustomers(false);
    });

    return () => {
        unsubscribeCards();
        unsubscribeCustomers();
    };
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (customerNameInputRef.current && !customerNameInputRef.current.contains(event.target as Node)) {
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

    const price = cleanRupiah(sellingPrice);
    
    if (payments.length === 1 && !isPaymentAmountManuallySet) {
        const newPayments = [...payments];
        const cashCard = financialCards.find(c => c.name.toLowerCase() === 'tunai');
        const defaultCard = cashCard || financialCards[0];

        if (price > 0) {
            newPayments[0].amount = price;
        } else {
            newPayments[0].amount = 0;
        }

        if (defaultCard) {
            newPayments[0].method = defaultCard.name;
            newPayments[0].cardId = defaultCard.id;
        }
        setPayments(newPayments);
    }
  }, [sellingPrice, financialCards, isPaymentAmountManuallySet, payments.length, isLoadingCards]);

  const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setter(formatRupiah(cleanedValue));
    if (setter === setSellingPrice) setIsPaymentAmountManuallySet(false);
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
  
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTanggalKadaluarsa(e.target.value);
    isExpiryDateManuallySet.current = true;
  }
  
  const handleDatetimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDatetime(e.target.value);
    isExpiryDateManuallySet.current = false;
  }

  const addPayment = () => {
      setIsPaymentAmountManuallySet(true); 
      const remaining = cleanRupiah(sellingPrice) - payments.reduce((acc, p) => acc + p.amount, 0);
      setPayments([...payments, { method: '', cardId: '', amount: remaining > 0 ? remaining : 0, debtorName: '' }]);
  };

  const removePayment = (index: number) => {
      const newPayments = payments.filter((_, i) => i !== index);
      setPayments(newPayments);
      if (newPayments.length === 1) setIsPaymentAmountManuallySet(false);
  };
  
  const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const remainingAmount = useMemo(() => cleanRupiah(sellingPrice) - totalPaid, [sellingPrice, totalPaid]);
  const isPaymentValid = useMemo(() => remainingAmount === 0 && cleanRupiah(sellingPrice) > 0, [remainingAmount, sellingPrice]);

  const resetForm = useCallback(() => {
    setCustomerId('');
    setCustomerName('');
    setSellingPrice('');
    setCostPrice('');
    setLinkAkunPengelola('');
    setEWalletPengelola('');
    setPayments([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
    setIsPaymentAmountManuallySet(false);
    isExpiryDateManuallySet.current = false;
    
    const now = new Date();
    const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    setDatetime(localIsoString.slice(0, 16));
    setTanggalKadaluarsa(getThirtyDaysFromDate(now));

    const agenPulsaCard = financialCards.find(card => card.name === 'Agen Pulsa');
    if (agenPulsaCard) {
      setFundSource(agenPulsaCard.id);
    } else if (financialCards.length > 0) {
      setFundSource(financialCards[0].id);
    } else {
      setFundSource('');
    }
  }, [financialCards]);
  
  const handleCustomerSelect = (customer: Customer) => {
      setCustomerName(customer.name);
      setShowSuggestions(false);
  }

  const saveToCustomerMaster = useCallback(async (name: string) => {
    const customersRef = query(ref(db, 'pelanggan_akrab'), orderByChild('name'), equalTo(name));
    const snapshot = await get(customersRef);
    if (!snapshot.exists()) {
        const newCustomerRef = push(ref(db, 'pelanggan_akrab'));
        update(newCustomerRef, { name });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !sellingPrice || !costPrice || !fundSource || !linkAkunPengelola || !eWalletPengelola) {
      toast({ variant: "destructive", title: "Gagal", description: "Harap isi semua field yang wajib diisi." });
      return;
    }
    
    if (!isPaymentValid) {
        toast({ variant: "destructive", title: "Gagal", description: "Total pembayaran tidak sesuai dengan harga jual."});
        return;
    }

    if (payments.some(p => !p.method || (p.method === 'Hutang' && !p.debtorName))) {
        toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua detail pembayaran."});
        return;
    }

    setIsSubmitting(true);

    const cost = cleanRupiah(costPrice);
    const price = cleanRupiah(sellingPrice);
    const fundSourceCard = financialCards.find(c => c.id === fundSource);
    
    if (!fundSourceCard) {
        toast({ variant: "destructive", title: "Gagal", description: "Sumber dana tidak valid." });
        setIsSubmitting(false);
        return;
    }
    
    const newTransaction = {
      datetime,
      customerId: customerId || '',
      customerName,
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
      linkAkunPengelola,
      eWalletPengelola,
      tanggalKadaluarsa,
      createdAt: serverTimestamp()
    };

    const transactionsRef = ref(db, 'transaksi_akrab');
    const newTransactionRef = push(transactionsRef);
    
    update(newTransactionRef, newTransaction)
      .then(() => {
        const transactionId = newTransactionRef.key;

        saveToCustomerMaster(customerName);

        const fundSourceRef = ref(db, `keuangan/cards/${fundSourceCard.id}`);
        runTransaction(fundSourceRef, (card) => {
            if (card) { card.balance -= cost; }
            return card;
        });

        payments.forEach(payment => {
            if(payment.method === 'Hutang' && transactionId) {
                push(ref(db, 'hutang'), {
                    nama: payment.debtorName,
                    nominal: payment.amount,
                    tanggal: datetime,
                    status: 'Belum Lunas',
                    transactionId: transactionId
                });
            } else if (payment.cardId) {
                const paymentMethodRef = ref(db, `keuangan/cards/${payment.cardId}`);
                runTransaction(paymentMethodRef, (card) => {
                    if (card) { card.balance += payment.amount; }
                    return card;
                });
            }
        });

        toast({ title: "Sukses", description: "Transaksi Paket Akrab berhasil disimpan." });
        resetForm();
      })
      .catch((error) => {
        toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDelete = (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    const cost = Number(transactionToDelete.costPrice);
    const fundSourceCardId = transactionToDelete.fundSourceId;

    remove(ref(db, `transaksi_akrab/${id}`))
      .then(() => {
        if(fundSourceCardId){
            const fundSourceRef = ref(db, `keuangan/cards/${fundSourceCardId}`);
            runTransaction(fundSourceRef, (card) => {
                if (card) { card.balance += cost; }
                return card;
            });
        }
        
        transactionToDelete.payments?.forEach(payment => {
            if (payment.cardId) {
                const paymentMethodRef = ref(db, `keuangan/cards/${payment.cardId}`);
                runTransaction(paymentMethodRef, (card) => {
                    if (card) { card.balance -= payment.amount; }
                    return card;
                });
            }
        });

        get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(id))).then(snapshot => {
            if(snapshot.exists()) { snapshot.forEach(child => remove(child.ref)); }
        });

        toast({ title: "Sukses", description: "Transaksi berhasil dihapus." });
      })
      .catch((error) => {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: `Terjadi kesalahan: ${error.message}` });
      });
  };

  const handleDetailClick = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const getPaymentMethodsString = (payments: Payment[] | undefined) => {
    if (!payments || payments.length === 0) return 'Tidak Diketahui';
    if (payments.length === 1) return payments[0].method;
    return `${payments.length} metode`;
  }
  
  const getDaysRemaining = (expiryDate: string) => {
    if (!expiryDate) return { text: 'N/A', color: 'secondary' };
    const remaining = differenceInDays(parseISO(expiryDate), startOfDay(new Date()));
    if (remaining < 0) return { text: 'Kadaluarsa', color: 'destructive' };
    if (remaining <= 7) return { text: `${remaining} hari lagi`, color: 'destructive' };
    return { text: `${remaining} hari`, color: 'default' };
  }

  const getDetailData = (trx: Transaction | null) => {
    if (!trx) return [];
    let details = [
        { label: 'Waktu Transaksi', value: format(parseISO(trx.datetime), "d MMMM yyyy, HH:mm:ss", { locale: id }) },
        { label: 'Nama Pelanggan', value: trx.customerName },
        { label: 'ID Pelanggan', value: trx.customerId || '-' },
        { label: 'Link Akun Pengelola', value: trx.linkAkunPengelola },
        { label: 'E-Wallet Pengelola', value: trx.eWalletPengelola },
        { label: 'Tanggal Kadaluarsa', value: format(parseISO(trx.tanggalKadaluarsa), "d MMMM yyyy", { locale: id }) },
        { label: 'Sisa Masa Aktif', value: getDaysRemaining(trx.tanggalKadaluarsa).text, badge: getDaysRemaining(trx.tanggalKadaluarsa).color as any },
        { label: 'Harga Jual', value: `Rp ${trx.sellingPrice.toLocaleString('id-ID')}` },
        { label: 'Harga Modal', value: `Rp ${trx.costPrice.toLocaleString('id-ID')}` },
        { label: 'Laba', value: `Rp ${trx.profit.toLocaleString('id-ID')}`, badge: trx.profit > 0 ? 'default' : 'destructive' },
        { label: 'Sumber Modal', value: trx.fundSource },
    ];
    trx.payments?.forEach((p, i) => {
        const paymentLabel = `Pembayaran ${i+1}${p.method === 'Hutang' ? ` (${p.debtorName})` : ''}`;
        const paymentValue = `${p.method} - Rp ${p.amount.toLocaleString('id-ID')}`;
        details.push({ label: paymentLabel, value: paymentValue });
    })
    return details;
  };
  

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl">Paket Akrab</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Proses transaksi baru untuk Paket Akrab.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <Card className="rounded-xl shadow-sm w-full">
          <CardHeader>
            <CardTitle>Transaksi Baru Paket Akrab</CardTitle>
            <CardDescription>Isi detail transaksi untuk penjualan Paket Akrab.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="datetime">Tanggal & Waktu</Label>
                  <Input id="datetime" type="datetime-local" value={datetime} onChange={handleDatetimeChange} required />
                </div>
                <div className="space-y-2 relative md:col-span-2 lg:col-span-1" ref={customerNameInputRef}>
                    <Label htmlFor="customerName">Nama Pelanggan</Label>
                    <Input 
                      id="customerName"
                      placeholder={isLoadingCustomers ? "Memuat pelanggan..." : "Ketik nama pelanggan"}
                      value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      autoComplete="off"
                      required
                    />
                    {showSuggestions && akrabCustomers.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {akrabCustomers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).map((customer) => (
                                <div key={customer.id} className="p-2 hover:bg-accent cursor-pointer text-sm" onClick={() => handleCustomerSelect(customer)}>
                                    {customer.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="customerId">Nomor HP / ID Pelanggan</Label>
                  <Input id="customerId" placeholder="ID Pelanggan (Opsional)" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Harga Jual</Label>
                  <Input id="sellingPrice" type="text" placeholder="0" value={sellingPrice} onChange={handlePriceChange(setSellingPrice)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Modal</Label>
                  <Input id="costPrice" type="text" placeholder="0" value={costPrice} onChange={handlePriceChange(setCostPrice)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundSource">Sumber Modal</Label>
                   <Select value={fundSource} onValueChange={setFundSource} required>
                    <SelectTrigger><SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih sumber modal"} /></SelectTrigger>
                    <SelectContent>
                        {financialCards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkAkunPengelola">Link Akun Pengelola</Label>
                  <Input id="linkAkunPengelola" placeholder="https://..." value={linkAkunPengelola} onChange={(e) => setLinkAkunPengelola(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eWalletPengelola">E-Wallet Pengelola</Label>
                  <Input id="eWalletPengelola" placeholder="08... (DANA)" value={eWalletPengelola} onChange={(e) => setEWalletPengelola(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tanggalKadaluarsa">Tanggal Kadaluarsa</Label>
                    <div className="relative">
                       <Input id="tanggalKadaluarsa" type="date" value={tanggalKadaluarsa} onChange={handleExpiryDateChange} required />
                       <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
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
                                    <SelectTrigger id={`payment-method-${index}`} className="bg-background"><SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih metode"} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Hutang">Hutang</SelectItem>
                                        {financialCards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {payment.method === 'Hutang' && (
                                <div className="space-y-2 col-span-12 md:col-span-3">
                                    <Label htmlFor={`debtor-name-${index}`}>Nama Penghutang</Label>
                                    <Input id={`debtor-name-${index}`} placeholder="Masukkan nama" value={payment.debtorName || ''} onChange={(e) => handleDebtorNameChange(index, e.target.value)} required className="bg-background" />
                                </div>
                            )}
                            <div className={`space-y-2 col-span-12 ${payment.method === 'Hutang' ? 'md:col-span-3' : 'md:col-span-6'}`}>
                                <Label htmlFor={`payment-amount-${index}`}>Nominal</Label>
                                <Input id={`payment-amount-${index}`} type="text" placeholder="0" value={formatRupiah(payment.amount)} onChange={(e) => handlePaymentAmountChange(index, e.target.value)} required className="bg-background" />
                            </div>
                            {payments.length > 1 && (
                                <div className="col-span-12 md:col-span-1 flex items-end justify-end md:justify-center">
                                    <Button variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
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
              <Button type="submit" disabled={isSubmitting || isLoadingCards || isLoadingCustomers || !isPaymentValid} className="transition-all duration-300 hover:scale-105 w-full md:w-auto">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="rounded-xl shadow-sm w-full">
          <CardHeader>
            <CardTitle>Riwayat Transaksi Paket Akrab</CardTitle>
            <CardDescription>Daftar semua transaksi Paket Akrab yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="md:hidden space-y-4">
              {transactions.map((trx) => (
                <Card key={trx.id} className="rounded-lg border w-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{trx.customerName}</CardTitle>
                            <CardDescription>{trx.customerId || 'Tanpa ID'}</CardDescription>
                        </div>
                        <Badge variant={getDaysRemaining(trx.tanggalKadaluarsa).color as any} className="text-xs">{getDaysRemaining(trx.tanggalKadaluarsa).text}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pb-3">
                    <div className="flex justify-between"><span>Waktu:</span> <span className="font-medium text-right">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</span></div>
                    <div className="flex justify-between"><span>Harga Jual:</span> <span className="font-medium">Rp {trx.sellingPrice.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between"><span>Laba:</span> <span className="font-medium"><Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="text-xs">Rp {trx.profit.toLocaleString('id-ID')}</Badge></span></div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-9 w-9"><Eye className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus transaksi secara permanen. Anda yakin?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(trx.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
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
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Pelanggan</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Harga</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Laba</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Pembayaran</th>
                    <th className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">Masa Aktif</th>
                    <th className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.customerName}</td>
                      <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">Rp {trx.sellingPrice.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-sm text-right whitespace-nowrap"><Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="font-semibold">Rp {trx.profit.toLocaleString('id-ID')}</Badge></td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{getPaymentMethodsString(trx.payments)}</td>
                      <td className="px-4 py-4 text-sm text-center whitespace-nowrap"><Badge variant={getDaysRemaining(trx.tanggalKadaluarsa).color as any}>{getDaysRemaining(trx.tanggalKadaluarsa).text}</Badge></td>
                      <td className="px-4 py-4 text-center space-x-1 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Ini akan menghapus transaksi secara permanen.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(trx.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
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

        <DetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title="Detail Transaksi Paket Akrab"
            data={getDetailData(detailTransaction)}
        />
      </main>
    </div>
  );
}
