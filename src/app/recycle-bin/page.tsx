'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue, update, get, query, orderByChild, equalTo, serverTimestamp } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Info, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
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
import { formatRupiah } from '@/lib/utils';


interface DeletedItem {
  id: string;
  path: string;
  data: {
    productName?: string;
    customerName?: string;
    nama?: string;
    name?: string;
    nominal?: number;
    sellingPrice?: number;
    datetime?: string;
    tanggal?: string;
    date?: string;
    deletedAt: number | string;
    transactionId?: string;
    sourcePath?: string;
    fundSourceId?: string;
    [key: string]: any;
  };
}

export default function RecycleBinPage() {
  const { toast } = useToast();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const paths = ['transaksi_reguler', 'transaksi_akrab', 'hutang', 'pengeluaran'];
    const unsubscribes = paths.map(path => {
      const dbRef = query(ref(db, path), orderByChild('isDeleted'), equalTo(true));
      return onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        const loadedItems: DeletedItem[] = [];
        if (data) {
          for (const key in data) {
              loadedItems.push({ id: key, path, data: data[key] });
          }
        }
        
        setDeletedItems(prev => {
          const otherItems = prev.filter(item => item.path !== path);
          const newItems = [...otherItems, ...loadedItems];
          newItems.sort((a, b) => {
              const dateA = typeof a.data.deletedAt === 'number' ? a.data.deletedAt : parseISO(a.data.deletedAt as string).getTime();
              const dateB = typeof b.data.deletedAt === 'number' ? b.data.deletedAt : parseISO(b.data.deletedAt as string).getTime();
              return dateB - dateA;
          });
          return newItems;
        });

        setIsLoading(false);
      }, (error) => {
        console.error(`Error fetching from ${path}:`, error);
        setIsLoading(false);
      });
    });
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
      setDeletedItems([]);
    };
  }, []);

  const handleSelectionChange = (item: DeletedItem, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(prev => [...prev, item]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id || selected.path !== item.path));
    }
  };

  const handleBulkAction = async (action: 'restore' | 'delete') => {
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Tidak ada item terpilih" });
      return;
    }
  
    const updates: { [key: string]: any } = {};
  
    try {
      for (const item of selectedItems) {
        const itemPath = `${item.path}/${item.id}`;
        
        if (action === 'restore') {
          updates[`${itemPath}/isDeleted`] = null;
          updates[`${itemPath}/deletedAt`] = null;
  
          if (item.path === 'hutang' && item.data.transactionId && item.data.sourcePath) {
            const trxPath = `${item.data.sourcePath}/${item.data.transactionId}`;
            updates[`${trxPath}/isDeleted`] = null;
            updates[`${trxPath}/deletedAt`] = null;
          } else if (item.path.startsWith('transaksi')) {
            const debtSnapshot = await get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(item.id)));
            if (debtSnapshot.exists()) {
              debtSnapshot.forEach(child => {
                updates[`hutang/${child.key}/isDeleted`] = null;
                updates[`hutang/${child.key}/deletedAt`] = null;
              });
            }
          }
        } else { // action === 'delete'
          updates[itemPath] = null;
  
          if (item.path.startsWith('transaksi')) {
            const debtSnapshot = await get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(item.id)));
            if (debtSnapshot.exists()) {
              debtSnapshot.forEach(child => {
                updates[`hutang/${child.key}`] = null;
              });
            }
          }
        }
      }
  
      await update(ref(db), updates);
      
      const successMessage = action === 'restore' 
        ? `${selectedItems.length} item berhasil dipulihkan.`
        : `${selectedItems.length} item berhasil dihapus permanen.`;
      
      toast({ title: "Sukses", description: successMessage });
      setSelectedItems([]);
  
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: `Terjadi kesalahan: ${error.message}` });
    }
  };

  const getItemName = (item: DeletedItem) => {
    return item.data.productName || item.data.customerName || item.data.name || item.data.nama || 'Item Tanpa Nama';
  };
  
  const getItemDate = (item: DeletedItem) => {
    const dateValue = item.data.datetime || item.data.tanggal || item.data.date;
    try {
      return dateValue ? format(parseISO(dateValue), "d MMM y, HH:mm", { locale: id }) : 'Tanggal tidak ada';
    } catch (e) {
      return 'Tanggal tidak valid';
    }
  }
  
  const formatDeletedAt = (deletedAt: number | string) => {
    if (!deletedAt) return 'N/A';
    try {
      const date = typeof deletedAt === 'number' ? new Date(deletedAt) : parseISO(deletedAt as string);
      return format(date, "d MMM y, HH:mm", { locale: id });
    } catch (e) {
      return 'Tanggal tidak valid';
    }
  };

  const getItemType = (path: string) => {
    if (path.includes('reguler')) return { text: 'Transaksi Reguler', color: 'bg-blue-100 text-blue-800' };
    if (path.includes('akrab')) return { text: 'Transaksi Akrab', color: 'bg-purple-100 text-purple-800' };
    if (path.includes('hutang')) return { text: 'Catatan Hutang', color: 'bg-yellow-100 text-yellow-800' };
    if (path.includes('pengeluaran')) return { text: 'Pengeluaran', color: 'bg-red-100 text-red-800' };
    return { text: 'Item', color: 'bg-gray-100 text-gray-800' };
  }

  const getItemValue = (item: DeletedItem) => {
    return item.data.nominal ?? item.data.sellingPrice ?? null;
  }

  const numSelected = selectedItems.length;

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className='flex items-center gap-4'>
            <SidebarTrigger className="md:hidden" />
            <div className='min-w-0 flex-1'>
            {numSelected > 0 ? (
                <h1 className="text-lg font-semibold md:text-xl truncate whitespace-nowrap">{numSelected} item terpilih</h1>
            ) : (
                <>
                    <h1 className="text-lg font-semibold md:text-2xl truncate whitespace-nowrap">Folder Sampah</h1>
                    <p className="text-sm text-muted-foreground truncate whitespace-nowrap">Pulihkan atau hapus item secara permanen.</p>
                </>
            )}
            </div>
        </div>
        {numSelected > 0 && (
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('restore')} className="hover:bg-emerald-50 hover:text-emerald-700 border-emerald-300 text-emerald-600">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Pulihkan
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Hapus {numSelected} Item Secara Permanen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat diurungkan. Item akan dihapus selamanya dari database. Anda yakin?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleBulkAction('delete')} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                            Ya, Hapus Permanen
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : deletedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {deletedItems.map((item) => {
              const isSelected = !!selectedItems.find(i => i.id === item.id && i.path === item.path);
              const itemType = getItemType(item.path);
              const itemValue = getItemValue(item);
              return (
              <Card 
                key={`${item.path}-${item.id}`} 
                className={`rounded-xl shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-border hover:shadow-md'}`}
                onClick={() => handleSelectionChange(item, !isSelected)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className='flex items-start gap-3 flex-1 min-w-0'>
                        <Checkbox
                            className='mt-1 flex-shrink-0'
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectionChange(item, !!checked)}
                            aria-label={`Pilih ${getItemName(item)}`}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-bold truncate">{getItemName(item)}</CardTitle>
                            <CardDescription className="truncate">
                                {getItemDate(item)}
                            </CardDescription>
                        </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-2'>
                  <div className='flex justify-between items-center mb-3'>
                    {itemValue !== null && <p className='text-xl font-bold'>{formatRupiah(itemValue)}</p>}
                    <Badge variant="secondary" className={`whitespace-nowrap text-xs font-medium ${itemType.color}`}>{itemType.text}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dihapus pada: {formatDeletedAt(item.data.deletedAt)}
                  </p>
                </CardContent>
              </Card>
            )})}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl">
            <div className="text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Folder Sampah Kosong</h3>
              <p className="mt-1 text-sm text-muted-foreground">Tidak ada item yang dihapus.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
