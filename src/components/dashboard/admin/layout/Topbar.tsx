export default function Topbar() {
  return (
    <header className="flex min-h-20 flex-col gap-3 bg-[#1F2747] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <input
        type="text"
        placeholder="Cari"
        className="w-full rounded-full bg-white/10 px-4 py-2 text-sm placeholder-white/60 focus:outline-none sm:max-w-xs"
      />

      <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
        <span className="hidden text-sm sm:inline">Indonesia</span>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-300 sm:h-10 sm:w-10" />
          <div className="text-sm leading-tight">
            <p className="font-medium">Moni Roy</p>
            <p className="text-xs text-white/70">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
