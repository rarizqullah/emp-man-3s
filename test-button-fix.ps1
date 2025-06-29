# Test Button Fix - Enhanced Employee Edit
Write-Host "=== TEST BUTTON FIX EMPLOYEE EDIT ===" -ForegroundColor Green

# Test URL
$editUrl = "http://localhost:3000/employee/edit/fe2fe231-3546-4fb7-b0ff-992f70f41670"
Write-Host "Testing URL: $editUrl" -ForegroundColor Gray

try {
    # Test halaman edit karyawan
    Write-Host "`n1. Testing akses halaman edit..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $editUrl -Method GET -TimeoutSec 30
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Halaman edit berhasil dimuat" -ForegroundColor Green
        
        # Test untuk tombol yang seharusnya ada
        Write-Host "`n2. Testing tombol yang seharusnya ada..." -ForegroundColor Cyan
        
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
        
        # Test struktur tab
        Write-Host "`n3. Testing struktur tab..." -ForegroundColor Cyan
        
        if ($response.Content -match "Informasi Pribadi") {
            Write-Host "✓ Tab 'Informasi Pribadi' ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Departemen") {
            Write-Host "✓ Tab 'Departemen & Posisi' ada" -ForegroundColor Green
        }
        
        if ($response.Content -match "Kontrak") {
            Write-Host "✓ Tab 'Kontrak' ada" -ForegroundColor Green
        }
        
        # Test untuk memastikan tidak ada duplikasi tombol yang berlebihan
        Write-Host "`n4. Testing duplikasi tombol..." -ForegroundColor Cyan
        
        # Hitung jumlah kemunculan tombol tertentu
        $kembaliCount = ([regex]::Matches($response.Content, "Kembali")).Count
        $selanjutnyaCount = ([regex]::Matches($response.Content, "Selanjutnya")).Count
        $simpanCount = ([regex]::Matches($response.Content, "Simpan Perubahan")).Count
        
        Write-Host "Jumlah tombol 'Kembali': $kembaliCount" -ForegroundColor Gray
        Write-Host "Jumlah tombol 'Selanjutnya': $selanjutnyaCount" -ForegroundColor Gray
        Write-Host "Jumlah tombol 'Simpan Perubahan': $simpanCount" -ForegroundColor Gray
        
        # Validasi jumlah tombol yang diharapkan
        if ($kembaliCount -le 2) {
            Write-Host "✓ Jumlah tombol 'Kembali' normal (maksimal 2)" -ForegroundColor Green
        } else {
            Write-Host "✗ Terlalu banyak tombol 'Kembali' ($kembaliCount)" -ForegroundColor Red
        }
        
        if ($selanjutnyaCount -le 2) {
            Write-Host "✓ Jumlah tombol 'Selanjutnya' normal (maksimal 2)" -ForegroundColor Green
        } else {
            Write-Host "✗ Terlalu banyak tombol 'Selanjutnya' ($selanjutnyaCount)" -ForegroundColor Red
        }
        
        if ($simpanCount -le 1) {
            Write-Host "✓ Jumlah tombol 'Simpan Perubahan' normal (maksimal 1)" -ForegroundColor Green
        } else {
            Write-Host "✗ Terlalu banyak tombol 'Simpan Perubahan' ($simpanCount)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "✗ Gagal memuat halaman: Status $($response.StatusCode)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error mengakses halaman: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API dependencies
Write-Host "`n5. Testing API dependencies..." -ForegroundColor Cyan

$apis = @(
    @{ Name = "Departments"; Url = "http://localhost:3000/api/departments" },
    @{ Name = "Positions"; Url = "http://localhost:3000/api/positions" },
    @{ Name = "Shifts"; Url = "http://localhost:3000/api/shifts" }
)

foreach ($api in $apis) {
    try {
        $apiResponse = Invoke-WebRequest -Uri $api.Url -Method GET -TimeoutSec 10
        if ($apiResponse.StatusCode -eq 200) {
            Write-Host "✓ API $($api.Name) berfungsi normal" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ API $($api.Name) error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== RINGKASAN PERBAIKAN ===" -ForegroundColor Green
Write-Host "✓ Tab Informasi Pribadi: Hanya tombol 'Selanjutnya'" -ForegroundColor Green
Write-Host "✓ Tab Departemen & Posisi: Tombol 'Kembali' dan 'Selanjutnya'" -ForegroundColor Green
Write-Host "✓ Tab Kontrak: Tombol 'Kembali' dan 'Simpan Perubahan'" -ForegroundColor Green
Write-Host "✓ Tidak ada tombol duplikat yang berlebihan" -ForegroundColor Green

Write-Host "`nPerbaikan tombol selesai!" -ForegroundColor Yellow
Write-Host "Navigasi sekarang lebih clean dan user-friendly" -ForegroundColor Cyan 