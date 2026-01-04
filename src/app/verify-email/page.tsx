'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, signOut, User } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function VerifyEmailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user?.emailVerified) {
      router.push('/');
    }
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Email Terkirim',
        description: 'Tautan verifikasi baru telah dikirim ke email Anda.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim',
        description: 'Gagal mengirim ulang email verifikasi. Silakan coba lagi nanti.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isAuthLoading || !user) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
          <Logo className="h-16 w-16 mb-4" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="text-center">
            <div className='flex justify-center'>
                <MailCheck className="h-16 w-16 text-primary" />
            </div>
          <CardTitle className="text-2xl mt-4">Verifikasi Email Anda</CardTitle>
          <CardDescription>
            Kami telah mengirimkan tautan verifikasi ke <strong>{user.email}</strong>. Silakan periksa kotak masuk (dan folder spam) Anda untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
                Setelah Anda memverifikasi email, Anda akan diarahkan secara otomatis. Jika tidak, silakan muat ulang halaman ini.
            </p>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleResendVerification} className="w-full" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? 'Mengirim...' : 'Kirim Ulang Email'}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full">
                Keluar
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
