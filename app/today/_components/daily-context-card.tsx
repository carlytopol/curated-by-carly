type DailyContextCardProps = {
  label: string;
  title: string;
  detail: string;
};

export function DailyContextCard({
  label,
  title,
  detail,
}: DailyContextCardProps) {
  return (
    <section className="rounded-3xl bg-[#faf8f4] p-6 shadow-[0_14px_35px_rgba(28,28,27,0.05)] sm:p-7">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <h2 className="mt-4 text-2xl font-light tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-500">{detail}</p>
    </section>
  );
}
