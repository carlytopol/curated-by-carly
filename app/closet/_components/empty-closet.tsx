type EmptyClosetProps = {
  onAddClothing: () => void;
};

export function EmptyCloset({ onAddClothing }: EmptyClosetProps) {
  return (
    <section className="mt-12 flex min-h-80 flex-col items-center justify-center rounded-3xl bg-[#faf8f4] px-6 text-center shadow-[0_18px_45px_rgba(28,28,27,0.05)]">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
        Your collection
      </p>
      <h2 className="mt-4 text-3xl font-light tracking-tight">
        Begin with a piece you love.
      </h2>
      <p className="mt-4 max-w-md leading-7 text-neutral-500">
        Take a photo on your phone, choose one from your library, or drag an image in from your desktop. Curated will help organize the rest.
      </p>
      <button
        onClick={onAddClothing}
        className="mt-8 rounded-full border border-black/15 px-6 py-3 text-sm transition-colors hover:border-black hover:bg-white"
      >
        Photograph your first piece
      </button>
    </section>
  );
}
