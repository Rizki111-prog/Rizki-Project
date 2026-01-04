'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  History,
  LayoutDashboard,
  LineChart,
  ShoppingCart,
  Wallet,
  BookUser,
  Trash2,
  ArrowDownUp,
  Database,
  Users,
  LogOut,
  User
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React from 'react';
import { Logo } from '../logo';
import { useAuth } from '../auth-provider';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const menuItems = [
  { href: '/', label: 'Dasbor', icon: LayoutDashboard },
  { 
    href: '/sales', 
    label: 'Penjualan', 
    icon: ShoppingCart,
    submenus: [
      { href: '/sales/regular', label: 'Pulsa, Token, & Paket Data' },
      { href: '/sales/family-pack', label: 'Paket Akrab' },
    ] 
  },
  { href: '/history', label: 'Riwayat Transaksi', icon: History },
  { href: '/expenses', label: 'Pengeluaran', icon: ArrowDownUp },
  { href: '/hutang', label: 'Hutang', icon: BookUser },
  { 
    href: '/finance', 
    label: 'Keuangan', 
    icon: LineChart,
    submenus: [
      { href: '/finance', label: 'Dashboard' },
      { href: '/finance/balance', label: 'Saldo Akun' },
    ]
  },
  { 
    href: '/master', 
    label: 'Data Master', 
    icon: Database,
    submenus: [
      { href: '/master/products', label: 'Data Barang' },
      { href: '/master/akrab-customers', label: 'Pelanggan Akrab' },
    ]
  },
  { href: '/recycle-bin', label: 'Folder Sampah', icon: Trash2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const [openStates, setOpenStates] = React.useState({
    sales: pathname.startsWith('/sales'),
    finance: pathname.startsWith('/finance'),
    master: pathname.startsWith('/master'),
    profile: false,
  });

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    handleLinkClick();
    try {
      await signOut(auth);
      toast({ title: "Berhasil Keluar", description: "Anda telah keluar dari akun Anda." });
      router.push('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Keluar", description: "Terjadi kesalahan saat mencoba keluar." });
    }
  };

  const getSubmenuIcon = (href: string) => {
    if (href.includes('balance')) return Wallet;
    if (href === '/finance') return LayoutDashboard;
    if (href.includes('products')) return Database;
    if (href.includes('akrab-customers')) return Users;
    return undefined;
  }
  
  const toggleCollapsible = (key: 'sales' | 'finance' | 'master' | 'profile') => {
    if (isMobile || state === 'collapsed') return;
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (!user) return null;

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  return (
    <>
      <SidebarHeader
        className="border-b border-sidebar-border h-16 p-0"
        role="button"
        aria-label="Toggle Sidebar"
        onClick={toggleSidebar}
      >
        <div className={cn(
            "hidden md:flex items-center h-full gap-3 px-3 cursor-pointer",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        )}>
            <div className="flex items-center gap-2.5 font-bold text-lg text-sidebar-foreground">
                <Logo />
                <span className="group-data-[collapsible=icon]:hidden">Rizki App</span>
            </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <div className="w-full md:hidden border-b pb-2 mb-2">
            <Collapsible 
                open={openStates.profile}
                onOpenChange={() => setOpenStates(prev => ({...prev, profile: !prev.profile}))}
            >
                <CollapsibleTrigger className='w-full'>
                    <div className='group/user-item flex w-full items-center gap-3 overflow-hidden rounded-md px-2 py-2 text-left text-sm font-medium'>
                        <Avatar className="h-9 w-9">
                          {user.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />}
                          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="grow overflow-hidden">
                          <p className="font-semibold text-sidebar-foreground truncate">{displayName}</p>
                          <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
                        </div>
                        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform", openStates.profile && "rotate-180")} />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className='pl-4 mt-2 flex flex-col gap-1'>
                        <SidebarMenuButton asChild size="sm" variant="ghost" isActive={pathname === '/profile'} onClick={handleLinkClick}>
                           <Link href="/profile"><User className="h-4 w-4"/> Profil</Link>
                        </SidebarMenuButton>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <SidebarMenuButton size="sm" variant="ghost" className="w-full justify-start text-red-500 hover:text-red-500">
                                  <LogOut className="h-4 w-4" /> Keluar
                                </SidebarMenuButton>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                                    <AlertDialogDescription>Apakah Anda yakin ingin keluar?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Keluar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              {item.submenus ? (
                 <Collapsible 
                    open={openStates[item.href.substring(1) as keyof typeof openStates] && state === 'expanded'} 
                    disabled={state==='collapsed'}
                    onOpenChange={() => toggleCollapsible(item.href.substring(1) as keyof typeof openStates)}
                  >
                   <CollapsibleTrigger asChild disabled={state === 'collapsed'}>
                     <SidebarMenuButton
                       variant="ghost"
                       className="w-full justify-start"
                       isActive={pathname.startsWith(item.href)}
                       tooltip={{ children: item.label, side: 'right' }}
                     >
                       <item.icon />
                       <span>{item.label}</span>
                       <ChevronDown className={cn(
                          "ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                          openStates[item.href.substring(1) as keyof typeof openStates] && "rotate-180"
                        )} />
                     </SidebarMenuButton>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <div className="ml-7 mt-1 flex flex-col gap-1 border-l pl-3 py-1">
                       {item.submenus.map((submenu) => {
                          const Icon = getSubmenuIcon(submenu.href);
                          const isSubmenuActive = pathname === submenu.href;
                          return (
                            <SidebarMenuButton
                              key={submenu.href}
                              asChild
                              size="sm"
                              variant="ghost"
                              isActive={isSubmenuActive}
                              tooltip={{ children: submenu.label, side: 'right' }}
                              onClick={handleLinkClick}
                            >
                              <Link href={submenu.href}>
                                {Icon && <Icon className="h-4 w-4" />}
                                <span className={cn(!Icon && 'pl-6')}>{submenu.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          );
                       })}
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: 'right' }}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2 hidden md:block">
         <div className='group/user-item flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left text-sm font-medium'>
            <Avatar className="h-9 w-9 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10">
              {user.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />}
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="grow overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="font-semibold text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
            </div>
         </div>
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild variant='ghost' tooltip={{children: "Profil", side: 'right'}} onClick={handleLinkClick}>
                    <Link href="/profile">
                        <User />
                        <span>Profil</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <SidebarMenuButton variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400" tooltip={{children: "Keluar", side: 'right'}}>
                            <LogOut />
                            <span>Keluar</span>
                        </SidebarMenuButton>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah Anda yakin ingin keluar dari akun Anda?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Ya, Keluar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
