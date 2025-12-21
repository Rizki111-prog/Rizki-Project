'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DollarSign,
  History,
  LineChart,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/', label: 'Sales', icon: ShoppingCart },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/finance', label: 'Finance', icon: LineChart },
  { href: '/history', label: 'Transaction History', icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  
  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center gap-3 px-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
                <DollarSign className="h-6 w-6 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden">FinTrack Pro</span>
            </Link>
            <div className="flex-1" />
            <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
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
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
