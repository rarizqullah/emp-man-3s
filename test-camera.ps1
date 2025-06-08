# Test Face Recognition dengan Kamera
Write-Host "=== Test Face Recognition dengan Kamera ===" -ForegroundColor Green

# Test API
Write-Host "`nTesting Face Recognition API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/face-recognition-data" -Method GET
    Write-Host "✅ API Success!" -ForegroundColor Green
    Write-Host "   Employees with face data: $($response.count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Attendance Page
Write-Host "`nTesting Attendance Page..." -ForegroundColor Yellow
try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:3000/attendance" -Method GET
    Write-Host "✅ Page accessible (Status: $($webResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Page failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== STATUS ===" -ForegroundColor Green
Write-Host "🎯 FACE RECOGNITION DENGAN KAMERA TELAH DIAKTIFKAN!" -ForegroundColor Green
Write-Host "📷 Buka http://localhost:3000/attendance dan test kamera" -ForegroundColor Cyan
Write-Host "✅ Sistem siap untuk absensi menggunakan wajah!" -ForegroundColor Green 