import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn('h-8 w-8', className)}
      {...props}
    >
      <circle cx="50" cy="50" r="50" fill="#f0c45c" />
      <path
        d="M35 75V25h22c8.284 0 15 6.716 15 15s-6.716 15-15 15H45l20 20H50L35 60V75zm10-33h10c2.761 0 5-2.239 5-5s-2.239-5-5-5H45v10z"
        fill="#2c3e50"
      />
    </svg>
  );
}
