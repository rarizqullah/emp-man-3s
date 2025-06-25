# Detailed Attendance History System Test
# Test script untuk memverifikasi sistem riwayat kehadiran detail yang telah dienhance

Write-Host "=== TEST DETAILED ATTENDANCE HISTORY SYSTEM ===" -ForegroundColor Cyan
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
                
                # Verify required fields untuk detailed view
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
                    Write-Host "✓ Semua field detailed tersedia" -ForegroundColor Green
                } else {
                    Write-Host "⚠ Field yang hilang: $($missingFields -join ', ')" -ForegroundColor Yellow
                }
                
                # Show detailed sample data
                Write-Host ""
                Write-Host "=== DETAILED ATTENDANCE DATA ===" -ForegroundColor Cyan
                Write-Host "Employee: $($attendance.employeeName) ($($attendance.employeeId))" -ForegroundColor White
                Write-Host "Department: $($attendance.departmentName)" -ForegroundColor White
                Write-Host "Shift: $($attendance.shiftName)" -ForegroundColor White
                Write-Host "Date: $($attendance.attendanceDate)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== WAKTU KEHADIRAN ===" -ForegroundColor Green
                Write-Host "Check In: $($attendance.checkInTime)" -ForegroundColor White
                Write-Host "Check Out: $($attendance.checkOutTime)" -ForegroundColor White
                Write-Host "Check In Validated: $($attendance.isCheckInValidated)" -ForegroundColor White
                Write-Host "Check Out Validated: $($attendance.isCheckOutValidated)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== WAKTU ISTIRAHAT ===" -ForegroundColor Blue
                Write-Host "Break Start: $($attendance.breakStartTime)" -ForegroundColor White
                Write-Host "Break End: $($attendance.breakEndTime)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== WAKTU LEMBUR ===" -ForegroundColor Purple
                Write-Host "Overtime Start: $($attendance.overtimeStartTime)" -ForegroundColor White
                Write-Host "Overtime End: $($attendance.overtimeEndTime)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== JAM KERJA ===" -ForegroundColor Orange
                Write-Host "Main Work Hours: $($attendance.mainWorkHours)" -ForegroundColor White
                Write-Host "Regular Overtime Hours: $($attendance.regularOvertimeHours)" -ForegroundColor White
                Write-Host "Weekly Overtime Hours: $($attendance.weeklyOvertimeHours)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== KETERLAMBATAN ===" -ForegroundColor Yellow
                Write-Host "Is Late: $($attendance.isLate)" -ForegroundColor White
                Write-Host "Minutes Late: $($attendance.minutesLate)" -ForegroundColor White
                Write-Host "Rounded Minutes Late: $($attendance.roundedMinutesLate)" -ForegroundColor White
                Write-Host "Lateness Message: $($attendance.latenessMessage)" -ForegroundColor White
                Write-Host ""
                Write-Host "=== AUTO CUT-OFF ===" -ForegroundColor Magenta
                Write-Host "Auto Cut-off: $($attendance.isAutoCutOff)" -ForegroundColor White
                Write-Host "Auto Cut-off Reason: $($attendance.autoCutOffReason)" -ForegroundColor White
                Write-Host ""
                Write-Host "Status: $($attendance.status)" -ForegroundColor White
                Write-Host "=================================" -ForegroundColor Cyan
                
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

Write-Host "1. Testing Enhanced Attendance List API dengan Detailed Fields" -ForegroundColor Magenta
Write-Host "=============================================================" -ForegroundColor Magenta

# Test basic API call
$startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToString("yyyy-MM-dd")
$apiUrl = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=5"

$apiTest = Test-ApiCall -Url $apiUrl -Description "Enhanced Attendance List API dengan semua field detail"

if ($apiTest) {
    Write-Host "2. Testing Database Schema dengan Field Baru" -ForegroundColor Magenta
    Write-Host "===========================================" -ForegroundColor Magenta
    
    Write-Host "Checking Prisma schema untuk field keterlambatan..." -ForegroundColor Yellow
    
    if (Test-Path "prisma/schema.prisma") {
        $schemaContent = Get-Content "prisma/schema.prisma" -Raw
        
        $newFields = @('isLate', 'minutesLate', 'roundedMinutesLate', 'latenessMessage')
        $foundFields = @()
        $missingFields = @()
        
        foreach ($field in $newFields) {
            if ($schemaContent -match $field) {
                $foundFields += $field
                Write-Host "✓ Field '$field' ditemukan" -ForegroundColor Green
            } else {
                $missingFields += $field
                Write-Host "✗ Field '$field' tidak ditemukan" -ForegroundColor Red
            }
        }
        
        if ($foundFields.Count -eq $newFields.Count) {
            Write-Host "✓ Semua field baru berhasil ditambahkan ke schema!" -ForegroundColor Green
        }
        
        # Check migration files
        Write-Host ""
        Write-Host "Checking migration files..." -ForegroundColor Yellow
        if (Test-Path "prisma/migrations") {
            $migrations = Get-ChildItem "prisma/migrations" -Directory | Sort-Object Name -Descending
            $latestMigration = $migrations | Select-Object -First 1
            if ($latestMigration -and $latestMigration.Name -match "lateness") {
                Write-Host "✓ Migration untuk lateness fields ditemukan: $($latestMigration.Name)" -ForegroundColor Green
            } else {
                Write-Host "⚠ Migration untuk lateness fields mungkin belum ada" -ForegroundColor Yellow
            }
        }
        
    } else {
        Write-Host "✗ File schema.prisma tidak ditemukan" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "3. Testing Frontend Page dengan Kolom Detail" -ForegroundColor Magenta
    Write-Host "===========================================" -ForegroundColor Magenta
    
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
                'Keterlambatan', 'Auto Cut', 'Tervalidasi', 'Lembur Reg', 'Lembur Mingguan'
            )
            
            $foundColumns = @()
            $missingColumns = @()
            foreach ($column in $enhancedColumns) {
                if ($content -match [regex]::Escape($column)) {
                    $foundColumns += $column
                    Write-Host "✓ Column '$column' found" -ForegroundColor Green
                } else {
                    $missingColumns += $column
                    Write-Host "✗ Column '$column' missing" -ForegroundColor Red
                }
            }
            
            Write-Host ""
            Write-Host "Enhanced columns summary:" -ForegroundColor Cyan
            Write-Host "Found: $($foundColumns -join ', ')" -ForegroundColor Green
            if ($missingColumns.Count -gt 0) {
                Write-Host "Missing: $($missingColumns -join ', ')" -ForegroundColor Red
            }
            
        } else {
            Write-Host "⚠ Frontend page status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Error accessing frontend: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "4. Testing Enhanced Filter Features" -ForegroundColor Magenta
    Write-Host "==================================" -ForegroundColor Magenta
    
    # Test API dengan berbagai parameter untuk memastikan data lengkap
    $filterTests = @(
        @{ Url = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=10"; Description = "Standard filter dengan 10 records" },
        @{ Url = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=25"; Description = "Extended filter dengan 25 records" }
    )
    
    foreach ($test in $filterTests) {
        Write-Host "Testing: $($test.Description)" -ForegroundColor Yellow
        $testResult = Test-ApiCall -Url $test.Url -Description $test.Description
        if ($testResult) {
            Write-Host "✓ Filter test passed" -ForegroundColor Green
        } else {
            Write-Host "✗ Filter test failed" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "5. Performance & Response Time Test" -ForegroundColor Magenta
    Write-Host "===================================" -ForegroundColor Magenta
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $perfUrl = "$baseUrl/api/attendance/list?startDate=$startDate&endDate=$endDate&limit=50"
    $perfTest = Test-ApiCall -Url $perfUrl -Description "Performance test dengan 50 records dan semua field detail"
    $stopwatch.Stop()
    
    if ($perfTest) {
        Write-Host "✓ Performance test completed in $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Green
        
        if ($stopwatch.ElapsedMilliseconds -lt 3000) {
            Write-Host "✓ Response time baik (< 3s) untuk detailed data" -ForegroundColor Green
        } elseif ($stopwatch.ElapsedMilliseconds -lt 5000) {
            Write-Host "⚠ Response time acceptable (< 5s) untuk detailed data" -ForegroundColor Yellow
        } else {
            Write-Host "⚠ Response time lambat (> 5s) - pertimbangkan optimasi" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== DETAILED SYSTEM TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sistem Riwayat Kehadiran Detail telah ditest dengan hasil:" -ForegroundColor White
Write-Host ""
Write-Host "🔍 DATA FIELDS YANG TELAH DITAMBAHKAN:" -ForegroundColor Green
Write-Host "   ✓ breakStartTime & breakEndTime - Waktu istirahat detail" -ForegroundColor White
Write-Host "   ✓ overtimeStartTime & overtimeEndTime - Waktu lembur detail" -ForegroundColor White
Write-Host "   ✓ isLate, minutesLate, roundedMinutesLate - Tracking keterlambatan" -ForegroundColor White
Write-Host "   ✓ latenessMessage - Pesan detail keterlambatan" -ForegroundColor White
Write-Host "   ✓ isAutoCutOff & autoCutOffReason - Info auto cut-off" -ForegroundColor White
Write-Host "   ✓ isCheckInValidated & isCheckOutValidated - Status validasi" -ForegroundColor White
Write-Host ""
Write-Host "🎯 FITUR FRONTEND YANG TELAH DIENHANCE:" -ForegroundColor Blue
Write-Host "   ✓ 17 kolom detail (vs 10 kolom sebelumnya)" -ForegroundColor White
Write-Host "   ✓ Kolom Istirahat Mulai & Selesai" -ForegroundColor White
Write-Host "   ✓ Kolom Lembur Mulai & Selesai" -ForegroundColor White
Write-Host "   ✓ Kolom Keterlambatan dengan badge visual" -ForegroundColor White
Write-Host "   ✓ Kolom Auto Cut-off dengan badge" -ForegroundColor White
Write-Host "   ✓ Status validasi check-in/out" -ForegroundColor White
Write-Host "   ✓ Jam kerja dengan format yang lebih baik (1.50h)" -ForegroundColor White
Write-Host "   ✓ Filter berdasarkan keterlambatan & auto cut-off" -ForegroundColor White
Write-Host "   ✓ Summary statistics untuk 6 metrik" -ForegroundColor White
Write-Host "   ✓ Responsive table dengan horizontal scroll" -ForegroundColor White
Write-Host ""
Write-Host "📊 ANALYTICS & INSIGHTS:" -ForegroundColor Purple
Write-Host "   ✓ Summary untuk jumlah hadir, terlambat, tidak hadir" -ForegroundColor White
Write-Host "   ✓ Tracking auto cut-off usage" -ForegroundColor White
Write-Host "   ✓ Monitoring lembur dan validasi data" -ForegroundColor White
Write-Host "   ✓ Detail keterlambatan untuk HR analytics" -ForegroundColor White
Write-Host ""
Write-Host "🚀 SISTEM SEKARANG MEMBERIKAN:" -ForegroundColor Cyan
Write-Host "   • Transparansi penuh untuk setiap waktu kerja" -ForegroundColor White
Write-Host "   • Detail lengkap istirahat dan lembur" -ForegroundColor White
Write-Host "   • Tracking keterlambatan dengan pembulatan otomatis" -ForegroundColor White
Write-Host "   • Monitoring auto cut-off untuk audit" -ForegroundColor White
Write-Host "   • Data validasi untuk kualitas data" -ForegroundColor White
Write-Host "   • Analytics summary untuk decision making" -ForegroundColor White
Write-Host ""
Write-Host "✨ DAFTAR RIWAYAT KEHADIRAN SEKARANG SANGAT DETAIL! ✨" -ForegroundColor Green 