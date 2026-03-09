
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
import { Trash2, Edit, Loader2, Eye, PlusCircle, CalendarDays, X, Search } from 'lucide-react';
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
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { DetailModal } from '@/components/modals/detail-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatRupiah, cleanRupiah } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Transaction {
  id: string;
  datetime: string;
  customerId: string;
  customerName: string;
  sellingPrice: number;
  costPrice: number;
  fundSources: FundSource[];
  payments: Payment[];
  profit: number;
  createdAt: number;
  linkAkunPengelola?: string;
  eWalletPengelola?: string;
  tanggalKadaluarsa: string;
  isDeleted?: boolean;
}

interface FinancialCard {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  nomor_hp: string;
}

interface Payment {
  method: string;
  cardId?: string;
  amount: number;
  debtorName?: string;
}

interface FundSource {
  cardId: string;
  cardName: string;
  amount: number;
}

const getThirtyDaysFromDate = (date: Date) => {
  const thirtyDaysFromNow = addDays(date, 29);
  return thirtyDaysFromNow.toISOString().split('T')[0];
};

const getDefaultDatetime = () => {
  const now = new Date();
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

// ─────────────────────────────────────────────────────────────────────────────
// FormComponent — sepenuhnya mengelola state-nya sendiri.
// Re-render pada komponen induk TIDAK akan memengaruhi form ini.
// ─────────────────────────────────────────────────────────────────────────────
interface FormComponentProps {
  financialCards: FinancialCard[];
  akrabCustomers: Customer[];
  isLoadingCards: boolean;
  isLoadingCustomers: boolean;
  editingTransaction: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const FormComponent: React.FC<FormComponentProps> = React.memo(({
  financialCards,
  akrabCustomers,
  isLoadingCards,
  isLoadingCustomers,
  editingTransaction,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const isExpiryDateManuallySet = useRef(false);

  // ── State form — terisolasi di dalam komponen ini ──
  const [datetime, setDatetime] = useState(getDefaultDatetime);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [linkAkunPengelola, setLinkAkunPengelola] = useState('');
  const [eWalletPengelola, setEWalletPengelola] = useState('');
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState(() => getThirtyDaysFromDate(new Date()));
  const [payments, setPayments] = useState<Payment[]>([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
  const [fundSources, setFundSources] = useState<FundSource[]>([{ cardId: '', cardName: '', amount: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerNameInputRef = useRef<HTMLDivElement>(null);

  // ── Saat editingTransaction berubah, isi ulang atau reset form ──
  useEffect(() => {
    if (editingTransaction) {
      setDatetime(editingTransaction.datetime);
      setCustomerId(editingTransaction.customerId);
      setCustomerName(editingTransaction.customerName);
      setSellingPrice(formatRupiah(editingTransaction.sellingPrice));
      setCostPrice(formatRupiah(editingTransaction.costPrice));
      setLinkAkunPengelola(editingTransaction.linkAkunPengelola || '');
      setEWalletPengelola(editingTransaction.eWalletPengelola || '');
      setTanggalKadaluarsa(editingTransaction.tanggalKadaluarsa);
      setPayments(editingTransaction.payments);
      setFundSources(editingTransaction.fundSources);
      isExpiryDateManuallySet.current = true;
    } else {
      const now = new Date();
      setDatetime(getDefaultDatetime());
      setCustomerId('');
      setCustomerName('');
      setSellingPrice('');
      setCostPrice('');
      setLinkAkunPengelola('');
      setEWalletPengelola('');
      setTanggalKadaluarsa(getThirtyDaysFromDate(now));
      setPayments([{ method: '', cardId: '', amount: 0, debtorName: '' }]);
      setFundSources([{ cardId: '', cardName: '', amount: 0 }]);
      isExpiryDateManuallySet.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTransaction]);

  // ── Tutup dropdown pelanggan saat klik di luar ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerNameInputRef.current && !customerNameInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Kalkulasi yang dimemoize ──
  const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const remainingAmount = useMemo(() => (cleanRupiah(sellingPrice) || 0) - totalPaid, [sellingPrice, totalPaid]);
  const isPaymentValid = useMemo(() => remainingAmount === 0, [remainingAmount]);

  const totalFundSourceAmount = useMemo(() => fundSources.reduce((acc, fs) => acc + fs.amount, 0), [fundSources]);
  const remainingFundSourceAmount = useMemo(() => (cleanRupiah(costPrice) || 0) - totalFundSourceAmount, [costPrice, totalFundSourceAmount]);
  const isFundSourceValid = useMemo(() => remainingFundSourceAmount === 0, [remainingFundSourceAmount]);

  // ── Filter pelanggan — hanya dihitung ulang saat customerName atau akrabCustomers berubah ──
  const filteredCustomers = useMemo(
    () => akrabCustomers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())),
    [akrabCustomers, customerName]
  );

  // ── Handler tanggal ──
  const handleDatetimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDatetime(e.target.value);
    if (e.target.value && !isExpiryDateManuallySet.current) {
      setTanggalKadaluarsa(getThirtyDaysFromDate(new Date(e.target.value)));
    }
  }, []);

  const handleExpiryDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTanggalKadaluarsa(e.target.value);
    isExpiryDateManuallySet.current = true;
  }, []);

  // ── Handler harga — referensi stabil ──
  const handleSellingPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSellingPrice(formatRupiah(e.target.value.replace(/[^0-9]/g, '')));
  }, []);

  const handleCostPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCostPrice(formatRupiah(e.target.value.replace(/[^0-9]/g, '')));
  }, []);

  // ── Handler pelanggan ──
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerId(customer.nomor_hp || '');
    setShowSuggestions(false);
  }, []);

  // ── Handler fund sources — functional update tanpa dependency [fundSources] ──
  const handleFundSourceCardChange = useCallback((index: number, value: string) => {
    setFundSources(prev => prev.map((fs, i) => {
      if (i !== index) return fs;
      const card = financialCards.find(c => c.id === value);
      return card ? { ...fs, cardId: card.id, cardName: card.name } : fs;
    }));
  }, [financialCards]);

  const handleFundSourceAmountChange = useCallback((index: number, value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setFundSources(prev => prev.map((fs, i) =>
      i === index ? { ...fs, amount: cleanRupiah(cleanedValue) } : fs
    ));
  }, []);

  const removeFundSource = useCallback((index: number) => {
    setFundSources(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addFundSource = useCallback(() => {
    setFundSources(prev => {
      const remaining = (cleanRupiah(costPrice) || 0) - prev.reduce((acc, fs) => acc + fs.amount, 0);
      return [...prev, { cardId: '', cardName: '', amount: remaining > 0 ? remaining : 0 }];
    });
  }, [costPrice]);

  // ── Handler payments — functional update tanpa dependency [payments] ──
  const handlePaymentMethodChange = useCallback((index: number, value: string) => {
    setPayments(prev => prev.map((p, i) => {
      if (i !== index) return p;
      if (value === 'Hutang') return { ...p, method: 'Hutang', cardId: undefined, debtorName: customerName };
      const card = financialCards.find(c => c.id === value);
      if (card) return { ...p, method: card.name, cardId: card.id, debtorName: undefined };
      return p;
    }));
  }, [financialCards, customerName]);

  const handlePaymentAmountChange = useCallback((index: number, value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setPayments(prev => prev.map((p, i) =>
      i === index ? { ...p, amount: cleanRupiah(cleanedValue) } : p
    ));
  }, []);

  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addPayment = useCallback(() => {
    setPayments(prev => {
      const remaining = (cleanRupiah(sellingPrice) || 0) - prev.reduce((acc, p) => acc + p.amount, 0);
      return [...prev, { method: '', cardId: '', amount: remaining > 0 ? remaining : 0, debtorName: '' }];
    });
  }, [sellingPrice]);

  // ── Simpan ke master pelanggan jika belum ada ──
  const saveToCustomerMaster = useCallback(async (name: string, phoneId: string) => {
    if (!name.trim()) return;
    const snapshot = await get(query(ref(db, 'pelanggan_akrab'), orderByChild('name'), equalTo(name)));
    if (!snapshot.exists()) {
      const newRef = push(ref(db, 'pelanggan_akrab'));
      update(newRef, { name, nomor_hp: phoneId || '' });
    }
  }, []);

  // ── Submit ──
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const price = cleanRupiah(sellingPrice) || 0;

    if (!customerName) {
      toast({ variant: "destructive", title: "Gagal", description: "Nama Pelanggan wajib diisi." });
      return;
    }
    if (!isPaymentValid) {
      toast({ variant: "destructive", title: "Gagal", description: "Total pembayaran tidak sesuai dengan harga jual." });
      return;
    }
    if (!isFundSourceValid) {
      toast({ variant: "destructive", title: "Gagal", description: "Total sumber modal tidak sesuai dengan harga modal." });
      return;
    }
    if (payments.some(p => !p.method)) {
      toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua detail pembayaran." });
      return;
    }
    if (fundSources.some(fs => !fs.cardId)) {
      toast({ variant: "destructive", title: "Gagal", description: "Harap lengkapi semua detail sumber modal." });
      return;
    }

    setIsSubmitting(true);

    const transactionData = {
      datetime, customerId: customerId || '', customerName, sellingPrice: price,
      payments: payments.map(({ amount, method, cardId, debtorName }) => {
        const d: any = { amount, method };
        if (cardId) d.cardId = cardId;
        if (method === 'Hutang') d.debtorName = customerName;
        return d;
      }),
      fundSources: fundSources.map(({ amount, cardId, cardName }) => ({ amount, cardId, cardName })),
      linkAkunPengelola: linkAkunPengelola || '',
      eWalletPengelola: eWalletPengelola || '',
      tanggalKadaluarsa,
      isDeleted: false,
    };

    let promise: Promise<void>;
    if (editingTransaction) {
      promise = update(ref(db, `transaksi_akrab/${editingTransaction.id}`), transactionData);
    } else {
      const newRef = push(ref(db, 'transaksi_akrab'));
      promise = update(newRef, { ...transactionData, createdAt: serverTimestamp() });
      const transactionId = newRef.key;
      if (transactionId) {
        payments.forEach(payment => {
          if (payment.method === 'Hutang' && payment.amount > 0) {
            push(ref(db, 'hutang'), {
              nama: customerName,
              productName: `Paket Akrab: ${customerName}`,
              nominal: payment.amount, tanggal: datetime,
              status: 'Belum Lunas', transactionId,
              sourcePath: 'transaksi_akrab', isDeleted: false,
            });
          }
        });
      }
    }

    promise.then(() => {
      saveToCustomerMaster(customerName, customerId);
      toast({ title: "Sukses", description: `Transaksi berhasil ${editingTransaction ? 'diperbarui' : 'disimpan'}.` });
      onSuccess();
    }).catch(error => {
      toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
    }).finally(() => {
      setIsSubmitting(false);
    });
  }, [
    datetime, customerId, customerName, sellingPrice, payments, fundSources,
    linkAkunPengelola, eWalletPengelola, tanggalKadaluarsa, editingTransaction,
    isPaymentValid, isFundSourceValid, saveToCustomerMaster, toast, onSuccess,
  ]);

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="datetime">Tanggal &amp; Waktu</Label>
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
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-2 hover:bg-accent cursor-pointer text-sm" onClick={() => handleCustomerSelect(customer)}>
                    {customer.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerId">Nomor HP / ID Pelanggan</Label>
            <Input id="customerId" placeholder="ID Pelanggan (Otomatis)" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Harga Jual</Label>
            <Input id="sellingPrice" type="text" placeholder="Harga Jual (Opsional)" value={sellingPrice} onChange={handleSellingPriceChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costPrice">Modal</Label>
            <Input id="costPrice" type="text" placeholder="Modal (Opsional)" value={costPrice} onChange={handleCostPriceChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkAkunPengelola">Link Akun Pengelola</Label>
            <Input id="linkAkunPengelola" placeholder="Link Akun (Opsional)" value={linkAkunPengelola} onChange={(e) => setLinkAkunPengelola(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eWalletPengelola">E-Wallet Pengelola</Label>
            <Input id="eWalletPengelola" placeholder="E-Wallet (Opsional)" value={eWalletPengelola} onChange={(e) => setEWalletPengelola(e.target.value)} />
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
          <h3 className="text-md font-medium mb-2">Sumber Modal</h3>
          <div className="space-y-4">
            {fundSources.map((source, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/20 relative">
                <div className="space-y-2 col-span-12 md:col-span-7">
                  <Label htmlFor={`fund-source-card-${index}`}>Akun Modal</Label>
                  <Select value={source.cardId} onValueChange={(value) => handleFundSourceCardChange(index, value)} required>
                    <SelectTrigger id={`fund-source-card-${index}`} className="bg-background"><SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih akun"} /></SelectTrigger>
                    <SelectContent>
                      {financialCards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-12 md:col-span-4">
                  <Label htmlFor={`fund-source-amount-${index}`}>Nominal</Label>
                  <Input id={`fund-source-amount-${index}`} type="text" placeholder="0" value={formatRupiah(source.amount)} onChange={(e) => handleFundSourceAmountChange(index, e.target.value)} required className="bg-background" />
                </div>
                {fundSources.length > 1 && (
                  <div className="col-span-12 md:col-span-1 flex items-end justify-end md:justify-center">
                    <Button variant="ghost" size="icon" onClick={() => removeFundSource(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4">
              <Button type="button" variant="outline" size="sm" onClick={addFundSource} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Sumber Modal</Button>
              <div className="text-right w-full md:w-auto">
                <p>Total Modal Terinput: <span className="font-bold">{formatRupiah(totalFundSourceAmount)}</span></p>
                <p className={remainingFundSourceAmount !== 0 ? 'text-destructive' : 'text-emerald-600'}>
                  {remainingFundSourceAmount > 0 ? `Sisa: ${formatRupiah(remainingFundSourceAmount)}` : remainingFundSourceAmount < 0 ? `Kelebihan: ${formatRupiah(Math.abs(remainingFundSourceAmount))}` : 'Modal Sesuai'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <h3 className="text-md font-medium mb-2">Metode Pembayaran</h3>
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/20 relative">
                <div className="space-y-2 col-span-12 md:col-span-7">
                  <Label htmlFor={`payment-method-${index}`}>Metode</Label>
                  <Select value={payment.cardId || (payment.method === 'Hutang' ? 'Hutang' : '')} onValueChange={(value) => handlePaymentMethodChange(index, value)} required>
                    <SelectTrigger id={`payment-method-${index}`} className="bg-background"><SelectValue placeholder={isLoadingCards ? "Memuat..." : "Pilih metode"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hutang">Hutang</SelectItem>
                      {financialCards.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-12 md:col-span-4">
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
                  {remainingAmount > 0 ? `Sisa: ${formatRupiah(remainingAmount)}` : remainingAmount < 0 ? `Kelebihan: ${formatRupiah(Math.abs(remainingAmount))}` : 'Lunas'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button type="submit" disabled={isSubmitting || isLoadingCards || isLoadingCustomers || !isPaymentValid || !isFundSourceValid} className="transition-all duration-300 hover:scale-105 w-full md:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Menyimpan...' : (editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi')}
        </Button>
      </CardFooter>
    </form>
  );
});
FormComponent.displayName = 'FormComponent';

// ─────────────────────────────────────────────────────────────────────────────
// Halaman utama — HANYA mengelola: daftar transaksi, data master, dan UI state
// ─────────────────────────────────────────────────────────────────────────────
export default function FamilyPackSalesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Data & UI State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialCards, setFinancialCards] = useState<FinancialCard[]>([]);
  const [akrabCustomers, setAkrabCustomers] = useState<Customer[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Editing & Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>('');

  // ── Firebase listeners ──
  useEffect(() => {
    const transactionsRef = ref(db, 'transaksi_akrab');
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransactions: Transaction[] = [];
      for (const key in data) {
        const trxData = data[key];
        if (trxData.isDeleted) continue;
        const sellingPrice = trxData.sellingPrice || 0;
        const costPrice = (trxData.fundSources || []).reduce((acc: number, src: { amount: number }) => acc + (src.amount || 0), 0);
        loadedTransactions.push({ id: key, ...trxData, costPrice, profit: sellingPrice - costPrice });
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

  // ── Handler form ──
  const handleFormSuccess = useCallback(() => {
    setEditingTransaction(null);
    setShowForm(false);
  }, []);

  const handleFormCancel = useCallback(() => {
    setEditingTransaction(null);
    setShowForm(false);
  }, []);

  // ── Handler tabel ──
  const handleEdit = (trx: Transaction) => {
    setEditingTransaction(trx);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updates: { [key: string]: any } = {};
    const deletedAt = serverTimestamp();
    updates[`/transaksi_akrab/${id}/isDeleted`] = true;
    updates[`/transaksi_akrab/${id}/deletedAt`] = deletedAt;

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

  const handleDetailClick = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(trx => {
      const isSearchMatch = searchTerm
        ? trx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trx.customerId && trx.customerId.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const isDateMatch = selectedDate
        ? format(parseISO(trx.datetime), 'yyyy-MM-dd') === selectedDate
        : true;
      return isSearchMatch && isDateMatch;
    });
  }, [transactions, searchTerm, selectedDate]);

  const getPaymentMethodsString = (payments: Payment[] | undefined) => {
    if (!payments || payments.length === 0) return 'Tidak Diketahui';
    if (payments.length === 1) return payments[0].method;
    return `${payments.length} metode`;
  };

  const getDaysRemaining = (expiryDate: string) => {
    if (!expiryDate) return { text: 'N/A', color: 'secondary' };
    const remaining = differenceInDays(parseISO(expiryDate), startOfDay(new Date()));
    if (remaining < 0) return { text: 'Kadaluarsa', color: 'destructive' };
    if (remaining <= 7) return { text: `${remaining} hari lagi`, color: 'destructive' };
    return { text: `${remaining} hari`, color: 'default' };
  };

  const getDetailData = (trx: Transaction | null) => {
    if (!trx) return [];
    const details: any[] = [
      { label: 'Waktu Transaksi', value: format(parseISO(trx.datetime), "d MMMM yyyy, HH:mm:ss", { locale: id }) },
      { label: 'Nama Pelanggan', value: trx.customerName },
      { label: 'ID Pelanggan', value: trx.customerId || '-' },
      { label: 'Link Akun Pengelola', value: trx.linkAkunPengelola || '-' },
      { label: 'E-Wallet Pengelola', value: trx.eWalletPengelola || '-' },
      { label: 'Tanggal Kadaluarsa', value: format(parseISO(trx.tanggalKadaluarsa), "d MMMM yyyy", { locale: id }) },
      { label: 'Sisa Masa Aktif', value: getDaysRemaining(trx.tanggalKadaluarsa).text, badge: getDaysRemaining(trx.tanggalKadaluarsa).color as any },
      { label: 'Harga Jual', value: formatRupiah(trx.sellingPrice) },
      { label: 'Harga Modal', value: formatRupiah(trx.costPrice) },
      { label: 'Laba', value: formatRupiah(trx.profit), badge: trx.profit > 0 ? 'default' : 'destructive' },
    ];
    trx.fundSources?.forEach((fs, i) => {
      details.push({ label: `Sumber Modal ${i + 1}`, value: `${fs.cardName} - ${formatRupiah(fs.amount)}` });
    });
    trx.payments?.forEach((p, i) => {
      details.push({ label: `Pembayaran ${i + 1}${p.method === 'Hutang' ? ` (${p.debtorName})` : ''}`, value: `${p.method} - ${formatRupiah(p.amount)}` });
    });
    return details;
  };

  // Props stabil untuk FormComponent
  const formProps = useMemo(() => ({
    financialCards, akrabCustomers, isLoadingCards, isLoadingCustomers,
    editingTransaction,
    onSuccess: handleFormSuccess,
    onCancel: handleFormCancel,
  }), [financialCards, akrabCustomers, isLoadingCards, isLoadingCustomers, editingTransaction, handleFormSuccess, handleFormCancel]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <AppHeader title="Paket Akrab">
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
                className="px-4 sm:px-6 mb-6"
              >
                <Card className="rounded-xl shadow-sm w-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{editingTransaction ? 'Edit Transaksi' : 'Transaksi Baru'}</CardTitle>
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

        <div className='px-4 sm:px-6 md:mt-0'>
          <Card className="rounded-xl shadow-sm w-full">
            <CardHeader>
              <CardTitle>Riwayat Transaksi Paket Akrab</CardTitle>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari berdasarkan nama atau ID pelanggan..."
                  className="w-full pl-9 pr-12 h-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-10 h-10 border-none bg-transparent focus:ring-0 appearance-none p-0 text-transparent"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-calendar-days'%3E%3Crect width='18' height='18' x='3' y='4' rx='2' ry='2'/%3E%3Cline x1='16' x2='16' y1='2' y2='6'/%3E%3Cline x1='8' x2='8' y1='2' y2='6'/%3E%3Cline x1='3' x2='21' y1='10' y2='10'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundSize: '16px 16px',
                    }}
                  />
                </div>
              </div>
              {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate('')} className="mt-2 text-primary hover:text-primary">
                  Hapus Filter Tanggal
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-4">
                {filteredTransactions.map((trx) => (
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
                      <div className="flex justify-between"><span>Harga Jual:</span> <span className="font-medium">{formatRupiah(trx.sellingPrice)}</span></div>
                      <div className="flex justify-between"><span>Laba:</span> <span className="font-medium"><Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="text-xs">{formatRupiah(trx.profit)}</Badge></span></div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-9 w-9"><Eye className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => handleEdit(trx)} className="h-9 w-9"><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan memindahkan transaksi ke folder sampah. Anda dapat memulihkannya nanti.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(trx.id)}>Pindahkan</AlertDialogAction></AlertDialogFooter>
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
                    {filteredTransactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{format(parseISO(trx.datetime), "d MMM y, HH:mm", { locale: id })}</td>
                        <td className="px-4 py-4 text-sm font-medium text-foreground">{trx.customerName}</td>
                        <td className="px-4 py-4 text-sm text-right text-foreground whitespace-nowrap">{formatRupiah(trx.sellingPrice)}</td>
                        <td className="px-4 py-4 text-sm text-right whitespace-nowrap"><Badge variant={trx.profit > 0 ? 'default' : 'destructive'} className="font-semibold">{formatRupiah(trx.profit)}</Badge></td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{getPaymentMethodsString(trx.payments)}</td>
                        <td className="px-4 py-4 text-sm text-center whitespace-nowrap"><Badge variant={getDaysRemaining(trx.tanggalKadaluarsa).color as any}>{getDaysRemaining(trx.tanggalKadaluarsa).text}</Badge></td>
                        <td className="px-4 py-4 text-center space-x-1 whitespace-nowrap">
                          <Button variant="outline" size="icon" onClick={() => handleDetailClick(trx)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => handleEdit(trx)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan memindahkan transaksi ke folder sampah. Anda dapat memulihkannya nanti.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(trx.id)}>Pindahkan</AlertDialogAction></AlertDialogFooter>
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
          title="Detail Transaksi Paket Akrab"
          data={getDetailData(detailTransaction)}
        />
      </main>
    </div>
  );
}
