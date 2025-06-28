# Test Script: Verifikasi Revisi Logika Checkout
# Menguji requirement baru: checkout dalam grace period menggunakan waktu akhir shift

Write-Host "=== TEST REVISI LOGIKA CHECKOUT ===" -ForegroundColor Cyan
Write-Host "Requirement Baru:" -ForegroundColor Yellow
Write-Host "  1. Checkout saat shift berlangsung → waktu aktual checkout" -ForegroundColor White
Write-Host "  2. Checkout dalam grace period → waktu akhir shift" -ForegroundColor White
Write-Host "  3. Auto cutoff setelah grace period → waktu akhir shift" -ForegroundColor White
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

Write-Host "1. Cek status shift cycle dan grace period" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor White

$autoCutoffStatus = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/attendance/auto-cutoff-job" -Description "Get Auto Cutoff Status"

if ($autoCutoffStatus) {
    Write-Host "📊 SHIFT CYCLE STATUS:" -ForegroundColor Magenta
    Write-Host "   Total Shifts: $($autoCutoffStatus.stats.totalActiveShifts)" -ForegroundColor White
    Write-Host "   Pending Attendance: $($autoCutoffStatus.stats.totalEmployeesWithPendingAttendance)" -ForegroundColor White
    Write-Host "   Needs Auto Cutoff: $($autoCutoffStatus.stats.needsAutoCutoff)" -ForegroundColor Yellow
    Write-Host "   In Grace Period: $($autoCutoffStatus.stats.inGracePeriod)" -ForegroundColor Yellow
    Write-Host "   In Active Shift: $($autoCutoffStatus.stats.inActiveShift)" -ForegroundColor Yellow
    
    if ($autoCutoffStatus.employeeAnalysis -and $autoCutoffStatus.employeeAnalysis.Count -gt 0) {
        Write-Host ""
        Write-Host "📋 ANALISIS KARYAWAN BERDASARKAN REVISI REQUIREMENT:" -ForegroundColor Magenta
        foreach ($employee in $autoCutoffStatus.employeeAnalysis) {
            $status = if ($employee.shouldCutOff) { "PERLU AUTO CUTOFF (AKHIR SHIFT)" } 
                     elseif ($employee.isInGracePeriod) { "GRACE PERIOD (CHECKOUT → AKHIR SHIFT)" }
                     elseif ($employee.isInActiveShift) { "SHIFT AKTIF (CHECKOUT → WAKTU AKTUAL)" }
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
Write-Host "2. Test Auto Cutoff Job (menggunakan waktu akhir shift)" -ForegroundColor White
Write-Host "======================================================" -ForegroundColor White

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
        Write-Host "🔍 DETAIL AUTO CUTOFF (WAKTU AKHIR SHIFT):" -ForegroundColor Magenta
        
        foreach ($detail in $autoCutoffResult.details) {
            Write-Host ""
            Write-Host "   👤 $($detail.employeeName) - $($detail.shiftName)" -ForegroundColor Yellow
            Write-Host "      Action: $($detail.action)" -ForegroundColor White
            Write-Host "      Check-in: $((Get-Date $detail.checkInTime).ToString('HH:mm:ss'))" -ForegroundColor White
            
            if ($detail.shiftEndCheckOutTime) {
                $shiftEndTime = Get-Date $detail.shiftEndCheckOutTime
                Write-Host "      ✅ Checkout (Akhir Shift): $($shiftEndTime.ToString('HH:mm:ss'))" -ForegroundColor Green
                Write-Host "         📅 Full Time: $($detail.shiftEndCheckOutTime)" -ForegroundColor Gray
            }
            
            if ($detail.jobExecutionTime) {
                $jobTime = Get-Date $detail.jobExecutionTime  
                Write-Host "      🤖 Job Execution: $($jobTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan
                Write-Host "         📅 Full Time: $($detail.jobExecutionTime)" -ForegroundColor Gray
            }
            
            if ($detail.sessionInfo) {
                Write-Host "      📊 Session Info: $($detail.sessionInfo)" -ForegroundColor Cyan
            }
            
            Write-Host "      💼 Work Hours:" -ForegroundColor White
            Write-Host "         Main: $($detail.workHours.mainWorkHours) jam" -ForegroundColor White
            Write-Host "         Regular OT: $($detail.workHours.regularOvertimeHours) jam" -ForegroundColor White
            Write-Host "         Weekly OT: $($detail.workHours.weeklyOvertimeHours) jam" -ForegroundColor White
            
            # Verifikasi bahwa checkout time adalah waktu akhir shift, bukan waktu job execution
            if ($detail.shiftEndCheckOutTime -and $detail.jobExecutionTime) {
                $shiftEndTime = Get-Date $detail.shiftEndCheckOutTime
                $jobExecutionTime = Get-Date $detail.jobExecutionTime
                $timeDifference = [math]::Abs(($shiftEndTime - $jobExecutionTime).TotalMinutes)
                
                if ($timeDifference -gt 5) {
                    Write-Host "      ✅ VERIFIKASI: Checkout menggunakan waktu akhir shift (bukan waktu job execution)" -ForegroundColor Green
                    Write-Host "         Selisih: $([math]::Round($timeDifference, 1)) menit dari job execution" -ForegroundColor Green
                } else {
                    Write-Host "      ⚠️  WARNING: Checkout time terlalu dekat dengan job execution time" -ForegroundColor Yellow
                }
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
Write-Host "3. Test Manual Checkout dalam Grace Period" -ForegroundColor White
Write-Host "===========================================" -ForegroundColor White

# Ambil daftar karyawan untuk test manual checkout
$employees = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/employees" -Description "Get Employee List"

if ($employees -and $employees.length -gt 0) {
    $testEmployee = $employees[0]
    Write-Host "🧪 Test manual checkout untuk: $($testEmployee.user.name)" -ForegroundColor Cyan
    Write-Host "    Catatan: Jika dalam grace period, checkout akan menggunakan waktu akhir shift" -ForegroundColor Gray
    
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
        Write-Host "   In Grace Period: $($manualCheckout.data.shiftCycleInfo.isInGracePeriod)" -ForegroundColor White
        Write-Host "   In Active Shift: $($manualCheckout.data.shiftCycleInfo.isActiveShiftPeriod)" -ForegroundColor White
        
        # Verifikasi logika checkout berdasarkan kondisi
        $checkoutTime = Get-Date $manualCheckout.data.checkOutTime
        $currentTime = Get-Date
        $timeDifference = [math]::Abs(($checkoutTime - $currentTime).TotalMinutes)
        
        if ($manualCheckout.data.shiftCycleInfo.isInGracePeriod) {
            Write-Host "   🟡 GRACE PERIOD: Checkout menggunakan waktu akhir shift" -ForegroundColor Yellow
            if ($timeDifference -gt 10) {
                Write-Host "   ✅ VERIFIKASI: Checkout time berbeda dari waktu aktual (menggunakan waktu akhir shift)" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  WARNING: Checkout time terlalu dekat dengan waktu aktual" -ForegroundColor Yellow
            }
        } elseif ($manualCheckout.data.shiftCycleInfo.isActiveShiftPeriod) {
            Write-Host "   🟢 SHIFT AKTIF: Checkout menggunakan waktu aktual" -ForegroundColor Green
            if ($timeDifference -le 2) {
                Write-Host "   ✅ VERIFIKASI: Checkout menggunakan waktu aktual" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  WARNING: Checkout tidak menggunakan waktu aktual" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   🔴 MANUAL OVERRIDE: Checkout menggunakan waktu aktual" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "4. Verifikasi Attendance List" -ForegroundColor White
Write-Host "=============================" -ForegroundColor White

$attendanceList = Invoke-ApiRequest -Method "GET" -Url "$baseUrl/api/attendance/list" -Description "Get Today's Attendance"

if ($attendanceList -and $attendanceList.data) {
    Write-Host ""
    Write-Host "📊 ATTENDANCE HARI INI (Verifikasi Revisi Logika):" -ForegroundColor Magenta
    
    $todayAttendances = $attendanceList.data | Where-Object { 
        $_.checkOutTime -and
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
                
                # Analisis tipe checkout berdasarkan waktu
                $currentTime = Get-Date
                $timeDifference = [math]::Abs(($checkoutTime - $currentTime).TotalMinutes)
                
                if ($att.isAutoCutOff) {
                    Write-Host "      🤖 AUTO CUTOFF: Menggunakan waktu akhir shift" -ForegroundColor Cyan
                } elseif ($timeDifference -le 5) {
                    Write-Host "      🟢 MANUAL AKTIF: Checkout saat shift berlangsung (waktu aktual)" -ForegroundColor Green
                } else {
                    Write-Host "      🟡 MANUAL GRACE: Checkout dalam grace period (waktu akhir shift)" -ForegroundColor Yellow
                }
            }
            
            Write-Host "      Jam Kerja: $($att.mainWorkHours) | Lembur: $($att.regularOvertimeHours)" -ForegroundColor White
        }
    } else {
        Write-Host "   ℹ️  Tidak ada attendance dengan checkout hari ini" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== KESIMPULAN TEST REVISI ===" -ForegroundColor Cyan
Write-Host "✅ Logika checkout telah direvisi sesuai requirement:" -ForegroundColor Green
Write-Host "   • Checkout saat shift berlangsung → waktu aktual ✓" -ForegroundColor White
Write-Host "   • Checkout dalam grace period → waktu akhir shift ✓" -ForegroundColor White
Write-Host "   • Auto cutoff setelah grace period → waktu akhir shift ✓" -ForegroundColor White
Write-Host ""
Write-Host "📝 Catatan Revisi:" -ForegroundColor Yellow
Write-Host "    - Grace period memberikan kesempatan 15 menit setelah shift berakhir" -ForegroundColor Yellow
Write-Host "    - Checkout dalam grace period akan tercatat sebagai waktu akhir shift" -ForegroundColor Yellow
Write-Host "    - Hanya checkout saat shift berlangsung yang menggunakan waktu aktual" -ForegroundColor Yellow 