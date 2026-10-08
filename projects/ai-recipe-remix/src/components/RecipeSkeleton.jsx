/** Placeholder card shown while the recipes are being written. Hidden from screen readers. */
export default function RecipeSkeleton() {
  return (
    <div aria-hidden="true" className="card overflow-hidden">
      <div className="shimmer aspect-[4/3] sm:aspect-[16/10]" />
      <div className="space-y-3 p-5 sm:p-7">
        <div className="shimmer h-3 w-24 rounded-full" />
        <div className="shimmer h-7 w-3/4 rounded-lg" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-5/6 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="shimmer h-7 w-20 rounded-full" />
          <div className="shimmer h-7 w-24 rounded-full" />
          <div className="shimmer h-7 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
          <div className="shimmer h-28 rounded-xl" />
          <div className="shimmer h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
