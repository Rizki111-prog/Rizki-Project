'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue, update, get, query, orderByChild, equalTo, serverTimestamp } from 'firebase/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
              const dateA = typeof a.data.deletedAt === 'number' ? a.data.deletedAt : 0;
              const dateB = typeof b.data.deletedAt === 'number' ? b.data.deletedAt : 0;
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
    };
  }, []);

  const handleRestore = async (item: DeletedItem) => {
    const updates: { [key: string]: any } = {};
    const path = `${item.path}/${item.id}`;
    
    updates[`${path}/isDeleted`] = null;
    updates[`${path}/deletedAt`] = null;

    try {
        if (item.path === 'hutang' && item.data.transactionId && item.data.sourcePath) {
            const trxPath = `${item.data.sourcePath}/${item.data.transactionId}`;
            updates[`${trxPath}/isDeleted`] = null;
            updates[`${trxPath}/deletedAt`] = null;
        } else if (item.path.startsWith('transaksi')) {
            const debtSnapshot = await get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(item.id)));
            if (debtSnapshot.exists()) {
                debtSnapshot.forEach(child => {
                const debtPath = `hutang/${child.key}`;
                updates[`${debtPath}/isDeleted`] = null;
                updates[`${debtPath}/deletedAt`] = null;
                });
            }
        }

        await update(ref(db), updates);
        toast({ title: "Sukses", description: "Item berhasil dipulihkan." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal", description: `Tidak dapat memulihkan item: ${error.message}` });
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    const updates: { [key: string]: any } = {};
    const path = `${item.path}/${item.id}`;
    updates[path] = null;

     if (item.path.startsWith('transaksi')) {
        const debtSnapshot = await get(query(ref(db, 'hutang'), orderByChild('transactionId'), equalTo(item.id)));
        if (debtSnapshot.exists()) {
            debtSnapshot.forEach(child => {
                updates[`hutang/${child.key}`] = null;
            });
        }
    }

    try {
        await update(ref(db), updates);
        toast({ title: "Sukses", description: "Item berhasil dihapus permanen." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal", description: `Tidak dapat menghapus item: ${error.message}` });
    }
  };

  const getItemName = (item: DeletedItem) => {
    if (item.path.startsWith('transaksi')) {
      return item.data.productName || item.data.customerName || 'Transaksi Tanpa Nama';
    }
    if (item.path === 'hutang' || item.path === 'pengeluaran') {
      return item.data.name || item.data.nama || 'Item Tanpa Nama';
    }
    return 'Item Tidak Dikenali';
  };
  
  const getItemDate = (item: DeletedItem) => {
    const dateValue = item.data.datetime || item.data.tanggal || item.data.date;
    return dateValue ? format(parseISO(dateValue), "d MMM y, HH:mm", { locale: id }) : 'Tanggal tidak ada';
  }
  
  const formatDeletedAt = (deletedAt: number | string) => {
    if (!deletedAt) return 'N/A';
    const date = typeof deletedAt === 'number' ? new Date(deletedAt) : parseISO(deletedAt as string);
    return format(date, "d MMM y, HH:mm", { locale: id });
  };

  const getItemType = (path: string) => {
    if (path.includes('reguler')) return 'Transaksi Reguler';
    if (path.includes('akrab')) return 'Transaksi Akrab';
    if (path.includes('hutang')) return 'Catatan Hutang';
    if (path.includes('pengeluaran')) return 'Pengeluaran';
    return 'Item';
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className='min-w-0 flex-1'>
          <h1 className="text-lg font-semibold md:text-2xl truncate whitespace-nowrap">Folder Sampah</h1>
          <p className="text-sm text-muted-foreground truncate whitespace-nowrap">Pulihkan atau hapus item secara permanen.</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : deletedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {deletedItems.map((item) => (
              <Card key={`${item.path}-${item.id}`} className="rounded-xl shadow-sm flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold">{getItemName(item)}</CardTitle>
                    <Badge variant="secondary">{getItemType(item.path)}</Badge>
                  </div>
                  <CardDescription>
                    {getItemDate(item)}
                    {item.data.nominal && <div className='font-semibold'>{formatRupiah(item.data.nominal)}</div>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Dihapus pada: {formatDeletedAt(item.data.deletedAt)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                   <Button variant="outline" size="sm" onClick={() => handleRestore(item)}>
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
                          <AlertDialogTitle>Hapus Permanen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat diurungkan. Item akan dihapus selamanya dari database. Anda yakin?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePermanentDelete(item)}>
                            Ya, Hapus Permanen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
              </Card>
            ))}
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
