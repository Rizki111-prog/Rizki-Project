
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { ref, onValue, push, update, remove, get, set } from 'firebase/database';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Edit, Trash2, MoreHorizontal, FileUp, FileDown } from 'lucide-react';
import { formatRupiah, cleanRupiah } from '@/lib/utils';
import * as XLSX from 'xlsx';
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
import { SidebarTrigger } from '@/components/ui/sidebar';

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
          <Label htmlFor="id">ID Produk</Label>
          <Input id="id" value={product?.id || ''} readOnly disabled />
        </div>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateProductID = () => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `PPL${randomDigits}`;
  };
  
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
    if (product) {
      setEditingProduct(product);
    } else {
      // Generate a new ID for a new product
      setEditingProduct({ id: generateProductID() });
    }
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (productData: Omit<Product, 'id'>) => {
    setIsSubmitting(true);
    
    if (!editingProduct?.id) {
        toast({ variant: 'destructive', title: 'Gagal', description: 'ID Produk tidak valid.' });
        setIsSubmitting(false);
        return;
    }

    const productRef = ref(db, `produk_master/${editingProduct.id}`);

    // For new products, we use set(). For existing, we use update().
    // Since we generate ID client-side, we check if it exists in the current state.
    const isNewProduct = !products.some(p => p.id === editingProduct.id);
    
    const promise = isNewProduct ? set(productRef, productData) : update(productRef, productData);

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

  const handleExport = () => {
    try {
      const dataToExport = products.map(p => ({
        'ID': p.id,
        'Nama Produk': p.name,
        'Harga': p.sellingPrice,
        'Modal': p.costPrice
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      const colWidths = [
        { wch: 12 }, // ID
        { wch: 30 }, // Nama Produk
        { wch: 15 }, // Harga
        { wch: 15 }, // Modal
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produk");
      XLSX.writeFile(workbook, "Daftar_Produk.xlsx");
      toast({ title: 'Sukses', description: 'Data produk berhasil diekspor.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mengekspor data produk.' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]).map(h => h.trim());
            const requiredHeaders = ['ID', 'Nama Produk', 'Harga', 'Modal'];
            if (!requiredHeaders.every(h => headers.includes(h))) {
                toast({ variant: 'destructive', title: 'Format Salah', description: `Header file Excel harus mengandung: ${requiredHeaders.join(', ')}.` });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            const updates: { [key: string]: any } = {};
            let updatedCount = 0;
            let createdCount = 0;
            const existingIds = products.map(p => p.id);
            const importIds = new Set<string>();

            for (const item of json) {
                let id = item.ID;
                const name = item['Nama Produk'];
                const sellingPrice = Number(item.Harga) || 0;
                const costPrice = Number(item.Modal) || 0;

                if (!name) continue;

                if (!id) {
                    // Generate new ID for new item
                    do {
                        id = generateProductID();
                    } while (existingIds.includes(id) || importIds.has(id)); // Avoid collision within the same import batch
                    createdCount++;
                } else if (existingIds.includes(id)) {
                    updatedCount++;
                } else {
                    createdCount++; // Treat as new if ID doesn't exist
                }
                
                importIds.add(id);

                updates[`/produk_master/${id}`] = {
                    name,
                    sellingPrice,
                    costPrice,
                };
            }

            if (Object.keys(updates).length > 0) {
                await update(ref(db), updates);
                toast({ title: 'Sukses', description: `${createdCount} produk dibuat dan ${updatedCount} produk diperbarui.` });
            } else {
                toast({ variant: 'default', title: 'Tidak Ada Perubahan', description: 'Tidak ada data valid untuk diimpor.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Impor', description: `Gagal memproses file: ${error.message}` });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };


  const numSelected = selectedProducts.length;
  const numProducts = products.length;
  const isIndeterminate = numSelected > 0 && numSelected < numProducts;

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <AppHeader title="Data Barang">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".xlsx, .xls"
                className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Impor
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor
            </Button>
            {numSelected > 0 ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
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
                <Button onClick={() => handleOpenModal()} size="sm" className="transition-all duration-300 hover:scale-105">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah
                </Button>
            )}
          </div>
      </AppHeader>
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
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
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

    