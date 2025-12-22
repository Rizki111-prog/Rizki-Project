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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4 space-y-4">
          <ul className="space-y-3">
            {data.map((item, index) => (
              <li key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b last:border-none">
                <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                {item.badge ? (
                  <Badge variant={item.badge} className="mt-1 sm:mt-0">{item.value}</Badge>
                ) : (
                  <span className="text-sm text-foreground font-semibold text-left sm:text-right">{item.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
