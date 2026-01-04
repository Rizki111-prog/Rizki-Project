'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { getFirebaseAuthErrorMessage } from '@/firebase/auth-errors';

const formSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSuccess(true);
      toast({
        title: 'Email Terkirim',
        description: 'Silakan periksa kotak masuk Anda untuk instruksi reset kata sandi.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: getFirebaseAuthErrorMessage(error.code),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg">
        <CardHeader className="text-center">
            <div className='flex justify-center'>
                <Logo />
            </div>
          <CardTitle className="text-2xl mt-4">Lupa Kata Sandi</CardTitle>
          <CardDescription>
            {isSuccess
              ? 'Tautan reset telah dikirim ke email Anda.'
              : 'Masukkan email Anda untuk menerima tautan reset kata sandi.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Jika Anda tidak menerima email, periksa folder spam Anda atau coba lagi nanti.
              </p>
              <Link href="/login" passHref>
                <Button className="w-full">Kembali ke Halaman Masuk</Button>
              </Link>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@contoh.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center text-sm">
                Ingat kata sandi Anda?{' '}
                <Link href="/login" passHref>
                  <span className="text-primary hover:underline cursor-pointer">Masuk di sini</span>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
