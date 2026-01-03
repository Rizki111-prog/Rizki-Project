'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { formatRupiah, cleanRupiah } from '@/lib/utils';
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

interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
}

const ProductForm = ({ product, onSave, onCancel, isSubmitting }: { product: Partial<Product> | null, onSave: (product: Omit<Product, 'id'>) => void, onCancel: () => void, isSubmitting: boolean }) => {
  const [name, setName] = useState(product?.name || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice ? formatRupiah(product.costPrice) : '');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice ? formatRupiah(product.sellingPrice) : '');
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCostPrice(product.costPrice ? formatRupiah(product.costPrice) : '');
      setSellingPrice(product.sellingPrice ? formatRupiah(product.sellingPrice) : '');
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Nama produk tidak boleh kosong.' });
      return;
    }
    onSave({
      name,
      costPrice: cleanRupiah(costPrice),
      sellingPrice: cleanRupiah(sellingPrice),
    });
  };

  const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatRupiah(e.target.value));
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{product?.id ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
        <DialogDescription>Isi detail produk di bawah ini. Klik simpan jika sudah selesai.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Produk</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Telkomsel 5rb" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">Harga Modal</Label>
          <Input id="costPrice" value={costPrice} onChange={handlePriceChange(setCostPrice)} placeholder="Contoh: 5.200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Harga Jual</Label>
          <Input id="sellingPrice" value={sellingPrice} onChange={handlePriceChange(setSellingPrice)} placeholder="Contoh: 7.000" />
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

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    const productsRef = ref(db, 'produk_master');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedProducts = data ? Object.entries(data).map(([key, value]) => ({ id: key, ...(value as Omit<Product, 'id'>) })) : [];
      setProducts(loadedProducts.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleOpenModal = (product: Partial<Product> | null = null) => {
    setEditingProduct(product || {}); // Set to an empty object for 'Add' case
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (productData: Omit<Product, 'id'>) => {
    setIsSubmitting(true);
    const promise = editingProduct?.id 
        ? update(ref(db, `produk_master/${editingProduct.id}`), productData)
        : push(ref(db, 'produk_master'), productData);

    promise.then(() => {
        toast({ title: 'Sukses', description: `Produk "${productData.name}" berhasil disimpan.` });
        handleCloseModal();
    }).catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Terjadi kesalahan: ${error.message}` });
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  const handleDelete = (product: Product) => {
    remove(ref(db, `produk_master/${product.id}`))
      .then(() => {
        toast({ title: 'Sukses', description: `Produk "${product.name}" berhasil dihapus.` });
      })
      .catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Gagal menghapus produk: ${error.message}` });
      });
  };

  const handleSelect = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = () => {
    const updates: { [key: string]: null } = {};
    selectedProducts.forEach(id => {
      updates[`/produk_master/${id}`] = null;
    });

    update(ref(db), updates)
      .then(() => {
        toast({ title: 'Sukses', description: `${selectedProducts.length} produk berhasil dihapus.` });
        setSelectedProducts([]);
      })
      .catch(error => {
        toast({ variant: 'destructive', title: 'Gagal', description: `Gagal menghapus produk: ${error.message}` });
      });
  };

  const numSelected = selectedProducts.length;
  const numProducts = products.length;
  const isIndeterminate = numSelected > 0 && numSelected < numProducts;

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl truncate whitespace-nowrap">Data Barang</h1>
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
                  <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. {numSelected} produk akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={() => handleOpenModal()} className="transition-all duration-300 hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Produk
            </Button>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            <CardDescription>Berikut adalah semua produk yang tersimpan di database.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
                    <p className="text-muted-foreground text-sm text-center">Belum ada data produk. Silakan tambahkan.</p>
                </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {products.map(product => (
                    <Card key={product.id} className="rounded-lg border">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className='flex items-center gap-4'>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => handleSelect(product.id)}
                            aria-label={`Pilih ${product.name}`}
                          />
                          <CardTitle className="text-base font-bold">{product.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenModal(product)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Hapus
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Produk akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(product)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2 pl-12">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Harga Modal:</span>
                            <span className="font-semibold">{formatRupiah(product.costPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Harga Jual:</span>
                            <span className="font-semibold">{formatRupiah(product.sellingPrice)}</span>
                        </div>
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
                                    checked={numSelected === numProducts && numProducts > 0}
                                    indeterminate={isIndeterminate}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Pilih semua"
                                  />
                                </th>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-foreground">Nama Produk</th>
                                <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Harga Modal</th>
                                <th className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">Harga Jual</th>
                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {products.map(product => (
                                <tr key={product.id} className="hover:bg-muted/50 transition-colors" data-state={selectedProducts.includes(product.id) ? 'selected' : ''}>
                                    <td className="px-4 py-4">
                                      <Checkbox
                                        checked={selectedProducts.includes(product.id)}
                                        onCheckedChange={() => handleSelect(product.id)}
                                        aria-label={`Pilih ${product.name}`}
                                      />
                                    </td>
                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{product.name}</td>
                                    <td className="px-4 py-4 text-sm text-right text-muted-foreground">{formatRupiah(product.costPrice)}</td>
                                    <td className="px-4 py-4 text-sm text-right text-foreground font-semibold">{formatRupiah(product.sellingPrice)}</td>
                                    <td className="px-4 py-4 text-center space-x-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(product)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat diurungkan. Produk akan dihapus secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(product)}>Ya, Hapus</AlertDialogAction></AlertDialogFooter>
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
            {editingProduct !== null && <ProductForm product={editingProduct} onSave={handleSave} onCancel={handleCloseModal} isSubmitting={isSubmitting} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
