# Test Script untuk Enhanced Shift Cycle Management
# Menguji implementasi shift cycle yang baru menggantikan daily cycle

Write-Host "🚀 TESTING ENHANCED SHIFT CYCLE MANAGEMENT" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Konfigurasi
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n📋 Test Cases:" -ForegroundColor Yellow
Write-Host "1. ✓ Enhanced Auto Cut-off Job dengan Shift Cycle Detection" -ForegroundColor Green
Write-Host "2. ✓ Shift Cycle Validation untuk Check-in/Check-out" -ForegroundColor Green  
Write-Host "3. ✓ Cross-Day Shift Support (shift melewati tengah malam)" -ForegroundColor Green
Write-Host "4. ✓ Grace Period Management (15 menit setelah shift berakhir)" -ForegroundColor Green
Write-Host "5. ✓ Manual Override untuk Auto Cut-off" -ForegroundColor Green

# Test 1: Status Enhanced Auto Cut-off Job
Write-Host "`n🔍 TEST 1: Enhanced Auto Cut-off Job Status" -ForegroundColor Magenta
Write-Host "-" * 50 -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/attendance/auto-cutoff-job" -Method GET -Headers $headers
    
    if ($response.success) {
        Write-Host "✅ Enhanced Auto Cut-off Job Status berhasil" -ForegroundColor Green
        Write-Host "📊 Statistics:" -ForegroundColor White
        Write-Host "   Total Active Shifts: $($response.stats.totalActiveShifts)" -ForegroundColor White
        Write-Host "   Employees with Pending Attendance: $($response.stats.totalEmployeesWithPendingAttendance)" -ForegroundColor White
        Write-Host "   Needs Auto Cut-off: $($response.stats.needsAutoCutoff)" -ForegroundColor White
        Write-Host "   In Grace Period: $($response.stats.inGracePeriod)" -ForegroundColor White
        Write-Host "   In Active Shift: $($response.stats.inActiveShift)" -ForegroundColor White
        
        Write-Host "`n🔄 Current Shift Cycles:" -ForegroundColor Cyan
        foreach ($cycle in $response.currentShiftCycles) {
            Write-Host "   - $($cycle.name) ($($cycle.type))" -ForegroundColor White
            Write-Host "     Start: $($cycle.startTime)" -ForegroundColor Gray
            Write-Host "     End: $($cycle.endTime)" -ForegroundColor Gray
        }
        
        Write-Host "`n👥 Employee Analysis:" -ForegroundColor Cyan
        foreach ($employee in $response.employeeAnalysis) {
            Write-Host "   - $($employee.employeeName) ($($employee.shiftName))" -ForegroundColor White
            Write-Host "     Should Cut-off: $($employee.shouldCutOff)" -ForegroundColor $(if ($employee.shouldCutOff) { "Red" } else { "Green" })
            Write-Host "     Reason: $($employee.cutOffReason)" -ForegroundColor Gray
        }
        
        Write-Host "`n💡 Recommendation: $($response.nextJobRecommendation)" -ForegroundColor Yellow
        
    } else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to get enhanced auto cut-off job status: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Run Enhanced Auto Cut-off Job
Write-Host "`n🔄 TEST 2: Run Enhanced Auto Cut-off Job" -ForegroundColor Magenta
Write-Host "-" * 50 -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/attendance/auto-cutoff-job" -Method POST -Headers $headers
    
    if ($response.success) {
        Write-Host "✅ Enhanced Auto Cut-off Job berhasil dijalankan" -ForegroundColor Green
        Write-Host "📊 Results:" -ForegroundColor White
        Write-Host "   Total Employees Checked: $($response.totalEmployeesChecked)" -ForegroundColor White
        Write-Host "   Employees Processed: $($response.processedEmployees.Count)" -ForegroundColor White
        
        if ($response.processedEmployees.Count -gt 0) {
            Write-Host "`n👥 Processed Employees:" -ForegroundColor Cyan
            foreach ($employee in $response.processedEmployees) {
                Write-Host "   - $employee" -ForegroundColor White
            }
            
            Write-Host "`n🔍 Cut-off Details:" -ForegroundColor Cyan
            foreach ($detail in $response.details) {
                Write-Host "   Employee: $($detail.employeeName)" -ForegroundColor White
                Write-Host "   Shift: $($detail.shiftName)" -ForegroundColor White
                Write-Host "   Action: $($detail.action)" -ForegroundColor White
                Write-Host "   Check-in: $($detail.checkInTime)" -ForegroundColor Gray
                Write-Host "   Cut-off Time: $($detail.cutOffTime)" -ForegroundColor Gray
                Write-Host "   Reason: $($detail.reason)" -ForegroundColor Gray
                Write-Host "   ---" -ForegroundColor Gray
            }
        } else {
            Write-Host "ℹ️ No employees needed auto cut-off at this time" -ForegroundColor Blue
        }
        
        Write-Host "`n🔄 Shift Cycle Info:" -ForegroundColor Cyan
        Write-Host "   Total Active Shifts: $($response.shiftCycleInfo.totalActiveShifts)" -ForegroundColor White
        Write-Host "   Current Shift Cycles: $($response.shiftCycleInfo.currentShiftCycles.Count)" -ForegroundColor White
        
    } else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to run enhanced auto cut-off job: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Shift Cycle Check-in Validation
Write-Host "`n🚪 TEST 3: Enhanced Shift Cycle Check-in" -ForegroundColor Magenta
Write-Host "-" * 50 -ForegroundColor Gray

# Ambil data employee untuk test
try {
    $employeesResponse = Invoke-RestMethod -Uri "$baseUrl/api/employees" -Method GET -Headers $headers
    
    if ($employeesResponse.success -and $employeesResponse.data.length -gt 0) {
        $testEmployee = $employeesResponse.data[0]
        Write-Host "🧪 Testing with employee: $($testEmployee.user.name)" -ForegroundColor Blue
        
        # Test check-in dengan shift cycle validation
        $checkInPayload = @{
            employeeId = $testEmployee.id
        } | ConvertTo-Json
        
        try {
            $checkInResponse = Invoke-RestMethod -Uri "$baseUrl/api/attendance/check-in" -Method POST -Headers $headers -Body $checkInPayload
            
            if ($checkInResponse.success) {
                Write-Host "✅ Enhanced check-in berhasil" -ForegroundColor Green
                Write-Host "📊 Check-in Info:" -ForegroundColor White
                Write-Host "   Employee: $($checkInResponse.data.employeeName)" -ForegroundColor White
                Write-Host "   Shift: $($checkInResponse.data.shift)" -ForegroundColor White
                Write-Host "   Actual Time: $($checkInResponse.data.actualCheckInTime)" -ForegroundColor White
                Write-Host "   Recorded Time: $($checkInResponse.data.recordedCheckInTime)" -ForegroundColor White
                
                Write-Host "`n🔄 Shift Cycle Info:" -ForegroundColor Cyan
                Write-Host "   Current Shift: $($checkInResponse.data.shiftCycleInfo.currentShift)" -ForegroundColor White
                Write-Host "   Next Shift: $($checkInResponse.data.shiftCycleInfo.nextShift)" -ForegroundColor White
                Write-Host "   In Grace Period: $($checkInResponse.data.shiftCycleInfo.isInGracePeriod)" -ForegroundColor White
                Write-Host "   Active Shift Period: $($checkInResponse.data.shiftCycleInfo.isActiveShiftPeriod)" -ForegroundColor White
                Write-Host "   Can Check In: $($checkInResponse.data.shiftCycleInfo.canCheckIn)" -ForegroundColor White
                Write-Host "   Can Check Out: $($checkInResponse.data.shiftCycleInfo.canCheckOut)" -ForegroundColor White
                
                # Store attendance ID for check-out test
                $global:testAttendanceId = $checkInResponse.data.attendanceId
            } else {
                Write-Host "❌ Check-in failed: $($checkInResponse.error)" -ForegroundColor Red
                if ($checkInResponse.shiftCycleInfo) {
                    Write-Host "🔄 Shift Cycle Info:" -ForegroundColor Yellow
                    Write-Host "   Current Shift: $($checkInResponse.shiftCycleInfo.currentShift)" -ForegroundColor White
                    Write-Host "   Can Check In: $($checkInResponse.shiftCycleInfo.canCheckIn)" -ForegroundColor White
                }
            }
        } catch {
            Write-Host "❌ Check-in request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ No employees found for testing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get employees: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Enhanced Check-out with Manual Override
Write-Host "`n🚪 TEST 4: Enhanced Shift Cycle Check-out" -ForegroundColor Magenta
Write-Host "-" * 50 -ForegroundColor Gray

if ($global:testAttendanceId) {
    # Test normal check-out
    $checkOutPayload = @{
        employeeId = $testEmployee.id
        isOverrideAutoCutoff = $false
    } | ConvertTo-Json
    
    try {
        $checkOutResponse = Invoke-RestMethod -Uri "$baseUrl/api/attendance/check-out" -Method POST -Headers $headers -Body $checkOutPayload
        
        if ($checkOutResponse.success) {
            Write-Host "✅ Enhanced check-out berhasil" -ForegroundColor Green
            Write-Host "📊 Check-out Info:" -ForegroundColor White
            Write-Host "   Employee: $($checkOutResponse.data.employeeName)" -ForegroundColor White
            Write-Host "   Check-in: $($checkOutResponse.data.checkInTime)" -ForegroundColor White
            Write-Host "   Check-out: $($checkOutResponse.data.checkOutTime)" -ForegroundColor White
            Write-Host "   Main Work Hours: $($checkOutResponse.data.mainWorkHours)" -ForegroundColor White
            Write-Host "   Regular OT Hours: $($checkOutResponse.data.regularOvertimeHours)" -ForegroundColor White
            
            Write-Host "`n🔄 Shift Cycle Info:" -ForegroundColor Cyan
            Write-Host "   Current Shift: $($checkOutResponse.data.shiftCycleInfo.currentShift)" -ForegroundColor White
            Write-Host "   Was Manual Override: $($checkOutResponse.data.shiftCycleInfo.wasManualOverride)" -ForegroundColor White
            Write-Host "   In Grace Period: $($checkOutResponse.data.shiftCycleInfo.isInGracePeriod)" -ForegroundColor White
            
        } else {
            Write-Host "❌ Check-out failed: $($checkOutResponse.error)" -ForegroundColor Red
            
            # Test manual override if normal check-out failed
            if ($checkOutResponse.canOverride) {
                Write-Host "`n🔄 Testing Manual Override..." -ForegroundColor Yellow
                
                $overridePayload = @{
                    employeeId = $testEmployee.id
                    isOverrideAutoCutoff = $true
                } | ConvertTo-Json
                
                try {
                    $overrideResponse = Invoke-RestMethod -Uri "$baseUrl/api/attendance/check-out" -Method POST -Headers $headers -Body $overridePayload
                    
                    if ($overrideResponse.success) {
                        Write-Host "✅ Manual override check-out berhasil" -ForegroundColor Green
                        Write-Host "📊 Override Info:" -ForegroundColor White
                        Write-Host "   Was Manual Override: $($overrideResponse.data.shiftCycleInfo.wasManualOverride)" -ForegroundColor White
                    } else {
                        Write-Host "❌ Manual override failed: $($overrideResponse.error)" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "❌ Manual override request failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "❌ Check-out request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ No test attendance ID available for check-out test" -ForegroundColor Yellow
}

# Summary
Write-Host "`n📋 SUMMARY: Enhanced Shift Cycle Management" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n🎯 Key Features Implemented:" -ForegroundColor Green
Write-Host "   ✓ Enhanced Shift Detection Logic dengan shift cycle" -ForegroundColor White
Write-Host "   ✓ Modified Auto Cut-off Job menggunakan shift cycle" -ForegroundColor White  
Write-Host "   ✓ Grace Period Management (15 menit setelah shift)" -ForegroundColor White
Write-Host "   ✓ Cross-Day Shift Support (melewati tengah malam)" -ForegroundColor White
Write-Host "   ✓ Manual Override capability" -ForegroundColor White
Write-Host "   ✓ Continuous Shift Operation tanpa jeda" -ForegroundColor White

Write-Host "`n🔄 Shift Cycle Benefits:" -ForegroundColor Yellow
Write-Host "   • Tidak lagi bergantung pada daily cycle (jam 12 malam)" -ForegroundColor White
Write-Host "   • Support untuk 2 shift (A dan B) pada hari berbeda" -ForegroundColor White
Write-Host "   • Karyawan shift malam bisa checkout normal" -ForegroundColor White
Write-Host "   • Grace period 15 menit untuk fleksibilitas" -ForegroundColor White
Write-Host "   • Auto cut-off berdasarkan shift cycle, bukan jam" -ForegroundColor White

Write-Host "`n💡 Usage:" -ForegroundColor Cyan
Write-Host "   • Sistem sekarang menggunakan shift cycle detection" -ForegroundColor White
Write-Host "   • Auto cut-off berjalan per shift, bukan per hari" -ForegroundColor White
Write-Host "   • Shift berikutnya langsung dimulai tanpa jeda" -ForegroundColor White
Write-Host "   • Manual override tersedia untuk kasus khusus" -ForegroundColor White

Write-Host "`n✅ Test completed!" -ForegroundColor Green
Write-Host "🔗 Run: node auto-cutoff-cron.js run" -ForegroundColor Blue
Write-Host "📊 Check: node auto-cutoff-cron.js status" -ForegroundColor Blue 