Write-Host "=== TEST BUTTON FIX ===" -ForegroundColor Green

$editUrl = "http://localhost:3000/employee/edit/fe2fe231-3546-4fb7-b0ff-992f70f41670"

try {
    $response = Invoke-WebRequest -Uri $editUrl -Method GET -TimeoutSec 30
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Halaman edit berhasil dimuat" -ForegroundColor Green
        
        if ($response.Content -match "Selanjutnya") {
            Write-Host "✓ Tombol Selanjutnya ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Kembali") {
            Write-Host "✓ Tombol Kembali ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Simpan Perubahan") {
            Write-Host "✓ Tombol Simpan Perubahan ada" -ForegroundColor Green
        }
        
    } else {
        Write-Host "✗ Gagal memuat halaman" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPerbaikan tombol selesai!" -ForegroundColor Yellow 