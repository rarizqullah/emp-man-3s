# Fitur Rotasi Shift

## Overview
Fitur Rotasi Shift memungkinkan sistem untuk secara otomatis mengganti shift karyawan setiap minggu antara Shift A dan Shift B. Sistem ini berguna untuk departemen yang membutuhkan pergantian shift secara rutin dan teratur.

## Konsep Dasar

### 1. Grup Rotasi Shift
- Satu grup rotasi terdiri dari 2 shift yang saling berpasangan (Shift A dan Shift B)
- Karyawan tidak lagi ditugaskan ke shift tertentu secara permanen, melainkan ke grup rotasi
- Setiap grup memiliki tanggal mulai (anchor date) yang menentukan kapan rotasi dimulai

### 2. Logika Rotasi
- Rotasi berganti setiap minggu, dimulai pada hari Senin pukul 00:00
- Minggu ganjil (1, 3, 5, dst): Karyawan bekerja pada Shift A
- Minggu genap (2, 4, 6, dst): Karyawan bekerja pada Shift B

### 3. Contoh Skenario
**Grup Rotasi: "Rotasi Produksi Pagi-Malam"**
- Shift A: Shift Pagi (07:00 - 15:00)
- Shift B: Shift Malam (19:00 - 03:00)
- Tanggal Mulai: Senin, 21 Juli 2025

**Timeline:**
- Minggu 1 (21-27 Juli): Rafi → Shift Pagi, Aziz → Shift Pagi
- Minggu 2 (28 Juli - 3 Agustus): Rafi → Shift Malam, Aziz → Shift Malam
- Minggu 3 (4-10 Agustus): Rafi → Shift Pagi, Aziz → Shift Pagi
- Dan seterusnya...

## Implementasi

### 1. Database Schema
```prisma
model ShiftRotationGroup {
  id              String    @id @default(uuid())
  name            String    @unique
  description     String?
  subDepartmentId String?
  anchorDate      DateTime  // Tanggal referensi
  isActive        Boolean   @default(true)
  shiftAId        String    @unique
  shiftBId        String    @unique
  shiftA          Shift     @relation("ShiftA")
  shiftB          Shift     @relation("ShiftB")
  employees       Employee[]
}

model Employee {
  // ... field lain
  shiftRotationGroupId String?
  shiftRotationGroup   ShiftRotationGroup?
}
```

### 2. API Endpoints

#### Grup Rotasi
- `GET /api/shift-rotation-groups` - Ambil semua grup rotasi
- `POST /api/shift-rotation-groups` - Buat grup rotasi baru
- `PUT /api/shift-rotation-groups/[id]` - Update grup rotasi
- `DELETE /api/shift-rotation-groups/[id]` - Hapus grup rotasi

#### Shift Aktif Karyawan
- `GET /api/employees/active-shift?employeeId=xxx&date=xxx` - Ambil shift aktif karyawan
- `POST /api/employees/active-shift` - Ambil shift aktif multiple karyawan

#### Karyawan Available
- `GET /api/employees/available-for-rotation` - Ambil karyawan yang bisa ditambah ke rotasi

### 3. Utility Functions
```typescript
// Menentukan shift aktif berdasarkan tanggal
getActiveShiftFromRotation(anchorDate, currentDate, shiftAId, shiftBId)

// Menentukan fase rotasi saat ini (A atau B)
getCurrentShiftPhase(anchorDate, currentDate)

// Validasi tanggal mulai rotasi
validateAnchorDate(anchorDate, currentDate)
```

## Cara Penggunaan

### 1. Membuat Grup Rotasi
1. Buka halaman **Konfigurasi → Shifts**
2. Klik tombol **"Rotasi Shift"**
3. Klik **"Tambah Grup Rotasi"**
4. Isi form:
   - **Nama Grup**: Nama identifikasi grup (contoh: "Rotasi Produksi Pagi-Malam")
   - **Deskripsi**: Penjelasan tambahan (opsional)
   - **Sub-Departemen**: Batasi grup untuk sub-departemen tertentu (opsional)
   - **Shift A**: Pilih shift pertama
   - **Shift B**: Pilih shift kedua
   - **Tanggal Mulai**: Tanggal dimulainya rotasi (sebaiknya hari Senin)
5. Klik **"Simpan"**

### 2. Menambahkan Karyawan ke Grup Rotasi
1. Edit grup rotasi yang sudah dibuat
2. Pilih karyawan yang akan ditambahkan ke grup
3. Simpan perubahan

### 3. Melihat Shift Aktif Karyawan
Sistem akan secara otomatis menentukan shift aktif karyawan berdasarkan:
- Tanggal saat ini
- Grup rotasi yang diikuti
- Tanggal mulai rotasi

## Validasi dan Batasan

### 1. Validasi Grup Rotasi
- Nama grup harus unik
- Shift A dan Shift B harus berbeda
- Tanggal mulai tidak boleh di masa depan
- Satu shift hanya bisa digunakan dalam satu grup rotasi aktif

### 2. Validasi Karyawan
- Karyawan hanya bisa tergabung dalam satu grup rotasi
- Karyawan yang sudah dalam grup rotasi tidak bisa ditugaskan ke shift tetap

### 3. Prioritas Shift
- Jika karyawan dalam grup rotasi → gunakan shift dari rotasi
- Jika tidak dalam grup rotasi → gunakan shift tetap yang ditugaskan

## Komponen UI

### 1. ShiftRotationDialog
Dialog utama untuk mengelola grup rotasi dengan fitur:
- Tampilkan daftar grup rotasi dengan status real-time
- Form tambah/edit grup rotasi
- Konfirmasi hapus grup rotasi
- Indicator shift aktif saat ini

### 2. ActiveShiftDisplay
Komponen untuk menampilkan shift aktif karyawan:
- Mode compact untuk tabel
- Mode card untuk detail lengkap
- Informasi rotasi (jika ada)
- Status fase rotasi saat ini

## Monitoring dan Maintenance

### 1. Monitoring Rotasi
- Dashboard menampilkan status rotasi real-time
- Log perubahan shift otomatis
- Alert jika ada konflik atau error

### 2. Maintenance
- Backup grup rotasi sebelum perubahan besar
- Monitor performa query shift aktif
- Cleanup data rotasi yang tidak aktif

## Troubleshooting

### 1. Shift Tidak Berubah
- Periksa status aktif grup rotasi
- Pastikan tanggal mulai sudah lewat
- Cek assignment karyawan ke grup

### 2. Konflik Shift
- Pastikan shift tidak digunakan di multiple grup aktif
- Cek validasi tanggal dan hari kerja

### 3. Performance Issues
- Gunakan index pada field yang sering di-query
- Cache hasil perhitungan shift aktif
- Optimasi query dengan include yang tepat

## Future Enhancements

1. **Rotasi Multi-Shift**: Support rotasi lebih dari 2 shift
2. **Custom Schedule**: Rotasi dengan pola khusus (tidak setiap minggu)
3. **Holiday Handling**: Pertimbangan hari libur dalam rotasi
4. **Notification**: Notifikasi ke karyawan sebelum shift berubah
5. **Reporting**: Laporan statistik rotasi dan efektivitas
6. **Mobile App**: Interface mobile untuk cek shift aktif
