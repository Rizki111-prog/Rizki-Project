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
  { href: '/expenses', label: 'Pengeluaran', icon: Wallet },
  { href: '/finance', label: 'Keuangan', icon: LineChart },
  { href: '/history', label: 'Riwayat Transaksi', icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [openSales, setOpenSales] = React.useState(pathname.startsWith('/sales'));

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-16">
        <div className="flex items-center gap-3 px-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-sidebar-foreground">
                <DollarSign className="h-6 w-6 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden">FinTrack</span>
            </Link>
            <div className="flex-1" />
            <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            item.submenus ? (
              <SidebarMenuItem key={item.href}>
                <Collapsible open={openSales} onOpenChange={setOpenSales}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      variant="ghost"
                      className="w-full justify-start"
                      isActive={pathname.startsWith(item.href)}
                      tooltip={{ children: item.label, side: 'right' }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openSales && "rotate-180")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mt-1 flex flex-col gap-1 border-l pl-3 py-1">
                      {item.submenus.map((submenu) => (
                        <SidebarMenuButton
                          key={submenu.href}
                          asChild
                          size="sm"
                          variant="ghost"
                          isActive={pathname === submenu.href}
                          tooltip={{ children: submenu.label, side: 'right' }}
                        >
                          <Link href={submenu.href}>
                            <span className="pl-2">{submenu.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}