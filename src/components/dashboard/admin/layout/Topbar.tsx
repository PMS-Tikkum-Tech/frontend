export default function Topbar() {
  return (
    <header className="h-20 bg-[#1F2747] text-white flex items-center justify-between px-8">
      <input
        type="text"
        placeholder="Search"
        className="w-80 bg-white/10 rounded-full px-4 py-2 text-sm placeholder-white/60 focus:outline-none"
      />

      <div className="flex items-center gap-6">
        <span className="text-sm">Indonesia</span>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full" />
          <div className="text-sm">
            <p className="font-medium">Moni Roy</p>
            <p className="text-xs text-white/70">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
