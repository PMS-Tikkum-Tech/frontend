export type LanguageCode = "id" | "en";

type RegexReplacementRule = {
  pattern: RegExp;
  replace: string | ((substring: string, ...args: string[]) => string);
};

const EXACT_ID_TO_EN: Record<string, string> = {
  "Bahasa": "Language",
  "Beranda": "Home",
  "Tentang": "About",
  "Sewa": "Rent",
  "Kerjasama": "Partnership",
  "Masuk": "Sign In",
  "Daftar": "Register",
  "Masuk Dasbor": "Open Dashboard",
  "Kembali ke Beranda": "Back to Home",
  "Selamat datang di KIKOST": "Welcome to KIKOST",
  "Masuk atau daftar untuk mulai menggunakan layanan KIKOST.":
    "Sign in or register to start using KIKOST.",
  "Buat Akun KIKOST": "Create a KIKOST Account",
  "Verifikasi OTP": "OTP Verification",
  "Masuk ke Akun Anda": "Sign In to Your Account",
  "Isi data singkat untuk membuat akun penyewa.":
    "Fill in a few details to create a tenant account.",
  "Masukkan kode 6 digit OTP dari WhatsApp.":
    "Enter the 6-digit OTP code from WhatsApp.",
  "Gunakan email dan kata sandi untuk melanjutkan.":
    "Use your email and password to continue.",
  "Kode OTP sudah dikirim. Lanjutkan verifikasi untuk menyelesaikan pendaftaran.":
    "The OTP code has been sent. Continue verification to complete the registration.",
  "Nomor terdaftar:": "Registered number:",
  "Kode OTP (dev):": "OTP code (dev):",
  "Pendaftaran berhasil. Silakan masuk.":
    "Registration was successful. Please sign in.",
  "Memuat halaman autentikasi...": "Loading authentication page...",
  "Memuat formulir autentikasi...": "Loading authentication form...",
  "Promo Spesial Mahasiswa IPB": "Special Promo for IPB Students",
  "Gaya Hidup Kost Modern, Nyaman dan Dekat Kampus":
    "Modern Boarding House Living, Comfortable and Close to Campus",
  "Nyaman dan Dekat Kampus": "Comfortable and Close to Campus",
  "Jelajahi hunian siap huni dengan fasilitas lengkap, proses pemesanan cepat, dan dukungan administrator responsif tanpa repot.":
    "Explore move-in-ready stays with complete facilities, a fast booking process, and responsive administrator support.",
  "Lihat Semua Kost": "View All Boarding Houses",
  "Pelajari Layanan": "Learn About the Services",
  "Lokasi Populer": "Popular Location",
  "Promo Bulan Ini": "This Month's Promo",
  "Terbatas": "Limited",
  "Potongan biaya admin dan bonus khusus penghuni baru":
    "Admin fee discounts and special bonuses for new residents",
  "Klaim promo saat memesan unit. Berlaku untuk periode pendaftaran bulan ini.":
    "Claim the promo when booking a unit. Valid for this month's registration period.",
  "Periode promo: April 2026": "Promo period: April 2026",
  "Diskon Khusus": "Special Discount",
  "Hingga Rp300.000": "Up to Rp300,000",
  "Survei Gratis": "Free Survey",
  "Tanpa biaya kunjungan": "No visit fee",
  "Uang Kembali": "Cashback",
  "Khusus pembayaran awal": "For initial payments only",
  "Butuh Bantuan?": "Need Help?",
  "Tim Admin Siap Bantu Cari Unit Terbaik":
    "The Admin Team Is Ready to Help Find the Best Unit",
  "Konsultasi cepat untuk rekomendasi unit sesuai anggaran, lokasi, dan kebutuhanmu.":
    "Get a quick consultation for unit recommendations based on your budget, location, and needs.",
  "• Rekomendasi unit yang masih tersedia": "• Recommendations for currently available units",
  "• Bantuan jadwal kunjungan dan proses pemesanan":
    "• Help with visit scheduling and the booking process",
  "Hubungi Admin": "Contact Admin",
  "Pilihan Terpopuler": "Most Popular Picks",
  "Pilihan Hunian Terpopuler": "Most Popular Stays",
  "Rekomendasi hunian yang paling sering dilihat dan dipilih penghuni Kyra Stay.":
    "Stay recommendations most frequently viewed and chosen by KIKOST residents.",
  "Masuk untuk melihat katalog hunian": "Sign in to view the stay catalog",
  "Belum ada properti tersedia": "No properties available yet",
  "Sistem yang dipakai saat ini hanya membuka katalog properti setelah pengguna masuk.":
    "The current system only opens the property catalog after the user signs in.",
  "Data properti akan muncul otomatis setelah ditambahkan dari dasbor administrator.":
    "Property data will appear automatically after it is added from the administrator dashboard.",
  "Masuk untuk lihat katalog": "Sign in to view the catalog",
  "Keunggulan Kyra Stay": "KIKOST Advantages",
  "Kenapa Banyak Mahasiswa Pilih Kyra Stay?":
    "Why Do So Many Students Choose KIKOST?",
  "Fokus kami bukan hanya tempat tinggal, tapi pengalaman hunian yang aman, nyaman, dan mendukung aktivitas kuliah harian.":
    "Our focus is not only housing, but also a stay experience that is safe, comfortable, and supportive of daily academic life.",
  "Keamanan 24 Jam": "24-Hour Security",
  "Akses masuk terkontrol, area terpantau, dan tim operasional siaga.":
    "Controlled access, monitored areas, and an on-call operations team.",
  "Komunitas Positif": "Positive Community",
  "Suasana penghuni nyaman untuk belajar, networking, dan aktivitas harian.":
    "A comfortable resident atmosphere for studying, networking, and daily activities.",
  "Internet Stabil": "Reliable Internet",
  "Cocok untuk kuliah online, streaming materi, dan tugas kelompok.":
    "Suitable for online classes, content streaming, and group assignments.",
  "Pembayaran Praktis": "Convenient Payments",
  "Tagihan terpusat dan histori pembayaran mudah dipantau setiap bulan.":
    "Centralized bills and payment history that are easy to monitor every month.",
  "Alur Pemesanan": "Booking Flow",
  "Cara Memesan Dalam 3 Langkah": "How to Book in 3 Steps",
  "Proses sewa dirancang sederhana supaya kamu bisa cepat memilih unit, berkunjung, dan lanjut memesan tanpa repot.":
    "The rental process is designed to be simple so you can quickly choose a unit, visit, and continue booking with ease.",
  "Pilih Area dan Unit": "Choose an Area and Unit",
  "Saring berdasarkan lokasi, tipe hunian, dan tanggal masuk.":
    "Filter by location, stay type, and move-in date.",
  "Jadwalkan Kunjungan": "Schedule a Visit",
  "Tentukan waktu kunjungan langsung dari halaman daftar hunian.":
    "Choose your visit time directly from the stay listing page.",
  "Pemesanan Daring": "Online Booking",
  "Lanjutkan pemesanan dan pembayaran dengan proses yang transparan.":
    "Proceed with booking and payment through a transparent process.",
  "Cerita Penghuni": "Resident Stories",
  "Penghuni 11 bulan": "Resident for 11 months",
  "Penghuni 1 tahun": "Resident for 1 year",
  "Penghuni 8 bulan": "Resident for 8 months",
  "Informasi unitnya detail, jadi tidak buang waktu saat survei. Proses pemesanan juga cepat.":
    "The unit information is detailed, so I did not waste time during the survey. The booking process was also fast.",
  "Yang paling membantu itu filter lokasi dan jarak ke kampus. Tinggal pilih yang paling cocok.":
    "The most helpful part was the location filter and distance to campus. I just picked the most suitable one.",
  "Suasana kost rapi dan aman. Buat fokus kuliah lebih enak karena fasilitasnya lengkap.":
    "The boarding house is tidy and safe. It is easier to focus on studying because the facilities are complete.",
  "FAQ Singkat": "Quick FAQ",
  "Pertanyaan yang Sering Ditanyakan": "Frequently Asked Questions",
  "Ringkasan jawaban cepat sebelum kamu pilih unit.":
    "A quick summary of answers before you choose a unit.",
  "Apakah bisa memesan tanpa survei lokasi?":
    "Can I book without an on-site survey?",
  "Bisa. Kamu tetap disarankan melihat detail unit, foto, dan fasilitas sebelum membayar.":
    "Yes. You are still advised to check the unit details, photos, and facilities before making a payment.",
  "Bagaimana cara mengajukan jadwal kunjungan?":
    "How do I request a visit schedule?",
  "Masuk ke halaman sewa, pilih properti yang diinginkan, lalu tentukan tanggal kunjungan.":
    "Open the rental page, choose the property you want, then set the visit date.",
  "Apakah biaya bulanan sudah termasuk internet?":
    "Does the monthly fee already include internet?",
  "Sebagian besar unit sudah termasuk internet. Cek detail fasilitas pada masing-masing properti.":
    "Most units already include internet. Check each property's facility details.",
  "Rekomendasi Unit": "Unit Recommendations",
  "Dapatkan rekomendasi unit paling cocok untukmu":
    "Get the most suitable unit recommendations for you",
  "Tim kami bantu pilihkan unit berdasarkan anggaran, lokasi, dan gaya hidupmu.":
    "Our team helps you choose units based on your budget, location, and lifestyle.",
  "Cari Unit Sekarang": "Search Units Now",
  "Lihat Program Kerjasama": "View Partnership Program",
  "Menu": "Menu",
  "Layanan": "Services",
  "Kontak": "Contact",
  "Pencarian Kost": "Boarding House Search",
  "WhatsApp Administrator": "Administrator WhatsApp",
  "Bogor, Jawa Barat": "Bogor, West Java",
  "dikelola oleh": "managed by",
  "Platform hunian mahasiswa dengan proses sewa yang praktis, aman, dan transparan.":
    "A student housing platform with a practical, safe, and transparent rental process.",
  "Tentang Kyra Stay": "About KIKOST",
  "Hunian Mahasiswa yang Nyaman, Aman, dan Mendukung Produktivitas":
    "Student Housing That Is Comfortable, Safe, and Supports Productivity",
  "Kyra Stay hadir sebagai ekosistem hunian modern untuk mahasiswa dan profesional muda, dengan pengelolaan yang transparan, cepat, dan berorientasi kualitas hidup penghuni.":
    "KIKOST is here as a modern housing ecosystem for students and young professionals, with transparent, fast management focused on residents' quality of life.",
  "Lihat Hunian": "View Stays",
  "Kerja Sama Properti": "Property Partnership",
  "Pengalaman Tinggal yang Seimbang": "A Balanced Living Experience",
  "Fokus belajar, kenyamanan harian, dan interaksi komunitas dalam satu lingkungan hunian.":
    "Focus on studying, daily comfort, and community interaction in one stay environment.",
  "Tingkat kepuasan penghuni": "Resident satisfaction level",
  "Berdasarkan evaluasi pengalaman tinggal": "Based on stay experience evaluations",
  "Profil Perusahaan": "Company Profile",
  "Profil Perusahaan Kyra Stay": "KIKOST Company Profile",
  "Nama Perusahaan": "Company Name",
  "Fokus Utama": "Main Focus",
  "Model Layanan": "Service Model",
  "Standar Operasional": "Operational Standards",
  "Pengelolaan hunian mahasiswa dan profesional muda":
    "Student and young professional housing management",
  "Manajemen end-to-end dan kemitraan properti":
    "End-to-end management and property partnership",
  "Keamanan, kenyamanan, dan transparansi layanan":
    "Security, comfort, and service transparency",
  "Lokasi Relevan untuk Mahasiswa": "Locations Relevant for Students",
  "Fokus di area strategis dekat kampus, transportasi, dan kebutuhan harian.":
    "Focused on strategic areas close to campus, transportation, and daily needs.",
  "Keamanan Sebagai Prioritas": "Security as a Priority",
  "Hunian dikelola dengan standar operasional yang menjaga rasa aman penghuni.":
    "The stays are managed with operational standards that maintain residents' sense of safety.",
  "Fasilitas Siap Pakai": "Ready-to-Use Facilities",
  "Akses internet stabil, area tinggal nyaman, dan dukungan perawatan terjadwal.":
    "Stable internet access, comfortable living areas, and scheduled maintenance support.",
  "Pengelolaan Berbasis Data": "Data-Driven Management",
  "Keputusan operasional dan harga didorong oleh data performa properti.":
    "Operational and pricing decisions are driven by property performance data.",
  "Kurasi Properti": "Property Curation",
  "Setiap unit dievaluasi berdasarkan lokasi, kondisi bangunan, dan fasilitas inti.":
    "Each unit is evaluated based on location, building condition, and core facilities.",
  "Standarisasi Layanan": "Service Standardization",
  "Proses orientasi penghuni, pembayaran, dan dukungan harian disusun terstruktur.":
    "Resident orientation, payments, and daily support are arranged in a structured way.",
  "Pemantauan Berkala": "Regular Monitoring",
  "Kinerja hunian dipantau melalui indikator okupansi, kepuasan, dan respon operasional.":
    "Stay performance is monitored through occupancy, satisfaction, and operational response indicators.",
  "Perbaikan Berkelanjutan": "Continuous Improvement",
  "Masukan penyewa dan pemilik diterjemahkan menjadi peningkatan kualitas layanan.":
    "Feedback from tenants and owners is translated into service quality improvements.",
  "Program Kemitraan Pemilik Properti":
    "Property Owner Partnership Program",
  "Tingkatkan Nilai Properti Anda Bersama Kyra Stay":
    "Increase the Value of Your Property with KIKOST",
  "Kami bantu pemilik kost dan investor mengelola hunian secara profesional: okupansi lebih stabil, operasional lebih rapi, dan laporan keuangan transparan.":
    "We help boarding house owners and investors manage stays professionally: more stable occupancy, smoother operations, and transparent financial reports.",
  "Ajukan Kerja Sama": "Submit Partnership Request",
  "Pelajari Lebih Lanjut": "Learn More",
  "Dasbor Operasional dan Finansial":
    "Operational and Financial Dashboard",
  "Pemantauan hunian, pembayaran, dan laporan kinerja dalam satu panel.":
    "Monitor stays, payments, and performance reports in one panel.",
  "30 Hari Pertama Kemitraan": "First 30 Days of Partnership",
  "Linimasa Orientasi yang Jelas": "A Clear Onboarding Timeline",
  "Minggu 1: Audit unit & evaluasi pasar":
    "Week 1: Unit audit & market evaluation",
  "Minggu 2: Persiapan materi listing & harga":
    "Week 2: Listing materials & pricing preparation",
  "Minggu 3: Aktivasi promosi & penjadwalan survei":
    "Week 3: Promotion activation & survey scheduling",
  "Minggu 4: Evaluasi awal & penyesuaian strategi":
    "Week 4: Initial evaluation & strategy adjustments",
  "Pemasaran & Daftar Hunian": "Marketing & Listings",
  "Optimasi halaman properti agar lebih mudah ditemukan calon penyewa.":
    "Optimize property pages so prospective tenants can find them more easily.",
  "Seleksi Penyewa": "Tenant Selection",
  "Proses penyaringan awal untuk meningkatkan kualitas dan kecocokan penyewa.":
    "Initial screening to improve tenant quality and fit.",
  "Pengelolaan Pembayaran": "Payment Management",
  "Pemantauan tagihan, pengingat jatuh tempo, dan rekap pembayaran berkala.":
    "Monitor bills, due reminders, and periodic payment summaries.",
  "Perawatan Properti": "Property Maintenance",
  "Koordinasi keluhan penghuni dan tindak lanjut perawatan lebih terstruktur.":
    "Resident complaint coordination and maintenance follow-up become more structured.",
  "Laporan Kinerja": "Performance Reports",
  "Laporan okupansi, arus kas, dan indikator performa untuk pemilik properti.":
    "Occupancy, cash flow, and performance indicator reports for property owners.",
  "Dukungan Penghuni": "Resident Support",
  "Pendampingan komunikasi penyewa agar pengalaman tinggal tetap positif.":
    "Communication assistance for tenants so their living experience stays positive.",
  "Model Bagi Hasil": "Revenue Sharing Model",
  "Pendapatan dibagi berdasarkan performa unit dan skema yang disepakati.":
    "Revenue is shared based on unit performance and the agreed scheme.",
  "Cocok untuk: pemilik yang ingin potensi pertumbuhan maksimal.":
    "Suitable for: owners who want maximum growth potential.",
  "Model Sewa Tetap": "Fixed Rent Model",
  "Pendapatan bulanan lebih stabil sesuai nilai sewa yang disepakati.":
    "Monthly income is more stable according to the agreed rental value.",
  "Cocok untuk: pemilik yang mengutamakan arus kas konsisten.":
    "Suitable for: owners who prioritize consistent cash flow.",
  "Model Campuran": "Hybrid Model",
  "Kombinasi komponen tetap dan variabel untuk fleksibilitas manajemen.":
    "A combination of fixed and variable components for management flexibility.",
  "Cocok untuk: properti dengan segmen pasar yang dinamis.":
    "Suitable for: properties with dynamic market segments.",
  "Cari Kost Sesuai Kebutuhanmu": "Find a Stay That Matches Your Needs",
  "Lihat Semua": "View All",
  "Cari Kost Sekarang": "Search for a Stay Now",
  "Pencarian Cerdas": "Smart Search",
  "Lokasi": "Location",
  "Tipe Hunian": "Stay Type",
  "Tanggal Masuk": "Move-in Date",
  "Semua Tipe": "All Types",
  "Kost Putra": "Male Boarding House",
  "Kost Putri": "Female Boarding House",
  "Kost Campur": "Mixed Boarding House",
  "Dekat IPB": "Near IPB",
  "Contoh: Dramaga": "Example: Dramaga",
  "Cari...": "Search...",
  "Tagihan & Pembayaran": "Bills & Payments",
  "Lihat Tagihan & Pembayaran": "View Bills & Payments",
  "Lihat Status Perawatan": "View Maintenance Status",
  "Detail Kost": "Stay Details",
  "Kost Saya": "My Stay",
  "Tagihan Aktif": "Active Bills",
  "Perawatan Aktif": "Active Maintenance",
  "Hunian Aktif": "Active Stays",
  "Jatuh Tempo Terdekat": "Nearest Due Date",
  "Tagihan Terakhir": "Latest Bill",
  "Status Hunian": "Stay Status",
  "Nama Kost": "Boarding House Name",
  "Tipe Kost": "Boarding House Type",
  "Jadwal Kunjungan": "Visit Schedule",
  "Favorit": "Favorites",
  "Notifikasi": "Notifications",
  "Pusat Bantuan": "Help Center",
  "Ajukan Keluhan": "Submit Complaint",
  "Profil": "Profile",
  "Kata Sandi": "Password",
  "Keluar": "Logout",
  "Aktivitas Saya": "My Activity",
  "Daftar survei kost yang sudah dijadwalkan":
    "A list of boarding house surveys that have been scheduled",
  "Kost yang kamu simpan": "Boarding houses you have saved",
  "Tagihan baru diterbitkan": "New bill issued",
  "Tagihan melewati jatuh tempo": "Bill is overdue",
  "Pembayaran berhasil": "Payment successful",
  "Tagihan dibatalkan": "Bill cancelled",
  "Perawatan sedang dikerjakan": "Maintenance in progress",
  "Perawatan telah selesai": "Maintenance completed",
  "Menunggu Pembayaran": "Awaiting Payment",
  "Menunggu Bayar": "Awaiting Payment",
  "Terlambat": "Overdue",
  "Jatuh Tempo": "Overdue",
  "Dibatalkan": "Cancelled",
  "Lunas": "Paid",
  "Belum Ada Notifikasi": "No Notifications Yet",
  "Total Notifikasi": "Total Notifications",
  "Status Profil": "Profile Status",
  "Lengkap": "Complete",
  "Nama Akun": "Account Name",
  "Email": "Email",
  "Simpan Profil": "Save Profile",
  "Menyimpan...": "Saving...",
  "Penyewa": "Tenant",
  "Perawatan": "Maintenance",
  "Bantuan": "Help",
  "Dasbor": "Dashboard",
  "Properti": "Properties",
  "Keuangan": "Finance",
  "Komunikasi": "Communication",
  "Akun": "Accounts",
  "Catatan Aktivitas": "Activity Logs",
  "Beranda KIKOST": "KIKOST Home",
  "Beranda Kyra Stay": "KIKOST Home",
  "Klik untuk ubah foto profil": "Click to change the profile photo",
  "Avatar administrator": "Administrator avatar",
  "Administrator": "Administrator",
  "Buka menu": "Open menu",
  "Tutup menu": "Close menu",
  "Buka notifikasi": "Open notifications",
  "Buka menu navigasi": "Open navigation menu",
  "Tutup sidebar": "Close sidebar",
  "Tutup panel profil": "Close profile panel",
  "Cari nama atau alamat kost...":
    "Search by boarding house name or address...",
  "Cari properti, subjek, atau isi pesan...":
    "Search properties, subjects, or message content...",
  "Cari properti atau deskripsi transaksi...":
    "Search properties or transaction descriptions...",
  "Cari masalah, properti, unit, atau penyewa...":
    "Search issues, properties, units, or tenants...",
  "Cari nama, email, atau nomor penyewa...":
    "Search tenant names, emails, or phone numbers...",
  "Cari nama, email, peran, atau nomor telepon":
    "Search names, emails, roles, or phone numbers",
  "Cari faktur, properti, unit, atau penyewa...":
    "Search invoices, properties, units, or tenants...",
  "Cari nama atau alamat properti...":
    "Search property names or addresses...",
  "Cari aktivitas, administrator, atau modul":
    "Search activities, administrators, or modules",
  "Buka Kost Saya": "Open My Stay",
  "Lihat Pembayaran": "View Payments",
  "Buka Perawatan": "Open Maintenance",
  "Lihat Jadwal": "View Schedule",
  "Tagihan Tertunda": "Pending Bills",
  "Pembayaran Tertunda": "Pending Payments",
  "Nominal Aktif": "Outstanding Amount",
  "Data pembayaran akan masuk ke dashboard admin untuk proses review.":
    "The payment data will go to the admin dashboard for review.",
  "pembayaran akan masuk ke admin untuk proses review":
    "payment will be sent to the admin for review",
  "pembayaran akan masuk ke admin untuk proses review.":
    "payment will be sent to the admin for review.",
};

const FRAGMENT_ID_TO_EN: Array<[string, string]> = [
  ["Tagihan & Pembayaran", "Bills & Payments"],
  ["Status Pemesanan Penyewa", "Tenant Booking Status"],
  ["Metode Pembayaran", "Payment Method"],
  ["Jadwal Kirim", "Send Schedule"],
  ["Nama Penyewa", "Tenant Name"],
  ["Email Penyewa", "Tenant Email"],
  ["Catatan Penyewa", "Tenant Notes"],
  ["Pesan Balasan ke Penyewa", "Reply Message to Tenant"],
  ["Jadwal Tindak Lanjut", "Follow-up Schedule"],
  ["Tindak Lanjut Permintaan Jadwal Kunjungan", "Follow-up on Visit Schedule Request"],
  ["Pembayaran Tertunda", "Pending Payments"],
  ["Tagihan Tertunggak", "Outstanding Bills"],
  ["Pembayaran sudah lunas", "Payment has been paid"],
  ["Tagihan sudah dibatalkan", "Bill has been cancelled"],
  ["Tagihan sudah dibatalkan otomatis karena jatuh tempo.", "The bill has been automatically cancelled because it is overdue."],
  ["Dibatalkan otomatis karena pembayaran sudah melewati tanggal jatuh tempo.", "Automatically cancelled because the payment passed the due date."],
  ["Laporan Perawatan", "Maintenance Report"],
  ["Sumber Penyewa", "Tenant Source"],
  ["Status Pembayaran", "Payment Status"],
  ["Jadwal Kunjungan", "Visit Schedule"],
  ["Pencarian Kost", "Boarding House Search"],
  ["Konsultasi Awal", "Initial Consultation"],
  ["Pengelolaan End-to-End", "End-to-End Management"],
  ["Kemitraan Properti", "Property Partnership"],
  ["Perawatan Properti", "Property Maintenance"],
  ["Pengelolaan Pembayaran", "Payment Management"],
  ["Pengelolaan Berbasis Data", "Data-Driven Management"],
  ["Standarisasi Layanan", "Service Standardization"],
  ["Program Kemitraan", "Partnership Program"],
  ["Pusat Bantuan", "Help Center"],
  ["Ajukan Keluhan", "Submit Complaint"],
  ["Jadwal survei kost berhasil dibatalkan.", "The boarding house survey schedule has been cancelled successfully."],
  ["Keluhan berhasil dikirim. Tim kami akan segera menindaklanjuti.", "Complaint submitted successfully. Our team will follow up soon."],
  ["Tagihan baru diterbitkan", "New bill issued"],
  ["Tagihan melewati jatuh tempo", "Bill passed the due date"],
  ["Pembayaran berhasil", "Payment successful"],
  ["Perawatan sedang dikerjakan", "Maintenance in progress"],
  ["Perawatan telah selesai", "Maintenance completed"],
  ["Tagihan Aktif", "Active Bills"],
  ["Perawatan Aktif", "Active Maintenance"],
  ["Hunian Aktif", "Active Stays"],
  ["Notifikasi Baru", "New Notifications"],
  ["Total Tagihan", "Total Bills"],
  ["Total Penyewa", "Total Tenants"],
  ["Properti Aktif", "Active Properties"],
  ["Penyewa Aktif", "Active Tenants"],
  ["Tingkat Hunian", "Occupancy Rate"],
  ["Rata-rata Okupansi", "Average Occupancy"],
  ["Area Terjangkau", "Covered Areas"],
  ["Perawatan", "Maintenance"],
  ["Penyewa", "Tenant"],
  ["Properti", "Property"],
  ["Komunikasi", "Communication"],
  ["Keuangan", "Finance"],
  ["Akun", "Account"],
  ["Notifikasi", "Notifications"],
  ["Favorit", "Favorites"],
  ["Profil", "Profile"],
  ["Kata Sandi", "Password"],
  ["Keluhan", "Complaint"],
  ["Jatuh Tempo", "Overdue"],
  ["Menunggu Pembayaran", "Awaiting Payment"],
  ["Menunggu Bayar", "Awaiting Payment"],
  ["Pembayaran", "Payment"],
  ["Tagihan", "Bill"],
  ["Hunian", "Stay"],
  ["Penyewa", "Tenant"],
  ["Pemilik Properti", "Property Owner"],
  ["Pemilik", "Owner"],
  ["Dasbor", "Dashboard"],
  ["Beranda", "Home"],
  ["Tentang", "About"],
  ["Kerjasama", "Partnership"],
  ["Masuk Dasbor", "Open Dashboard"],
  ["Masuk / Daftar", "Sign In / Register"],
  ["Masuk", "Sign In"],
  ["Daftar", "Register"],
  ["Lihat", "View"],
  ["Cari", "Search"],
  ["Tambah", "Add"],
  ["Ubah", "Edit"],
  ["Hapus", "Delete"],
  ["Simpan", "Save"],
  ["Batal", "Cancel"],
  ["Tutup", "Close"],
  ["Buka", "Open"],
  ["Keluar", "Logout"],
  ["Selesai", "Completed"],
  ["Diproses", "Processed"],
  ["Berhasil", "Successful"],
  ["Gagal", "Failed"],
  ["Minggu", "Week"],
  ["bulan", "months"],
  ["tahun", "years"],
  ["Bogor, Jawa Barat", "Bogor, West Java"],
  ["WhatsApp Administrator", "Administrator WhatsApp"],
];

FRAGMENT_ID_TO_EN.sort((first, second) => second[0].length - first[0].length);

const REGEX_ID_TO_EN: RegexReplacementRule[] = [
  {
    pattern: /^(\d+)\s+Hunian Aktif$/i,
    replace: "$1 Active Stays",
  },
  {
    pattern: /^(\d+)\s+Tagihan$/i,
    replace: "$1 Bills",
  },
  {
    pattern: /^(\d+)\s+Laporan$/i,
    replace: "$1 Reports",
  },
  {
    pattern: /^(\d+)\s+properti$/i,
    replace: "$1 properties",
  },
  {
    pattern: /^(\d+)\s+unit aktif di (\d+)\s+kost$/i,
    replace: "$1 active units in $2 boarding houses",
  },
  {
    pattern: /^Periode promo:\s+(.+)$/i,
    replace: "Promo period: $1",
  },
  {
    pattern: /^Minggu\s+(\d+):\s+(.+)$/i,
    replace: "Week $1: $2",
  },
  {
    pattern: /^Nomor terdaftar:\s+(.+)$/i,
    replace: "Registered number: $1",
  },
  {
    pattern: /^Kode OTP \(dev\):\s+(.+)$/i,
    replace: "OTP code (dev): $1",
  },
];

const normalizeText = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const preserveEdgeWhitespace = (original: string, translated: string) => {
  const leadingWhitespace = original.match(/^\s*/)?.[0] || "";
  const trailingWhitespace = original.match(/\s*$/)?.[0] || "";

  return `${leadingWhitespace}${translated}${trailingWhitespace}`;
};

const applyFragmentTranslations = (value: string) => {
  let result = value;

  for (const [source, target] of FRAGMENT_ID_TO_EN) {
    if (!result.includes(source)) {
      continue;
    }

    result = result.split(source).join(target);
  }

  return result;
};

const applyRegexTranslations = (value: string) => {
  let result = value;

  for (const rule of REGEX_ID_TO_EN) {
    result = result.replace(rule.pattern, rule.replace as never);
  }

  return result;
};

export const translateText = (value: string, language: LanguageCode) => {
  if (language === "id") {
    return value;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return value;
  }

  const exactTranslation = EXACT_ID_TO_EN[normalized];
  const translated =
    exactTranslation ||
    applyRegexTranslations(applyFragmentTranslations(normalized));

  if (!translated || translated === normalized) {
    return value;
  }

  return preserveEdgeWhitespace(value, translated);
};
