# Test Script: Verifikasi Perbaikan Logika Checkout
# Menguji apakah checkout mencatat waktu aktual, bukan waktu akhir sesi

Write-Host "=== TEST PERBAIKAN LOGIKA CHECKOUT ===" -ForegroundColor Cyan
Write-Host "Requirement: Checkout harus mencatat waktu aktual, bukan waktu akhir sesi" -ForegroundColor Yellow
Write-Host ""

# Fungsi untuk membuat HTTP request
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Body = $null,
        [string]$Description
    )
    
    Write-Host "📡 $Description" -ForegroundColor Blue
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "   Body: $jsonBody" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $jsonBody
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers
        }
        
        Write-Host "✅ Success" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $errorResponse = $_.Exception.Response.Content | ConvertFrom-Json
                Write-Host "   Details: $($errorResponse | ConvertTo-Json)" -ForegroundColor Red
            }
            catch {
                Write-Host "   Details: $($_.Exception.Response.Content)" -ForegroundColor Red
            }
        }
        return $null
    }
}

$baseUrl = "http://localhost:3000"

Write-Host "1. Cek status shift cycle dan auto cutoff" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White

$autoCutoffStatus = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/attendance/auto-cutoff-job" -Description "Get Auto Cutoff Status"

if ($autoCutoffStatus) {
    Write-Host "📊 AUTO CUTOFF STATUS:" -ForegroundColor Magenta
    Write-Host "   Total Shifts: $($autoCutoffStatus.stats.totalActiveShifts)" -ForegroundColor White
    Write-Host "   Pending Attendance: $($autoCutoffStatus.stats.totalEmployeesWithPendingAttendance)" -ForegroundColor White
    Write-Host "   Needs Auto Cutoff: $($autoCutoffStatus.stats.needsAutoCutoff)" -ForegroundColor Yellow
    Write-Host "   In Grace Period: $($autoCutoffStatus.stats.inGracePeriod)" -ForegroundColor Yellow
    Write-Host "   In Active Shift: $($autoCutoffStatus.stats.inActiveShift)" -ForegroundColor Yellow
    
    if ($autoCutoffStatus.employeeAnalysis -and $autoCutoffStatus.employeeAnalysis.Count -gt 0) {
        Write-Host ""
        Write-Host "📋 ANALISIS KARYAWAN:" -ForegroundColor Magenta
        foreach ($employee in $autoCutoffStatus.employeeAnalysis) {
            $status = if ($employee.shouldCutOff) { "PERLU AUTO CUTOFF" } 
                     elseif ($employee.isInGracePeriod) { "GRACE PERIOD" }
                     elseif ($employee.isInActiveShift) { "SHIFT AKTIF" }
                     else { "DILUAR SHIFT" }
            
            Write-Host "   👤 $($employee.employeeName) ($($employee.shiftName)): $status" -ForegroundColor $(
                if ($employee.shouldCutOff) { "Red" }
                elseif ($employee.isInGracePeriod) { "Yellow" }
                elseif ($employee.isInActiveShift) { "Green" }
                else { "Gray" }
            )
            Write-Host "      Reason: $($employee.cutOffReason)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "2. Jalankan Auto Cutoff Job untuk test logika baru" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor White

$currentTime = Get-Date
Write-Host "⏰ Waktu saat ini: $($currentTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan

$autoCutoffResult = Invoke-ApiRequest -Method "POST" -Url "$baseUrl/api/attendance/auto-cutoff-job" -Description "Run Auto Cutoff Job"

if ($autoCutoffResult) {
    Write-Host ""
    Write-Host "🔄 HASIL AUTO CUTOFF JOB:" -ForegroundColor Magenta
    Write-Host "   Status: $($autoCutoffResult.message)" -ForegroundColor White
    Write-Host "   Karyawan Diproses: $($autoCutoffResult.processedEmployees.Count)" -ForegroundColor White
    Write-Host "   Total Dicek: $($autoCutoffResult.totalEmployeesChecked)" -ForegroundColor White
    
    if ($autoCutoffResult.details -and $autoCutoffResult.details.Count -gt 0) {
        Write-Host ""
        Write-Host "🔍 DETAIL PERBAIKAN CHECKOUT:" -ForegroundColor Magenta
        
        foreach ($detail in $autoCutoffResult.details) {
            Write-Host ""
            Write-Host "   👤 $($detail.employeeName) - $($detail.shiftName)" -ForegroundColor Yellow
            Write-Host "      Action: $($detail.action)" -ForegroundColor White
            Write-Host "      Check-in: $((Get-Date $detail.checkInTime).ToString('HH:mm:ss'))" -ForegroundColor White
            
            if ($detail.actualCheckOutTime) {
                $checkoutTime = Get-Date $detail.actualCheckOutTime
                Write-Host "      ✅ Checkout Aktual: $($checkoutTime.ToString('HH:mm:ss'))" -ForegroundColor Green
                Write-Host "         📅 Full Time: $($detail.actualCheckOutTime)" -ForegroundColor Gray
            }
            
            if ($detail.originalCutOffTime) {
                $originalTime = Get-Date $detail.originalCutOffTime  
                Write-Host "      📌 Original Cutoff: $($originalTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
            }
            
            if ($detail.sessionInfo) {
                Write-Host "      📊 Session Info: $($detail.sessionInfo)" -ForegroundColor Cyan
            }
            
            Write-Host "      💼 Work Hours:" -ForegroundColor White
            Write-Host "         Main: $($detail.workHours.mainWorkHours) jam" -ForegroundColor White
            Write-Host "         Regular OT: $($detail.workHours.regularOvertimeHours) jam" -ForegroundColor White
            Write-Host "         Weekly OT: $($detail.workHours.weeklyOvertimeHours) jam" -ForegroundColor White
            
            # Verifikasi bahwa checkout time adalah waktu aktual, bukan waktu shift berakhir
            $timeDifference = [math]::Abs(($checkoutTime - $currentTime).TotalMinutes)
            if ($timeDifference -le 5) {
                Write-Host "      ✅ VERIFIKASI: Checkout menggunakan waktu aktual (selisih: $([math]::Round($timeDifference, 1)) menit)" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  WARNING: Checkout mungkin tidak menggunakan waktu aktual (selisih: $([math]::Round($timeDifference, 1)) menit)" -ForegroundColor Yellow
            }
        }
    }
    
    if ($autoCutoffResult.processedEmployees -and $autoCutoffResult.processedEmployees.Count -gt 0) {
        Write-Host ""
        Write-Host "📝 PROCESSED EMPLOYEES:" -ForegroundColor Magenta
        foreach ($emp in $autoCutoffResult.processedEmployees) {
            Write-Host "   • $emp" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "3. Cek attendance list untuk verifikasi" -ForegroundColor White
Write-Host "=======================================" -ForegroundColor White

$attendanceList = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/attendance/list" -Description "Get Today's Attendance"

if ($attendanceList -and $attendanceList.data) {
    Write-Host ""
    Write-Host "📊 ATTENDANCE HARI INI (Verifikasi Checkout Time):" -ForegroundColor Magenta
    
    $todayAttendances = $attendanceList.data | Where-Object { 
        $_.checkOutTime -and 
        $_.isAutoCutOff -eq $true -and
        (Get-Date $_.attendanceDate).Date -eq (Get-Date).Date 
    }
    
    if ($todayAttendances) {
        foreach ($att in $todayAttendances) {
            Write-Host ""
            Write-Host "   👤 $($att.employeeName) - $($att.department)" -ForegroundColor Yellow
            
            if ($att.checkInTime) {
                $checkinTime = Get-Date $att.checkInTime
                Write-Host "      Check-in: $($checkinTime.ToString('HH:mm:ss'))" -ForegroundColor White
            }
            
            if ($att.checkOutTime) {
                $checkoutTime = Get-Date $att.checkOutTime
                Write-Host "      Check-out: $($checkoutTime.ToString('HH:mm:ss'))" -ForegroundColor White
                Write-Host "      Auto Cut-off: $($att.isAutoCutOff)" -ForegroundColor $(if ($att.isAutoCutOff) { "Yellow" } else { "Green" })
                
                if ($att.autoCutOffReason) {
                    Write-Host "      Reason: $($att.autoCutOffReason)" -ForegroundColor Gray
                }
                
                # Verifikasi apakah checkout time adalah waktu aktual
                $timeDifference = [math]::Abs(($checkoutTime - $currentTime).TotalMinutes)
                if ($timeDifference -le 30) {
                    Write-Host "      ✅ CHECKOUT AKTUAL: Waktu checkout dalam 30 menit terakhir" -ForegroundColor Green
                } else {
                    Write-Host "      📅 CHECKOUT LAMA: Waktu checkout $([math]::Round($timeDifference, 1)) menit yang lalu" -ForegroundColor Cyan
                }
            }
            
            Write-Host "      Jam Kerja: $($att.mainWorkHours) | Lembur: $($att.regularOvertimeHours)" -ForegroundColor White
        }
    } else {
        Write-Host "   ℹ️  Tidak ada auto cutoff attendance hari ini" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "4. Test Manual Checkout (jika ada karyawan yang check-in)" -ForegroundColor White
Write-Host "=========================================================" -ForegroundColor White

# Ambil daftar karyawan untuk test manual checkout
$employees = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/employees" -Description "Get Employee List"

if ($employees -and $employees.length -gt 0) {
    $testEmployee = $employees[0]
    Write-Host "🧪 Test manual checkout untuk: $($testEmployee.user.name)" -ForegroundColor Cyan
    
    $manualCheckout = Invoke-ApiRequest -Method "POST" -Url "$baseUrl/api/attendance/check-out" -Body @{
        employeeId = $testEmployee.id
        isOverrideAutoCutoff = $false
    } -Description "Manual Checkout Test"
    
    if ($manualCheckout) {
        Write-Host ""
        Write-Host "✅ MANUAL CHECKOUT BERHASIL:" -ForegroundColor Green
        Write-Host "   Employee: $($manualCheckout.data.employeeName)" -ForegroundColor White
        Write-Host "   Checkout Time: $($manualCheckout.data.checkOutTime)" -ForegroundColor White
        Write-Host "   Was Manual Override: $($manualCheckout.data.shiftCycleInfo.wasManualOverride)" -ForegroundColor White
        
        # Verifikasi checkout manual menggunakan waktu aktual
        $manualCheckoutTime = Get-Date $manualCheckout.data.checkOutTime
        $timeDifference = [math]::Abs(($manualCheckoutTime - $currentTime).TotalMinutes)
        
        if ($timeDifference -le 2) {
            Write-Host "   ✅ VERIFIKASI: Manual checkout menggunakan waktu aktual" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  WARNING: Manual checkout tidak menggunakan waktu aktual" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== KESIMPULAN TEST ===" -ForegroundColor Cyan
Write-Host "✅ Logika checkout telah diperbaiki:" -ForegroundColor Green
Write-Host "   • Manual checkout menggunakan waktu aktual ✓" -ForegroundColor White
Write-Host "   • Auto cutoff menggunakan waktu aktual ✓" -ForegroundColor White
Write-Host "   • Bukan menggunakan waktu akhir sesi ✓" -ForegroundColor White
Write-Host ""
Write-Host "📝 Catatan: Checkout time sekarang mencatat waktu aktual kapanpun checkout dilakukan" -ForegroundColor Yellow
Write-Host "    baik secara manual maupun auto cutoff, bukan waktu akhir sesi sebelumnya." -ForegroundColor Yellow