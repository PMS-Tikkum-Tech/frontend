# KIKOST Property Management Flow

## Masalah Saat Ini

Data properti masih dipakai sebagai unit operasional bangunan. Contohnya `A1 Cozy`, `A2 Cozy`, dan `A3 Cozy` dibuat sebagai properti terpisah walaupun tenant harus melihat semuanya sebagai satu katalog utama: `Kinara Cozy Kost`.

Efeknya:

- Admin mengulang input properti untuk setiap bangunan.
- Owner melekat ke properti, bukan ke bangunan/blok.
- Tenant melihat data terlalu terpecah.
- Mapping unit dan tenant sulit dibaca dalam satu halaman.

## Model Baru

Hierarki data yang dipakai:

```text
Property
  -> PropertyBuilding
    -> Owner
    -> Unit
      -> TenantAssignment
```

Contoh:

```text
Kinara Cozy Kost
  -> A1 Cozy, owner Ibu Untung
    -> Unit 101, status Kosong
    -> Unit 102, status Terisi, tenant Budi
  -> A2 Cozy, owner Pak Edward
    -> Unit 201, status Booking
  -> A3 Cozy, owner Ibu Lucy
    -> Unit 301, status Maintenance
```

## Flow Admin

1. Admin membuat satu properti utama, misalnya `Kinara Cozy Kost`, tanpa memilih owner.
2. Admin menambahkan bangunan/blok di dalam properti.
3. Setiap bangunan/blok punya owner sendiri.
4. Admin membuat unit di bawah bangunan/blok.
5. Unit punya status: `vacant`, `occupied`, `booking`, `maintenance`.
6. Jika unit terisi, admin mengisi tenant assignment: tenant, WhatsApp, tanggal check-in, tanggal check-out, lama sewa, dan keterangan.
7. Halaman detail properti menampilkan mapping lengkap property -> building -> owner -> unit -> tenant.

## Flow Tenant

1. Tenant hanya melihat satu properti utama, misalnya `Kinara Cozy Kost`.
2. Detail owner bangunan tidak ditampilkan.
3. Tenant melihat unit/kamar dari seluruh bangunan/blok di properti tersebut.
4. Tenant bisa memfilter unit berdasarkan status/ketersediaan, harga, tipe kamar, dan fasilitas.
5. Nama unit untuk tenant diformat tanpa data internal:

```text
building_name + " - Unit " + unit_number
```

Contoh:

```text
A1 Cozy - Unit 1
A2 Cozy - Unit 3
A5 Cozy - Unit 10
```

Tenant boleh melihat nama gedung/blok dan nomor unit, tetapi tidak boleh melihat owner, `owner_id`, `building_id`, `property_id`, atau data laporan internal.

## Flow Registrasi dan Onboarding Tenant

KIKOST memakai progressive profiling. Registrasi dibuat minimal; data lengkap hanya diminta saat tenant ingin booking/sewa.

### Registrasi Minimal

Tenant dapat daftar/masuk cepat dengan:

1. Nomor telepon WhatsApp:
   - Input nomor.
   - Sistem kirim OTP.
   - Tenant input OTP.
   - Akun dibuat setelah token verifikasi dikonsumsi.
2. Email:
   - Input email.
   - Sistem kirim kode verifikasi.
   - Tenant input kode.
   - Akun dibuat setelah token verifikasi dikonsumsi.

Data awal yang disimpan:

```text
user_id
phone_number atau email
verification_status
tenant_status = verified
nama opsional
```

### Saat Booking / Sewa

Ketika tenant submit booking/sewa, backend mengecek data dasar. Jika belum lengkap, response memakai kode:

```text
BASIC_PROFILE_REQUIRED
```

Frontend mengarahkan tenant ke:

```text
/tenant/akun?required=booking&next=<halaman booking>
```

Data dasar wajib:

```text
Nama lengkap
Nomor WhatsApp
Email
NIK / Nomor identitas
Tanggal lahir
Alamat domisili
```

Setelah lengkap:

```text
tenant_status = basic_completed
```

Setelah booking disetujui admin dan lease aktif:

```text
tenant_status = active
```

### Data Lanjutan Opsional

Data berikut tidak wajib untuk booking dan bisa dilengkapi dari halaman profil:

```text
Pekerjaan / status mahasiswa
Nama kampus / perusahaan
Kontak darurat
Nomor kontak darurat
Upload KTP
Upload selfie
```

## Struktur Data Rekomendasi

### properties

```sql
id
name
address
description
property_type
condition
rules
facilities
latitude
longitude
default_owner_id
created_at
updated_at
```

`default_owner_id` hanya fallback untuk data lama. Owner operasional yang benar berada di `property_buildings.owner_id`.

Pada flow baru, form tambah properti tidak mewajibkan `default_owner_id`.

### property_buildings

```sql
id
property_id
owner_id
name
code
total_units_cache
notes
created_at
updated_at
```

Contoh data:

```json
{
  "property_id": 1,
  "owner_id": 12,
  "name": "A1 Cozy",
  "code": "A1"
}
```

### units

```sql
id
property_id
property_building_id
name
unit_type
status
people_allowed
price
facilities
notes
created_at
updated_at
```

Status unit:

```text
vacant
occupied
booking
maintenance
```

### tenant_assignments / leases

```sql
id
property_id
property_building_id
unit_id
tenant_id
tenant_phone
start_date
end_date
duration_months
payment_status
notes
created_at
updated_at
```

## API Contract Rekomendasi

### Admin Detail Property

`GET /api/v1/properties/:id`

```json
{
  "property": {
    "id": 1,
    "name": "Kinara Cozy Kost",
    "address": "Dramaga, Bogor"
  },
  "stats": {
    "block_count": 5,
    "total_units": 50,
    "occupied_units": 32,
    "booking_units": 4,
    "vacant_units": 12,
    "maintenance_units": 2
  },
  "blocks": [
    {
      "id": 10,
      "name": "A1 Cozy",
      "owner": {
        "id": 12,
        "full_name": "Ibu Untung"
      },
      "total_units": 10,
      "occupied_units": 7,
      "booking_units": 1,
      "vacant_units": 2,
      "maintenance_units": 0
    }
  ]
}
```

### Admin Units

`GET /api/v1/properties/:id/units`

```json
[
  {
    "unit_id": 101,
    "unit_name": "101",
    "building_id": 10,
    "building_name": "A1 Cozy",
    "owner_id": 12,
    "owner_name": "Ibu Untung",
    "unit_type": "standard",
    "status": "occupied",
    "people_allowed": 1,
    "price": 1500000,
    "tenant_name": "Budi",
    "tenant_phone": "08123456789",
    "lease_start": "2026-05-01",
    "lease_end": "2027-04-30",
    "notes": "Perpanjangan tahunan"
  }
]
```

### Public Property List

`GET /api/v1/manual_rentals/catalog/properties`

Tenant response tidak perlu expose owner:

```json
{
  "id": 1,
  "name": "Kinara Cozy Kost",
  "address": "Dramaga, Bogor",
  "total_units": 50,
  "available_units": 12,
  "price_min": 1200000,
  "price_max": 2500000,
  "availability_status": "available"
}
```

### Public Property Units

`GET /api/v1/manual_rentals/catalog/properties/:id/units`

```json
[
  {
    "id": 101,
    "name": "101",
    "building_name": "A1 Cozy",
    "unit_type": "standard",
    "status": "vacant",
    "people_allowed": 1,
    "price": 1500000,
    "photo_urls": []
  }
]
```

## Migrasi Data Lama

Untuk data lama yang sudah berupa properti per bangunan:

1. Buat satu properti utama, misalnya `Kinara Cozy Kost`.
2. Ubah properti lama `A1 Cozy`, `A2 Cozy`, dan seterusnya menjadi `property_buildings`.
3. Pindahkan unit dari properti lama ke properti utama dan isi `property_building_id`.
4. Pindahkan owner lama dari `properties.user_id` ke `property_buildings.owner_id`.
5. Redirect public slug/detail lama ke properti utama jika masih ada link lama.

## Kompatibilitas Frontend Saat Ini

Frontend sudah disiapkan untuk membaca field baru seperti `building_name`, `block_name`, `owner_name`, `booking_units`, dan status `booking`. Jika backend belum mengirim field tersebut, frontend tetap fallback dengan memecah nama unit format `A1 Cozy - 101`.
