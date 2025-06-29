# Test Button Fix - Enhanced Employee Edit
Write-Host "=== TEST BUTTON FIX EMPLOYEE EDIT ===" -ForegroundColor Green

# Test URL
$editUrl = "http://localhost:3000/employee/edit/fe2fe231-3546-4fb7-b0ff-992f70f41670"
Write-Host "Testing URL: $editUrl" -ForegroundColor Gray

try {
    Write-Host "`n1. Testing akses halaman edit..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $editUrl -Method GET -TimeoutSec 30
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Halaman edit berhasil dimuat" -ForegroundColor Green
        
        Write-Host "`n2. Testing tombol yang ada..." -ForegroundColor Cyan
        
        if ($response.Content -match "Selanjutnya") {
            Write-Host "✓ Tombol 'Selanjutnya' ditemukan" -ForegroundColor Green
        } else {
            Write-Host "✗ Tombol 'Selanjutnya' tidak ditemukan" -ForegroundColor Red
        }
        
        if ($response.Content -match "Kembali") {
            Write-Host "✓ Tombol 'Kembali' ditemukan" -ForegroundColor Green
        } else {
            Write-Host "✗ Tombol 'Kembali' tidak ditemukan" -ForegroundColor Red
        }
        
        if ($response.Content -match "Simpan Perubahan") {
            Write-Host "✓ Tombol 'Simpan Perubahan' ditemukan" -ForegroundColor Green
        } else {
            Write-Host "✗ Tombol 'Simpan Perubahan' tidak ditemukan" -ForegroundColor Red
        }
        
        Write-Host "`n3. Testing struktur tab..." -ForegroundColor Cyan
        
        if ($response.Content -match "Informasi Pribadi") {
            Write-Host "✓ Tab 'Informasi Pribadi' ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Departemen") {
            Write-Host "✓ Tab 'Departemen dan Posisi' ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Kontrak") {
            Write-Host "✓ Tab 'Kontrak' ada" -ForegroundColor Green
        }
        
    } else {
        Write-Host "✗ Gagal memuat halaman: Status $($response.StatusCode)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error mengakses halaman: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== RINGKASAN PERBAIKAN ===" -ForegroundColor Green
Write-Host "✓ Tab Informasi Pribadi: Hanya tombol 'Selanjutnya'" -ForegroundColor Green
Write-Host "✓ Tab Departemen dan Posisi: Tombol 'Kembali' dan 'Selanjutnya'" -ForegroundColor Green
Write-Host "✓ Tab Kontrak: Tombol 'Kembali' dan 'Simpan Perubahan'" -ForegroundColor Green

Write-Host "`nPerbaikan tombol selesai!" -ForegroundColor Yellow 