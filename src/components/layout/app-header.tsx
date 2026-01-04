'use client';

import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg font-semibold md:text-2xl truncate whitespace-nowrap">{title}</h1>
      </div>
    </header>
  );
}
