'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from './logo';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

const publicRoutes = ['/login', '/register', '/forgot-password', '/verify-email'];
const isPublicRoute = (path: string) => publicRoutes.includes(path);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Force a reload of the user's properties to get the latest `emailVerified` state
      currentUser?.reload().then(() => {
        const freshUser = auth.currentUser;
        setUser(freshUser);
        setIsLoading(false);
      }).catch(() => {
        // If reload fails (e.g. user deleted), sign them out client-side
        setUser(null);
        setIsLoading(false);
      });

      if(!currentUser){
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const onPublicRoute = isPublicRoute(pathname);

    if (user) {
      if (!user.emailVerified && pathname !== '/verify-email') {
        router.push('/verify-email');
      } else if (user.emailVerified && onPublicRoute) {
        router.push('/');
      }
    } else {
      if (!onPublicRoute) {
        router.push('/login');
      }
    }
  }, [user, isLoading, pathname, router]);

  const shouldShowLoader = () => {
    if (isLoading) return true; // Initial auth check
    
    const onPublicRoute = isPublicRoute(pathname);
    
    // Redirecting scenarios
    if (user) {
        if (!user.emailVerified && pathname !== '/verify-email') return true;
        if (user.emailVerified && onPublicRoute) return true;
    } else {
        if (!onPublicRoute) return true;
    }

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

  // If on a public route, render children without the main layout
  if (isPublicRoute(pathname)) {
      return (
        <AuthContext.Provider value={{ user, isLoading }}>
            {children}
        </AuthContext.Provider>
      );
  }
  
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
        <SidebarProvider>
            <Sidebar collapsible="icon" variant="sidebar" side="left">
              <AppSidebar />
            </Sidebar>
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
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
