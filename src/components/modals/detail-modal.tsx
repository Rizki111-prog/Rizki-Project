'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

interface DetailItem {
    label: string;
    value: string | number;
    badge?: 'default' | 'secondary' | 'destructive' | 'outline' | null;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  data: DetailItem[];
}

export function DetailModal({ isOpen, onClose, title, description, data }: DetailModalProps) {
  const isMobile = useIsMobile();
  
  const ModalComponent = isMobile ? Sheet : Dialog;
  const ModalContent = isMobile ? SheetContent : DialogContent;

  return (
    <ModalComponent open={isOpen} onOpenChange={onClose}>
      <ModalContent className={isMobile ? "w-full" : "sm:max-w-md"}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>
        <div className="py-4 space-y-4">
          <ul className="space-y-3">
            {data.map((item, index) => (
              <li key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b last:border-none">
                <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                {item.badge ? (
                  <Badge variant={item.badge} className="mt-1 sm:mt-0 text-xs sm:text-sm">{item.value}</Badge>
                ) : (
                  <span className="text-sm text-foreground font-semibold text-left sm:text-right">{item.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <SheetFooter className="sm:justify-end">
          <SheetClose asChild>
            <Button type="button" variant="secondary" className="w-full">
              Tutup
            </Button>
          </SheetClose>
        </SheetFooter>
      </ModalContent>
    </ModalComponent>
  );
}
