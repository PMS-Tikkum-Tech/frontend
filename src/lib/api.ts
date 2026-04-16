export async function fetchDashboardData(filter: string) {
  void filter;
  await new Promise((res) => setTimeout(res, 1000)); // simulate loading

  return {
    stats: {
      totalProperti: 30,
      unitTerisi: 15,
      perawatanAktif: 6,
      pembayaranTertunda: 15,
    },
    revenue: [
      { month: "Jan", pendapatan: 50, pengeluaran: 30 },
      { month: "Feb", pendapatan: 70, pengeluaran: 45 },
      { month: "Mar", pendapatan: 60, pengeluaran: 40 },
      { month: "Apr", pendapatan: 90, pengeluaran: 55 },
    ],
    occupancy: [
      { name: "Terisi", value: 67 },
      { name: "Kosong", value: 33 },
    ],
    payment: [
      { name: "Sudah Dibayar", value: 40 },
      { name: "Menunggu", value: 85 },
      { name: "Terlambat", value: 55 },
    ],
    source: [
      { name: "TikTok", value: 35 },
      { name: "Instagram", value: 25 },
      { name: "Facebook", value: 15 },
      { name: "Mamikos", value: 25 },
    ],
  };
}
