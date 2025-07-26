# Sistem Pembulatan Gaji

## Deskripsi

Sistem ini menerapkan pembulatan otomatis pada Total Gaji Bersih untuk memastikan nilai yang lebih rapi dan mudah dipahami.

## Aturan Pembulatan

Gaji akan dibulatkan ke kelipatan 100 terdekat dengan aturan sebagai berikut:

### 1. **Pembulatan ke Atas (≥ 50)**
- Jika angka satuan puluhan ≥ 50, maka dibulatkan ke atas
- **Contoh:**
  - 20.360 → 20.400 (+40)
  - 20.350 → 20.400 (+50)
  - 15.780 → 15.800 (+20)

### 2. **Pembulatan ke Bawah (< 50)**
- Jika angka satuan puluhan < 50, maka dibulatkan ke bawah
- **Contoh:**
  - 20.320 → 20.300 (-20)
  - 20.349 → 20.300 (-49)
  - 15.720 → 15.700 (-20)

### 3. **Tidak Ada Perubahan**
- Jika sudah kelipatan 100, tidak ada perubahan
- **Contoh:**
  - 20.000 → 20.000 (0)
  - 15.700 → 15.700 (0)

## Implementasi Teknis

### Fungsi Pembulatan
```typescript
function roundSalaryToNearestHundred(amount: number): number {
  const remainder = amount % 100;
  
  if (remainder >= 50) {
    // Bulatkan ke atas ke kelipatan 100 berikutnya
    return Math.ceil(amount / 100) * 100;
  } else {
    // Bulatkan ke bawah ke kelipatan 100 sebelumnya
    return Math.floor(amount / 100) * 100;
  }
}
```

### Lokasi Implementasi
- **File:** `src/lib/db/salary.service.ts`
- **Fungsi:** `calculateEmployeeSalary()`
- **Baris:** 135 (aplikasi pembulatan pada `totalSalary`)

## Komponen Yang Terpengaruh

### 1. **Kalkulasi Gaji**
- Gaji pokok, lembur, dan tunjangan tetap menggunakan `Math.round()` biasa
- **Hanya Total Gaji Bersih** yang menggunakan pembulatan khusus

### 2. **Tampilan Slip Gaji**
- Detail slip gaji akan menampilkan Total Gaji Bersih yang sudah dibulatkan
- Rincian tunjangan tetap menampilkan nilai asli

### 3. **Database**
- Nilai yang disimpan di database adalah nilai yang sudah dibulatkan
- Memastikan konsistensi data di seluruh sistem

## Contoh Kalkulasi Lengkap

### Karyawan A
```
Gaji Pokok:           5.000.000
Lembur Reguler:         250.000
Lembur Mingguan:        150.000
Tunjangan Perusahaan:   680.360
Potongan Karyawan:      320.000
------------------------
Total Sebelum Bulat:  5.760.360
Total Setelah Bulat:  5.760.400  (+40)
```

### Karyawan B
```
Gaji Pokok:           4.500.000
Lembur Reguler:         175.000
Lembur Mingguan:         85.000
Tunjangan Perusahaan:   520.320
Potongan Karyawan:      240.000
------------------------
Total Sebelum Bulat:  5.040.320
Total Setelah Bulat:  5.040.300  (-20)
```

## Keuntungan Sistem

1. **Kemudahan Pembayaran**
   - Nominal yang lebih rapi untuk transfer bank
   - Mengurangi kesalahan pengetikan

2. **Konsistensi**
   - Semua gaji berakhir dengan "00"
   - Standar yang jelas dan mudah dipahami

3. **Transparansi**
   - Karyawan dapat dengan mudah memahami kalkulasi
   - Dokumentasi yang jelas tentang aturan pembulatan

## Testing

Sistem telah diuji dengan berbagai skenario:
- ✅ Pembulatan ke atas (≥50)
- ✅ Pembulatan ke bawah (<50)
- ✅ Tidak ada perubahan (kelipatan 100)
- ✅ Integrasi dengan kalkulasi tunjangan
- ✅ Konsistensi dengan database

## Update History

**Version 1.0** - Juli 2025
- Implementasi awal sistem pembulatan
- Aturan pembulatan ke kelipatan 100 terdekat
- Testing dan validasi lengkap
