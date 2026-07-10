export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-xl text-center px-8">
        <h1 className="text-5xl font-light tracking-wide mb-4">
          Curated by Carly
        </h1>

        <p className="text-xl text-gray-500 mb-12">
          Your wardrobe.
          <br />
          Thoughtfully styled.
        </p>

        <div className="space-y-4">
          <button className="w-full rounded-xl border p-4 hover:bg-gray-50 transition">
            Today's Edit
          </button>

          <button className="w-full rounded-xl border p-4 hover:bg-gray-50 transition">
            My Closet
          </button>

          <button className="w-full rounded-xl border p-4 hover:bg-gray-50 transition">
            Lookbook
          </button>

          <button className="w-full rounded-xl border p-4 hover:bg-gray-50 transition">
            Packing
          </button>
        </div>
      </div>
    </main>
  );
}