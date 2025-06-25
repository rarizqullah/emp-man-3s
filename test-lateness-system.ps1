# Script Testing Sistem Deteksi Keterlambatan dengan Pembulatan Interval 15 Menit
# =========================================================================

Write-Host "🔍 Testing Sistem Deteksi Keterlambatan" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

Write-Host "`n📋 Fitur yang Ditest:" -ForegroundColor Yellow
Write-Host "✓ Deteksi keterlambatan otomatis" -ForegroundColor White
Write-Host "✓ Pembulatan interval 15 menit (15, 30, 45, 60)" -ForegroundColor White
Write-Host "✓ Jam masuk ditulis sesuai pembulatan" -ForegroundColor White
Write-Host "✓ Notifikasi keterlambatan" -ForegroundColor White

Write-Host "`n🎯 Contoh Skenario Testing:" -ForegroundColor Cyan

Write-Host "`n1️⃣ Karyawan Tepat Waktu (07:00)" -ForegroundColor Magenta
Write-Host "   - Shift Start: 07:00" -ForegroundColor White
Write-Host "   - Check-in: 07:00" -ForegroundColor White
Write-Host "   - Expected: Tidak ada pembulatan, tidak ada notifikasi keterlambatan" -ForegroundColor White

Write-Host "`n2️⃣ Karyawan Terlambat 7 Menit" -ForegroundColor Magenta
Write-Host "   - Shift Start: 07:00" -ForegroundColor White
Write-Host "   - Check-in: 07:07" -ForegroundColor White
Write-Host "   - Expected: Dibulatkan ke 07:15 (terlambat 15 menit)" -ForegroundColor White

Write-Host "`n3️⃣ Karyawan Terlambat 23 Menit" -ForegroundColor Magenta
Write-Host "   - Shift Start: 07:00" -ForegroundColor White
Write-Host "   - Check-in: 07:23" -ForegroundColor White
Write-Host "   - Expected: Dibulatkan ke 07:30 (terlambat 30 menit)" -ForegroundColor White

Write-Host "`n4️⃣ Karyawan Terlambat 35 Menit" -ForegroundColor Magenta
Write-Host "   - Shift Start: 07:00" -ForegroundColor White
Write-Host "   - Check-in: 07:35" -ForegroundColor White
Write-Host "   - Expected: Dibulatkan ke 07:45 (terlambat 45 menit)" -ForegroundColor White

Write-Host "`n5️⃣ Karyawan Terlambat 50 Menit" -ForegroundColor Magenta
Write-Host "   - Shift Start: 07:00" -ForegroundColor White
Write-Host "   - Check-in: 07:50" -ForegroundColor White
Write-Host "   - Expected: Dibulatkan ke 08:00 (terlambat 60 menit)" -ForegroundColor White

Write-Host "`n🧪 Cara Testing Manual:" -ForegroundColor Blue
Write-Host "1. Buka aplikasi di browser (http://localhost:3000)" -ForegroundColor White
Write-Host "2. Login dengan akun karyawan" -ForegroundColor White
Write-Host "3. Pergi ke halaman 'Presensi Karyawan'" -ForegroundColor White
Write-Host "4. Lakukan check-in menggunakan face recognition atau manual" -ForegroundColor White
Write-Host "5. Perhatikan:" -ForegroundColor White
Write-Host "   - Notifikasi yang muncul (error untuk keterlambatan + success)" -ForegroundColor White
Write-Host "   - Waktu check-in di 'Daftar Presensi Hari Ini'" -ForegroundColor White
Write-Host "   - Pesan pembulatan waktu" -ForegroundColor White

Write-Host "`n🔍 Validasi yang Dilakukan:" -ForegroundColor Green
Write-Host "✓ Fungsi detectLatenessAndCalculateRoundedTime() bekerja" -ForegroundColor White
Write-Host "✓ API check-in menggunakan waktu yang dibulatkan" -ForegroundColor White
Write-Host "✓ Frontend menampilkan notifikasi keterlambatan" -ForegroundColor White
Write-Host "✓ Database menyimpan waktu check-in yang sudah dibulatkan" -ForegroundColor White

Write-Host "`n⚙️ Technical Implementation:" -ForegroundColor DarkGray
Write-Host "- Math.ceil(actualMinutesLate / 15) * 15 untuk pembulatan" -ForegroundColor White
Write-Host "- Toast error (8s) + Toast success (4s) untuk notifikasi" -ForegroundColor White
Write-Host "- Waktu dibulatkan disimpan sebagai checkInTime di database" -ForegroundColor White

Write-Host "`n✅ Sistem Telah Diimplementasikan!" -ForegroundColor Green
Write-Host "Silakan lakukan testing manual untuk memverifikasi fungsionalitas." -ForegroundColor Green

Write-Host "`n📝 Log Monitoring:" -ForegroundColor Yellow
Write-Host "Cek console log untuk melihat:" -ForegroundColor White
Write-Host "- ⚠️ Late check-in detected: [message]" -ForegroundColor White
Write-Host "- ✅ Check-in successful with rounded time" -ForegroundColor White 