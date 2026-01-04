'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Edit, Trash2, MoreHorizontal } from 'lucide-react';
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

interface Customer {
  id: string;
  name: string;
  nomor_hp: string;
}

const CustomerForm = ({ customer, onSave, onCancel, isSubmitting }: { customer: Partial<Customer> | null, onSave: (customer: { name: string, nomor_hp: string }) => void, onCancel: () => void, isSubmitting: boolean }) => {
  const [name, setName] = useState('');
  const [nomorHp, setNomorHp] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setNomorHp(customer.nomor_hp || '');
    } else {
      setName('');
      setNomorHp('');
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Nama pelanggan tidak boleh kosong.' });
      return;
    }
    const customerData = { name, nomor_hp: nomorHp || '' };
    console.log("Data yang akan disimpan:", customerData);
    onSave(customerData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{customer?.id ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
        <DialogDescription>Isi detail pelanggan di bawah ini. Klik simpan jika sudah selesai.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Pelanggan</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nomor_hp">Nomor HP / ID Pelanggan</Label>
          <Input id="nomor_hp" value={nomorHp} onChange={(e) => setNomorHp(e.target.value)} placeholder="Contoh: 08123456789" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function AkrabCustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    const customersRef = ref(db, 'pelanggan_akrab');
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      const loadedCustomers: Customer[] = data ? Object.entries(data).map(([key, value]) => ({ 
        id: key, 
        name: (value as any).name || '',
        nomor_hp: (value as any).nomor_hp || ''
      })) : [];
      setCustomers(loadedCustomers.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleOpenModal = (customer: Partial<Customer> | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSave = (customerData: { name: string, nomor_hp: string }) => {
    setIsSubmitting(true);
    
    const promise = editingCustomer?.id 
        ? update(ref(db, `pelanggan_akrab/${editingCustomer.id}`), customerData)
        : push(ref(db, 'pelanggan_akrab'), customerData);

    promise.then(() => {
        toast({ title: 'Sukses', description: `Pelanggan "${customerData.name}" berhasil disimpan.` });
        handleCloseModal();
    }).catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Terjadi kesalahan: ${error.message}` });
        console.error("Firebase save error:", error);
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  const handleDelete = (customer: Customer) => {
    remove(ref(db, `pelanggan_akrab/${customer.id}`))
      .then(() => {
        toast({ title: 'Sukses', description: `Pelanggan "${customer.name}" berhasil dihapus.` });
      })
      .catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Gagal menghapus pelanggan: ${error.message}` });
      });
  };

  const handleSelect = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleBulkDelete = () => {
    const updates: { [key: string]: null } = {};
    selectedCustomers.forEach(id => {
      updates[`/pelanggan_akrab/${id}`] = null;
    });

    update(ref(db), updates)
      .then(() => {
        toast({ title: 'Sukses', description: `${selectedCustomers.length} pelanggan berhasil dihapus.` });
        setSelectedCustomers([]);
      })
      .catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Gagal menghapus pelanggan: ${error.message}` });
      });
  };

  const numSelected = selectedCustomers.length;
  const numCustomers = customers.length;
  const isIndeterminate = numSelected > 0 && numSelected < numCustomers;

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Pelanggan Akrab</h1>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {numSelected > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus ({numSelected})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. {numSelected} pelanggan akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={() => handleOpenModal()} className="transition-all duration-300 hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Pelanggan
            </Button>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Daftar Pelanggan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : customers.length === 0 ? (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                    <p className="text-muted-foreground text-sm text-center">Belum ada data pelanggan. Silakan tambahkan.</p>
                </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {customers.map(customer => (
                    <Card key={customer.id} className="rounded-lg border">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className='flex items-center gap-4'>
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={() => handleSelect(customer.id)}
                            aria-label={`Pilih ${customer.name}`}
                          />
                          <CardTitle className="text-base font-bold">{customer.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenModal(customer)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Hapus
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Pelanggan akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(customer)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="text-sm pl-12">
                        <p className="text-muted-foreground">{customer.nomor_hp || 'Tanpa ID'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground w-12">
                                  <Checkbox
                                    checked={numSelected === numCustomers && numCustomers > 0}
                                    indeterminate={isIndeterminate}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Pilih semua"
                                  />
                                </th>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Nama Pelanggan</th>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Nomor HP / ID Pelanggan</th>
                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {customers.map(customer => (
                                <tr key={customer.id} className="hover:bg-muted/50 transition-colors" data-state={selectedCustomers.includes(customer.id) ? 'selected' : ''}>
                                    <td className="px-4 py-4">
                                      <Checkbox
                                        checked={selectedCustomers.includes(customer.id)}
                                        onCheckedChange={() => handleSelect(customer.id)}
                                        aria-label={`Pilih ${customer.name}`}
                                      />
                                    </td>
                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{customer.name}</td>
                                    <td className="px-4 py-4 text-sm text-muted-foreground">{customer.nomor_hp || '-'}</td>
                                    <td className="px-4 py-4 text-center space-x-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(customer)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Pelanggan akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(customer)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
            <CustomerForm customer={editingCustomer} onSave={handleSave} onCancel={handleCloseModal} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
