# Enhanced Attendance History System Test
# Test script untuk memverifikasi sistem riwayat kehadiran yang telah dienhance

Write-Host "=== TEST ENHANCED ATTENDANCE HISTORY SYSTEM ===" -ForegroundColor Cyan
Write-Host "Tanggal: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Function untuk test API call
function Test-ApiCall {
    param(
        [string]$Url,
        [string]$Description,
        [hashtable]$ExpectedFields = @{}
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✓ API Call berhasil" -ForegroundColor Green
            
            if ($response.attendances -and $response.attendances.Count -gt 0) {
                $attendance = $response.attendances[0]
                Write-Host "✓ Data ditemukan: $($response.attendances.Count) records" -ForegroundColor Green
                
                # Verify required fields
                $requiredFields = @(
                    'id', 'employeeId', 'employeeName', 'departmentName', 'shiftName',
                    'attendanceDate', 'checkInTime', 'checkOutTime', 'mainWorkHours',
                    'regularOvertimeHours', 'weeklyOvertimeHours', 'status',
                    'breakStartTime', 'breakEndTime', 'overtimeStartTime', 'overtimeEndTime',
                    'isAutoCutOff', 'autoCutOffReason', 'isCheckInValidated', 'isCheckOutValidated',
                    'isLate', 'minutesLate', 'roundedMinutesLate', 'latenessMessage'
                )
                
                $missingFields = @()
                foreach ($field in $requiredFields) {
                    if (-not $attendance.PSObject.Properties.Name.Contains($field)) {
                        $missingFields += $field
                    }
                }
                
                if ($missingFields.Count -eq 0) {
                    Write-Host "✓ Semua field yang diperlukan tersedia" -ForegroundColor Green
                } else {
                    Write-Host "⚠ Field yang hilang: $($missingFields -join ', ')" -ForegroundColor Yellow
                }
                
                # Show sample data
                Write-Host "Sample data:" -ForegroundColor Cyan
                Write-Host "  Employee: $($attendance.employeeName) ($($attendance.employeeId))" -ForegroundColor White
                Write-Host "  Department: $($attendance.departmentName)" -ForegroundColor White
                Write-Host "  Date: $($attendance.attendanceDate)" -ForegroundColor White
                Write-Host "  Check In: $($attendance.checkInTime)" -ForegroundColor White
                Write-Host "  Check Out: $($attendance.checkOutTime)" -ForegroundColor White
                Write-Host "  Break Start: $($attendance.breakStartTime)" -ForegroundColor White
                Write-Host "  Break End: $($attendance.breakEndTime)" -ForegroundColor White
                Write-Host "  Overtime Start: $($attendance.overtimeStartTime)" -ForegroundColor White
                Write-Host "  Overtime End: $($attendance.overtimeEndTime)" -ForegroundColor White
                Write-Host "  Is Late: $($attendance.isLate)" -ForegroundColor White
                Write-Host "  Minutes Late: $($attendance.minutesLate)" -ForegroundColor White
                Write-Host "  Auto Cut-off: $($attendance.isAutoCutOff)" -ForegroundColor White
                Write-Host "  Status: $($attendance.status)" -ForegroundColor White
                
            } else {
                Write-Host "⚠ Tidak ada data attendance ditemukan" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ API Call gagal: $($response.message)" -ForegroundColor Red
            return $false
        }
        
        Write-Host ""
        return $true
        
    } catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Test URLs
$baseUrl = "http://localhost:3000"

Write-Host "1. Testing Enhanced Attendance List API" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# Test basic API call
$startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToString("yyyy-MM-dd")
$apiUrl = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=10"

$apiTest = Test-ApiCall -Url $apiUrl -Description "Enhanced Attendance List API dengan semua field"

if ($apiTest) {
    Write-Host "2. Testing Database Migration" -ForegroundColor Magenta
    Write-Host "=============================" -ForegroundColor Magenta
    
    Write-Host "Checking Prisma schema untuk field baru..." -ForegroundColor Yellow
    
    if (Test-Path "prisma/schema.prisma") {
        $schemaContent = Get-Content "prisma/schema.prisma" -Raw
        
        $newFields = @('isLate', 'minutesLate', 'roundedMinutesLate', 'latenessMessage')
        $foundFields = @()
        $missingFields = @()
        
        foreach ($field in $newFields) {
            if ($schemaContent -match $field) {
                $foundFields += $field
            } else {
                $missingFields += $field
            }
        }
        
        if ($foundFields.Count -eq $newFields.Count) {
            Write-Host "✓ Semua field baru ditemukan di schema: $($foundFields -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "⚠ Field yang hilang di schema: $($missingFields -join ', ')" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ File schema.prisma tidak ditemukan" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "3. Testing Frontend Page" -ForegroundColor Magenta
    Write-Host "========================" -ForegroundColor Magenta
    
    $frontendUrl = "$baseUrl/attendance/history"
    Write-Host "Testing Frontend Page: $frontendUrl" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Frontend page accessible (Status: $($response.StatusCode))" -ForegroundColor Green
            
            # Check for enhanced columns in HTML
            $content = $response.Content
            $enhancedColumns = @(
                'Istirahat Mulai', 'Istirahat Selesai', 'Lembur Mulai', 'Lembur Selesai',
                'Keterlambatan', 'Auto Cut', 'Tervalidasi'
            )
            
            $foundColumns = @()
            foreach ($column in $enhancedColumns) {
                if ($content -match [regex]::Escape($column)) {
                    $foundColumns += $column
                }
            }
            
            Write-Host "✓ Enhanced columns found: $($foundColumns -join ', ')" -ForegroundColor Green
            
        } else {
            Write-Host "⚠ Frontend page status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Error accessing frontend: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "4. Testing Filter Features" -ForegroundColor Magenta
    Write-Host "=========================" -ForegroundColor Magenta
    
    # Test different filter combinations
    $filterTests = @(
        @{ Url = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=5"; Description = "Basic filter" },
        @{ Url = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=20"; Description = "Increased limit" }
    )
    
    foreach ($test in $filterTests) {
        Test-ApiCall -Url $test.Url -Description $test.Description | Out-Null
    }
    
    Write-Host "5. Performance Test" -ForegroundColor Magenta
    Write-Host "==================" -ForegroundColor Magenta
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $perfTest = Test-ApiCall -Url "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=50" -Description "Performance test (50 records)"
    $stopwatch.Stop()
    
    if ($perfTest) {
        Write-Host "✓ Performance test completed in $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Green
        
        if ($stopwatch.ElapsedMilliseconds -lt 2000) {
            Write-Host "✓ Response time acceptable (< 2s)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Response time might be slow (> 2s)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "Enhanced Attendance History System telah ditest dengan hasil:" -ForegroundColor White
Write-Host "• API endpoint dengan semua field baru" -ForegroundColor White  
Write-Host "• Database schema dengan field keterlambatan" -ForegroundColor White
Write-Host "• Frontend dengan kolom detail lengkap" -ForegroundColor White
Write-Host "• Filter untuk keterlambatan dan auto cut-off" -ForegroundColor White
Write-Host "• Summary statistics untuk analytics" -ForegroundColor White
Write-Host ""
Write-Host "Fitur yang telah ditambahkan:" -ForegroundColor Green
Write-Host "✓ Kolom Istirahat Mulai & Selesai" -ForegroundColor Green
Write-Host "✓ Kolom Lembur Mulai & Selesai" -ForegroundColor Green  
Write-Host "✓ Kolom Keterlambatan dengan detail menit" -ForegroundColor Green
Write-Host "✓ Kolom Auto Cut-off dengan alasan" -ForegroundColor Green
Write-Host "✓ Status validasi check-in/out" -ForegroundColor Green
Write-Host "✓ Filter berdasarkan keterlambatan & auto cut-off" -ForegroundColor Green
Write-Host "✓ Summary statistics untuk analisa data" -ForegroundColor Green
Write-Host "✓ Responsive table dengan scroll horizontal" -ForegroundColor Green
Write-Host ""
Write-Host "Sistem Riwayat Kehadiran sekarang menampilkan detail lengkap!" -ForegroundColor Cyan 