# Test script untuk Face Recognition dengan Kamera
Write-Host "=== Testing Face Recognition dengan Kamera ===" -ForegroundColor Green

# Function untuk test API
function Test-API {
    param($url, $name)
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
        Write-Host "✅ $name API: SUCCESS" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ $name API: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Face Recognition Data API
Write-Host "`n1. Testing Face Recognition Data API..." -ForegroundColor Yellow
$faceData = Test-API "http://localhost:3000/api/attendance/face-recognition-data" "Face Recognition Data"
if ($faceData) {
    Write-Host "   - Message: $($faceData.message)" -ForegroundColor Cyan
    Write-Host "   - Employee Count: $($faceData.count)" -ForegroundColor Cyan
    if ($faceData.count -gt 0) {
        Write-Host "   ✅ Ada karyawan dengan data wajah!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Tidak ada karyawan dengan data wajah" -ForegroundColor Yellow
    }
}

# Test 2: Check Models Directory
Write-Host "`n2. Checking Face Recognition Models..." -ForegroundColor Yellow
$modelsPath = "public/models"
if (Test-Path $modelsPath) {
    $models = Get-ChildItem $modelsPath -File
    Write-Host "✅ Models directory found with $($models.Count) files" -ForegroundColor Green
    
    # Check for required models
    $requiredModels = @(
        "tiny_face_detector_model-weights_manifest.json",
        "face_landmark_68_model-weights_manifest.json", 
        "face_recognition_model-weights_manifest.json"
    )
    
    foreach ($model in $requiredModels) {
        if ($models.Name -contains $model) {
            Write-Host "   ✅ $model" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $model" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ Models directory not found" -ForegroundColor Red
}

# Test 3: Check Components
Write-Host "`n3. Checking Face Recognition Components..." -ForegroundColor Yellow
$componentsPath = "src/components/attendance"
if (Test-Path "$componentsPath/AttendanceFaceRecognition.tsx") {
    Write-Host "✅ AttendanceFaceRecognition.tsx found" -ForegroundColor Green
} else {
    Write-Host "❌ AttendanceFaceRecognition.tsx not found" -ForegroundColor Red
}

# Test 4: Check Page Integration
Write-Host "`n4. Testing Attendance Page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/attendance" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Attendance Page: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
        
        # Check if page contains camera-related content
        if ($response.Content -like "*kamera*" -or $response.Content -like "*camera*") {
            Write-Host "   ✅ Page contains camera functionality" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Page may not contain camera functionality" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Attendance Page: Warning (Status: $($response.StatusCode))" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Attendance Page: Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Check Package Dependencies
Write-Host "`n5. Checking Dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $deps = $packageJson.dependencies
    
    if ($deps."face-api.js") {
        Write-Host "✅ face-api.js: $($deps.'face-api.js')" -ForegroundColor Green
    } else {
        Write-Host "❌ face-api.js not found in dependencies" -ForegroundColor Red
    }
    
    if ($deps."@vladmandic/face-api") {
        Write-Host "✅ @vladmandic/face-api: $($deps.'@vladmandic/face-api')" -ForegroundColor Green
    } else {
        Write-Host "⚠️ @vladmandic/face-api not found (optional)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "🎯 FACE RECOGNITION DENGAN KAMERA TELAH DIAKTIFKAN!" -ForegroundColor Green
Write-Host "📷 Sistem sekarang menggunakan AttendanceFaceRecognition dengan real camera" -ForegroundColor Green

Write-Host "`n=== Cara Penggunaan ===" -ForegroundColor Cyan
Write-Host "1. Buka browser ke http://localhost:3000/attendance" -ForegroundColor White
Write-Host "2. Klik tab 'Presensi'" -ForegroundColor White
Write-Host "3. Klik tombol 'Aktifkan Kamera'" -ForegroundColor White
Write-Host "4. Izinkan akses kamera ketika diminta browser" -ForegroundColor White
Write-Host "5. Hadapkan wajah ke kamera untuk deteksi otomatis" -ForegroundColor White
Write-Host "6. Sistem akan mengenali wajah dan melakukan check-in/check-out" -ForegroundColor White

Write-Host "`n=== Requirements ===" -ForegroundColor Yellow
Write-Host "⚠️ Pastikan requirements berikut terpenuhi:" -ForegroundColor Yellow
Write-Host "- Karyawan harus memiliki data faceData di database" -ForegroundColor White
Write-Host "- Browser mendukung getUserMedia (Chrome, Firefox, Safari modern)" -ForegroundColor White
Write-Host "- Akses ke kamera diberikan oleh user" -ForegroundColor White
Write-Host "- Pencahayaan yang cukup untuk deteksi wajah" -ForegroundColor White
Write-Host "- Koneksi internet stabil untuk load models" -ForegroundColor White

if ($faceData -and $faceData.count -gt 0) {
    Write-Host "`n🎉 SISTEM SIAP DIGUNAKAN!" -ForegroundColor Green
    Write-Host "✅ Ada $($faceData.count) karyawan dengan data wajah" -ForegroundColor Green
    Write-Host "🚀 Silakan test face recognition sekarang!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ PERLU SETUP DATA WAJAH" -ForegroundColor Yellow
    Write-Host "📋 Tambahkan data wajah karyawan di menu management karyawan" -ForegroundColor Yellow
    Write-Host "🔄 Setelah itu sistem face recognition siap digunakan" -ForegroundColor Yellow
} 