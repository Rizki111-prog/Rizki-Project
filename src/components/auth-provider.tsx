'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from './logo';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

const publicRoutes = ['/login', '/register', '/forgot-password'];
const verificationRoute = '/verify-email';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Force a reload of the user's properties to get the latest `emailVerified` state
        currentUser.reload().then(() => {
          const freshUser = auth.currentUser;
          setUser(freshUser);
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = publicRoutes.includes(pathname);
    const isVerificationRoute = pathname === verificationRoute;

    if (user) {
      if (!user.emailVerified && !isVerificationRoute) {
        // User is logged in but email is not verified, and they are not on the verification page
        router.push(verificationRoute);
      } else if (user.emailVerified && (isPublicRoute || isVerificationRoute)) {
        // User is logged in and verified, but on a public/verification page
        router.push('/');
      }
    } else {
      if (!isPublicRoute && !isVerificationRoute) {
        // User is not logged in and not on a public/verification page
        router.push('/login');
      }
    }
  }, [user, isLoading, pathname, router]);

  // Determine if a loading screen should be shown
  const shouldShowLoader = () => {
    if (isLoading) return true;
    if (user && !user.emailVerified && pathname !== verificationRoute) return true;
    if (user && user.emailVerified && (publicRoutes.includes(pathname) || pathname === verificationRoute)) return true;
    if (!user && !publicRoutes.includes(pathname) && pathname !== verificationRoute) return true;
    return false;
  };

  if (shouldShowLoader()) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Logo className="h-16 w-16 mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
