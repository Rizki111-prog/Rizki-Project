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
  });

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
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
  
  const toggleCollapsible = (key: 'sales' | 'finance' | 'master') => {
    if (state === 'collapsed') return;
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (!user) return null;

  return (
    <>
      <SidebarHeader
        className="border-b border-sidebar-border h-16 p-0"
        role="button"
        aria-label="Toggle Sidebar"
        onClick={toggleSidebar}
      >
        <div className={cn(
            "flex items-center h-full gap-3 px-3 cursor-pointer",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        )}>
            <div className="flex items-center gap-2.5 font-bold text-lg text-sidebar-foreground">
                <Logo />
                <span className="group-data-[collapsible=icon]:hidden">Rizki App</span>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
      <SidebarFooter>
         <AlertDialog>
          <AlertDialogTrigger asChild>
              <SidebarMenuButton variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400">
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
      </SidebarFooter>
    </>
  );
}
