import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Toaster } from "@/components/ui/toaster";
import { GeistSans } from 'geist/font/sans';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Rizki App',
  description: 'Aplikasi pelacakan keuangan modern',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${GeistSans.className} h-full`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased h-full bg-background overflow-x-hidden">
        <SidebarProvider>
          <Sidebar collapsible="icon" variant="sidebar" side="left">
            <AppSidebar />
          </Sidebar>
          <SidebarInset>
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                // This logic is to inject the SidebarTrigger into the header of each page
                const header = React.Children.toArray(child.props.children).find(
                  (c: any) => c.type === 'header'
                );

                if (header && React.isValidElement(header)) {
                  const headerChildren = React.Children.toArray(header.props.children);
                  const firstChild = headerChildren[0];
                  
                  if (firstChild && React.isValidElement(firstChild) && firstChild.props.className?.includes('flex')) {
                      const newFirstChild = React.cloneElement(firstChild, {
                          children: [
                            <SidebarTrigger key="desktop-trigger" className="hidden md:flex" />,
                            ...React.Children.toArray(firstChild.props.children)
                          ]
                      });

                      const newChildren = [newFirstChild, ...headerChildren.slice(1)];
                      const newHeader = React.cloneElement(header, {}, newChildren);

                      return React.cloneElement(child, {
                          children: [newHeader, ...React.Children.toArray(child.props.children).filter((c: any) => c.type !== 'header')]
                      });
                  }
                }
              }
              return child;
            })}
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
