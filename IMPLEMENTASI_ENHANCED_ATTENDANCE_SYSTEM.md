# Implementasi Enhanced Attendance System

## Overview
Sistem presensi telah ditingkatkan dengan logika otomatis untuk penyesuaian waktu check-in dan pencatatan jam istirahat serta lembur secara otomatis.

## Fitur Utama yang Diimplementasikan

### 1. Auto Adjustment Waktu Check-in

#### Logika Implementasi:
- **Masuk Lebih Awal**: Jika karyawan check-in sebelum jam shift, waktu check-in akan disesuaikan ke jam mulai shift
- **Masuk Terlambat**: Jika karyawan check-in setelah jam shift, waktu akan dibulatkan ke interval 15 menit berikutnya
- **Masuk Tepat Waktu**: Tidak ada penyesuaian

#### Contoh Skenario:
```
Shift: 07:00 - 14:00

Skenario 1: Masuk Lebih Awal
- Waktu aktual: 06:15
- Waktu tercatat: 07:00
- Alasan: "Masuk lebih awal, disesuaikan ke jam shift 07:00"

Skenario 2: Terlambat Sedikit
- Waktu aktual: 07:07
- Waktu tercatat: 07:15
- Alasan: "Terlambat 7 menit, dibulatkan ke 07:15"

Skenario 3: Terlambat Banyak
- Waktu aktual: 08:05
- Waktu tercatat: 08:15
- Alasan: "Terlambat 65 menit, dibulatkan ke 08:15"
```

### 2. Auto Record Jam Istirahat dan Lembur

#### Jam Istirahat:
- Otomatis tercatat berdasarkan konfigurasi `lunchBreakStart` dan `lunchBreakEnd` di shift
- Hanya tercatat jika karyawan bekerja melewati jam istirahat
- Mengurangi jam kerja pokok secara otomatis

#### Jam Lembur:
- Otomatis tercatat jika karyawan bekerja melewati jam kerja normal
- Berdasarkan konfigurasi `regularOvertimeStart` dan `regularOvertimeEnd`
- Tercatat hanya sampai batas jam lembur yang ditentukan

## File yang Dimodifikasi

### 1. Attendance Calculator (`src/lib/utils/attendance-calculator.ts`)

#### Fungsi Baru:

```typescript
// Menentukan waktu check-in yang akan digunakan
export function calculateAdjustedCheckInTime(
  shift: ExtendedShift,
  actualCheckInTime: Date
): {
  adjustedCheckInTime: Date;
  isAdjusted: boolean;
  adjustmentReason: string;
  originalTime: Date;
  adjustmentMinutes: number;
}

// Menghitung auto record jam istirahat dan lembur
export function calculateAutoTimeRecord(
  shift: ExtendedShift,
  checkInTime: Date,
  checkOutTime: Date
): {
  breakStartTime: Date | null;
  breakEndTime: Date | null;
  overtimeStartTime: Date | null;
  overtimeEndTime: Date | null;
  autoRecordReason: string[];
}
```

#### Fungsi yang Diperbarui:

```typescript
// Diperbarui untuk menggunakan logika adjustment baru
export function detectLatenessAndCalculateRoundedTime(
  shift: ExtendedShift,
  checkInTime: Date
): {
  isLate: boolean;
  actualMinutesLate: number;
  roundedMinutesLate: number;
  originalShiftStart: Date;
  roundedCheckInTime: Date;
  latenessMessage: string;
}
```

### 2. API Check-in (`src/app/api/attendance/check-in/route.ts`)

#### Perubahan Utama:
- Menggunakan `calculateAdjustedCheckInTime()` untuk menentukan waktu check-in yang dicatat
- Memberikan informasi adjustment dalam response
- Kompatibel dengan sistem notifikasi keterlambatan yang sudah ada

#### Response Structure:
```json
{
  "success": true,
  "message": "Check-in berhasil untuk [Nama] - [Adjustment Reason]",
  "data": {
    "attendanceId": "uuid",
    "actualCheckInTime": "2025-06-25T06:15:00.000Z",
    "recordedCheckInTime": "2025-06-25T07:00:00.000Z",
    "adjustmentInfo": {
      "isAdjusted": true,
      "adjustmentReason": "Masuk lebih awal, disesuaikan ke jam shift 07:00",
      "adjustmentMinutes": 45,
      "originalTime": "2025-06-25T06:15:00.000Z"
    },
    "latenessInfo": {
      "isLate": false,
      "actualMinutesLate": 0,
      "roundedMinutesLate": 0,
      "latenessMessage": ""
    }
  }
}
```

### 3. API Check-out (`src/app/api/attendance/check-out/route.ts`)

#### Perubahan Utama:
- Menggunakan `calculateAutoTimeRecord()` untuk mencatat jam istirahat dan lembur
- Menyimpan data ke field `breakStartTime`, `breakEndTime`, `overtimeStartTime`, `overtimeEndTime`
- Memberikan informasi auto record dalam response

#### Response Structure:
```json
{
  "success": true,
  "message": "Check-out berhasil untuk [Nama]",
  "data": {
    "attendanceId": "uuid",
    "checkInTime": "2025-06-25T07:00:00.000Z",
    "checkOutTime": "2025-06-25T15:30:00.000Z",
    "breakStartTime": "2025-06-25T12:00:00.000Z",
    "breakEndTime": "2025-06-25T13:00:00.000Z",
    "overtimeStartTime": "2025-06-25T14:00:00.000Z",
    "overtimeEndTime": "2025-06-25T15:30:00.000Z",
    "autoTimeRecordInfo": {
      "hasAutoRecord": true,
      "autoRecordReason": [
        "Jam istirahat otomatis: 12:00 - 13:00",
        "Lembur otomatis: 14:00 - 15:30"
      ]
    }
  }
}
```

### 4. API Attendance List (`src/app/api/attendance/today-public/route.ts`)

#### Perubahan:
- Menampilkan data `breakStartTime`, `breakEndTime`, `overtimeStartTime`, `overtimeEndTime`
- Field sebelumnya yang mengembalikan `null` sekarang menampilkan data aktual

### 5. Frontend Attendance Page (`src/app/(dashboard)/attendance/page.tsx`)

#### Tabel Enhancement:
Menambahkan kolom baru dalam tabel attendance:
- **Istirahat Mulai**: Menampilkan jam mulai istirahat yang di-auto record
- **Istirahat Selesai**: Menampilkan jam selesai istirahat yang di-auto record
- **Lembur Mulai**: Menampilkan jam mulai lembur yang di-auto record
- **Lembur Selesai**: Menampilkan jam selesai lembur yang di-auto record

#### Interface Update:
```typescript
interface AttendanceRecord {
  // ... existing fields
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  overtimeStartTime?: string | null;
  overtimeEndTime?: string | null;
}
```

## Database Schema

### Model Attendance
Field yang digunakan untuk auto record (sudah ada di schema):
```prisma
model Attendance {
  // ... existing fields
  breakStartTime    DateTime?
  breakEndTime      DateTime?
  overtimeStartTime DateTime?
  overtimeEndTime   DateTime?
  // ... existing fields
}
```

### Model Shift
Field yang digunakan untuk konfigurasi:
```prisma
model Shift {
  // ... existing fields
  mainWorkStart        DateTime?
  mainWorkEnd          DateTime?
  lunchBreakStart      DateTime?
  lunchBreakEnd        DateTime?
  regularOvertimeStart DateTime?
  regularOvertimeEnd   DateTime?
  // ... existing fields
}
```

## Cara Kerja Sistem

### 1. Proses Check-in:

1. **Input**: Employee ID dan waktu check-in aktual
2. **Validasi**: Cek apakah dalam jam shift yang diizinkan
3. **Adjustment**: Hitung waktu check-in yang akan dicatat menggunakan `calculateAdjustedCheckInTime()`
4. **Recording**: Simpan waktu yang sudah disesuaikan ke database
5. **Response**: Berikan info adjustment dan keterlambatan

### 2. Proses Check-out:

1. **Input**: Employee ID dan waktu check-out aktual
2. **Calculation**: Hitung jam kerja menggunakan `calculateWorkHours()`
3. **Auto Record**: Hitung jam istirahat dan lembur menggunakan `calculateAutoTimeRecord()`
4. **Recording**: Simpan semua data ke database
5. **Response**: Berikan info jam kerja dan auto record

### 3. Tampilan Data:

1. **API List**: Endpoint `/api/attendance/today-public` mengembalikan data lengkap
2. **Frontend**: Tabel menampilkan semua kolom termasuk jam istirahat dan lembur
3. **Formatting**: Waktu ditampilkan dalam format HH:MM atau "-" jika null

## Contoh Flow Lengkap

### Skenario: Karyawan Shift Pagi (07:00-14:00)

#### Konfigurasi Shift:
- **Main Work**: 07:00 - 14:00
- **Lunch Break**: 12:00 - 13:00
- **Regular Overtime**: 14:00 - 16:00

#### Case 1: Masuk Lebih Awal, Lembur
```
1. Check-in: 06:45 (aktual) → 07:00 (tercatat)
   - Adjustment: "Masuk lebih awal, disesuaikan ke jam shift 07:00"

2. Check-out: 15:30 (aktual) → 15:30 (tercatat)
   - Auto Record Break: 12:00 - 13:00
   - Auto Record Overtime: 14:00 - 15:30
   - Main Work Hours: 6.0 (7 jam - 1 jam istirahat)
   - Regular Overtime Hours: 1.5
```

#### Case 2: Terlambat, Tanpa Lembur
```
1. Check-in: 07:23 (aktual) → 07:30 (tercatat)
   - Adjustment: "Terlambat 23 menit, dibulatkan ke 07:30"

2. Check-out: 14:00 (aktual) → 14:00 (tercatat)
   - Auto Record Break: 12:00 - 13:00
   - No Overtime (tidak melewati jam kerja normal)
   - Main Work Hours: 5.5 (6.5 jam - 1 jam istirahat)
   - Regular Overtime Hours: 0
```

## Testing

### Manual Testing:
1. Test dengan berbagai waktu check-in (awal, tepat, terlambat)
2. Test check-out dengan dan tanpa lembur
3. Cek tampilan data di tabel attendance
4. Validasi perhitungan jam kerja

### Automated Testing:
Gunakan script `test-enhanced-attendance-system.ps1` untuk testing komprehensif.

## Manfaat Implementasi

### 1. Konsistensi Data:
- Semua check-in mengikuti aturan yang sama
- Tidak ada kebingungan waktu check-in yang bervariasi

### 2. Automasi Pencatatan:
- Jam istirahat dicatat otomatis tanpa input manual
- Jam lembur dicatat otomatis sesuai konfigurasi shift

### 3. Akurasi Perhitungan:
- Jam kerja dihitung dengan benar dengan memperhitungkan penyesuaian
- Lembur dihitung sesuai dengan waktu aktual kerja

### 4. User Experience:
- Karyawan tidak perlu manual input jam istirahat/lembur
- Transparansi dalam penyesuaian waktu check-in
- Tampilan data yang lengkap dan informatif

### 5. HR Management:
- Data presensi yang akurat untuk perhitungan gaji
- Laporan jam kerja dan lembur yang otomatis
- Audit trail yang jelas untuk setiap penyesuaian waktu

## Update Memory

Sistem enhanced attendance telah diimplementasikan dengan fitur lengkap:

1. **Auto Adjustment Check-in**: Logika otomatis untuk penyesuaian waktu check-in (awal → jam shift, terlambat → bulatkan 15 menit)

2. **Auto Record Break & Overtime**: Pencatatan otomatis jam istirahat dan lembur berdasarkan konfigurasi shift dan waktu kerja aktual

3. **Enhanced Database Recording**: Semua data tersimpan di field `breakStartTime`, `breakEndTime`, `overtimeStartTime`, `overtimeEndTime`

4. **Improved Frontend Display**: Tabel attendance menampilkan kolom jam istirahat dan lembur dengan data aktual

5. **Comprehensive API Response**: API memberikan informasi detail tentang adjustment dan auto record untuk transparency

Sistem terintegrasi penuh dengan attendance existing dan menyediakan data akurat untuk manajemen HR dengan automasi maksimal untuk mengurangi input manual. 