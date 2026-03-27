export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700 ${className}`}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* User message (right) */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48" />
      </div>
      {/* Assistant message (left) */}
      <div className="flex justify-start">
        <Skeleton className="h-20 w-64" />
      </div>
      {/* User message (right) */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
