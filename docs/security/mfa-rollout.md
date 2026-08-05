# MFA rollout for admin and finance

MFA belum diaktifkan dalam perubahan auth ini agar tidak menghasilkan faktor
kedua setengah aman. Desain enforcement-ready berikut wajib menjadi release
terpisah sebelum Rails-only authentication dinyatakan selesai untuk privileged
accounts.

1. TOTP RFC 6238 dengan secret 160-bit atau lebih dari CSPRNG; secret dienkripsi
   memakai Rails encrypted attributes dan key terpisah dari database.
2. Enrollment memerlukan password saat ini, QR/otpauth URI yang tidak dilog,
   serta konfirmasi satu kode TOTP sebelum status aktif.
3. Recovery codes minimal 10 buah, random, ditampilkan sekali, disimpan sebagai
   hash, dan dikonsumsi atomik satu kali.
4. Login admin/finance menghasilkan session `mfa_pending` yang hanya boleh
   memanggil endpoint challenge/logout. Session penuh diterbitkan dan dirotasi
   setelah faktor kedua valid.
5. Batasi challenge per akun/IP dan cegah replay kode dalam time step yang sama.
6. Enable, disable, recovery-code use/regeneration, dan reset oleh support harus
   menghasilkan audit event tanpa secret/kode.
7. Reset MFA membutuhkan prosedur recovery terverifikasi dan dual control untuk
   admin/finance; jangan memakai SMS atau pertanyaan keamanan sebagai satu-satunya
   faktor.
8. Rollout: internal admins → seluruh admin → finance; ukur enrollment, failure,
   recovery, dan lockout sebelum enforcement penuh.

Schema yang disarankan: tabel terpisah `user_mfa_methods` (encrypted secret,
enabled_at, last_used_step) dan `mfa_recovery_codes` (digest, used_at), tanpa
menambahkan secret atau kode pada serializer user.
