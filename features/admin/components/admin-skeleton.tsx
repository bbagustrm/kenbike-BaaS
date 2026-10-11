import { Skeleton } from "@/components/ui/skeleton";

/** Fallback konten admin selama data halaman dimuat. */
export function AdminContentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
