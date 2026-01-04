'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { auth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, User, KeyRound, ShieldAlert } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';

const profileSchema = z.object({
  name: z.string().min(3, { message: 'Nama minimal 3 karakter.' }),
});

const deleteSchema = z.object({
    password: z.string().min(1, { message: 'Kata sandi diperlukan.' }),
    confirmation: z.string().refine(val => val === 'DELETE', {
        message: 'Ketik "DELETE" untuk konfirmasi.',
    }),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.displayName || '',
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({ name: user.displayName || '' });
    }
  }, [user, form]);

  async function onNameSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return;
    setIsNameLoading(true);
    try {
      await updateProfile(user, { displayName: values.name });
      toast({ title: 'Sukses', description: 'Nama Anda berhasil diperbarui.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memperbarui nama.' });
    } finally {
      setIsNameLoading(false);
    }
  }

  async function onPasswordReset() {
    if (!user?.email) return;
    setIsPasswordLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ title: 'Email Terkirim', description: 'Tautan reset kata sandi telah dikirim ke email Anda.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mengirim email reset kata sandi.' });
    } finally {
      setIsPasswordLoading(false);
    }
  }

  async function onDeleteAccount() {
    if (!user || !user.email || confirmationText !== 'DELETE') {
        toast({ variant: 'destructive', title: 'Konfirmasi Salah', description: 'Harap ketik "DELETE" untuk melanjutkan.' });
        return;
    }
    
    setIsDeleteLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForDelete);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      
      toast({ title: 'Akun Dihapus', description: 'Akun Anda telah berhasil dihapus secara permanen.' });
      router.push('/login');

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal menghapus akun. Periksa kembali kata sandi Anda.' });
    } finally {
      setIsDeleteLoading(false);
      setIsDeleteModalOpen(false);
      setPasswordForDelete('');
      setConfirmationText('');
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <AppHeader title="Profil Pengguna" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <div className='flex items-center gap-4'>
                <User className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle>Informasi Akun</CardTitle>
                    <CardDescription>Kelola nama tampilan dan email Anda.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onNameSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tampilan</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Anda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label htmlFor="email">Alamat Email</Label>
                  <Input id="email" type="email" value={user?.email || ''} readOnly disabled />
                  <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
                </div>
              </CardContent>
              <CardFooter className='border-t pt-6'>
                <Button type="submit" disabled={isNameLoading}>
                  {isNameLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan Nama
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
             <div className='flex items-center gap-4'>
                <KeyRound className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle>Keamanan</CardTitle>
                    <CardDescription>Ubah kata sandi Anda.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Klik tombol di bawah ini untuk mengirim tautan reset kata sandi ke email Anda.
            </p>
          </CardContent>
          <CardFooter className='border-t pt-6'>
            <Button variant="outline" onClick={onPasswordReset} disabled={isPasswordLoading}>
              {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Tautan Reset Kata Sandi
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-destructive/50 rounded-xl shadow-sm">
          <CardHeader>
            <div className='flex items-center gap-4'>
                <ShieldAlert className="h-6 w-6 text-destructive" />
                <div>
                    <CardTitle className="text-destructive">Zona Berbahaya</CardTitle>
                    <CardDescription>Tindakan ini tidak dapat diurungkan.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Menghapus akun Anda akan menghapus semua data secara permanen.
            </p>
          </CardContent>
          <CardFooter className='border-t pt-6'>
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Hapus Akun Saya</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Anda Yakin Ingin Menghapus Akun?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak dapat diurungkan. Semua data Anda akan hilang. Untuk konfirmasi, masukkan kata sandi Anda dan ketik "DELETE" di bawah ini.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password-delete">Kata Sandi</Label>
                        <Input
                            id="password-delete"
                            type="password"
                            value={passwordForDelete}
                            onChange={(e) => setPasswordForDelete(e.target.value)}
                            placeholder="Masukkan kata sandi Anda"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmation-text">Ketik "DELETE"</Label>
                        <Input
                            id="confirmation-text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder='DELETE'
                            className='border-destructive focus-visible:ring-destructive'
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {setPasswordForDelete(''); setConfirmationText('');}}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAccount}
                    disabled={isDeleteLoading || confirmationText !== 'DELETE' || !passwordForDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ya, Hapus Akun Saya
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
