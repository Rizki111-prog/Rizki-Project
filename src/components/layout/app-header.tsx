'use client';

import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-2">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg font-semibold md:text-2xl truncate whitespace-nowrap">{title}</h1>
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </header>
  );
}
