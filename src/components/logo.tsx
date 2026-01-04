import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative h-8 w-8', className)} {...props}>
        <Image 
            src="/logo.png" 
            alt="Rizki App Logo" 
            fill 
            sizes="32px"
            className="object-contain"
        />
    </div>
  );
}
