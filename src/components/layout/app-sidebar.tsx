'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  DollarSign,
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React from 'react';

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
  const { isMobile, setOpenMobile } = useSidebar();
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

  const getSubmenuIcon = (href: string) => {
    if (href.includes('balance')) return Wallet;
    if (href === '/finance') return LayoutDashboard;
    if (href.includes('products')) return Database;
    if (href.includes('akrab-customers')) return Users;
    return undefined;
  }
  
  const toggleCollapsible = (key: 'sales' | 'finance' | 'master') => {
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-16">
        <div className="flex items-center h-full gap-3 px-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-sidebar-foreground">
                <DollarSign className="h-6 w-6 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden">Rizki App</span>
            </Link>
            <div className="flex-1" />
            <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              {item.submenus ? (
                 <Collapsible 
                    open={openStates[item.href.substring(1) as keyof typeof openStates]} 
                    onOpenChange={() => toggleCollapsible(item.href.substring(1) as keyof typeof openStates)}
                  >
                   <CollapsibleTrigger asChild>
                     <SidebarMenuButton
                       variant="ghost"
                       className="w-full justify-start"
                       isActive={pathname.startsWith(item.href)}
                       tooltip={{ children: item.label, side: 'right' }}
                     >
                       <item.icon />
                       <span>{item.label}</span>
                       <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openStates[item.href.substring(1) as keyof typeof openStates] && "rotate-180")} />
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
    </>
  );
}
