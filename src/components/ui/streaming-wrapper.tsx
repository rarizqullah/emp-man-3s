import { Suspense, ReactNode } from 'react';
import { TableSkeleton, CardSkeleton, StatsSkeleton, PageSkeleton } from './loading-skeleton';

interface StreamingWrapperProps {
  children: ReactNode;
  fallback?: 'table' | 'card' | 'stats' | 'page' | ReactNode;
  className?: string;
}

export function StreamingWrapper({ 
  children, 
  fallback = 'page',
  className = ''
}: StreamingWrapperProps) {
  const getFallbackComponent = () => {
    if (typeof fallback === 'string') {
      switch (fallback) {
        case 'table':
          return <TableSkeleton />;
        case 'card':
          return <CardSkeleton />;
        case 'stats':
          return <StatsSkeleton />;
        case 'page':
        default:
          return <PageSkeleton />;
      }
    }
    return fallback;
  };

  return (
    <div className={className}>
      <Suspense fallback={getFallbackComponent()}>
        {children}
      </Suspense>
    </div>
  );
}

// Specialized wrappers for common use cases
export function TableStream({ children, rows }: { children: ReactNode; rows?: number }) {
  return (
    <Suspense fallback={<TableSkeleton rows={rows} />}>
      {children}
    </Suspense>
  );
}

export function StatsStream({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      {children}
    </Suspense>
  );
}

export function PageStream({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
} 