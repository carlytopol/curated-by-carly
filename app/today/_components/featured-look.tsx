export function FeaturedLook() {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-[#f4f0e9] shadow-[0_20px_50px_rgba(28,28,27,0.08)]">
      <div className="relative flex aspect-[4/5] items-end overflow-hidden p-7 sm:p-10">
        <div className="absolute inset-x-[21%] top-[10%] h-[76%] rounded-t-[7rem] bg-[#e8e0d3]" />
        <div className="absolute inset-x-[34%] top-[18%] h-[58%] rounded-t-[4rem] bg-[#d7cabb]" />
        <div className="relative max-w-xs">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
            Featured look
          </p>
          <p className="mt-3 text-2xl font-light tracking-tight text-neutral-800">
            An ivory silhouette for an unhurried day.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 bg-white px-7 py-6 sm:px-10">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            Today’s recommendation
          </p>
          <h2 className="mt-2 text-xl font-light tracking-tight">
            Soft tailoring, considered ease
          </h2>
        </div>
        <span className="h-2 w-2 rounded-full bg-[#254235]" aria-hidden="true" />
      </div>
    </section>
  );
}
