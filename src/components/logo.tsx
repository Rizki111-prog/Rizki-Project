import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative h-10 w-10', className)} {...props}>
        <Image 
            src="/logo.png" 
            alt="Rizki App Logo" 
            fill 
            sizes="40px"
            className="object-contain"
        />
    </div>
  );
}
