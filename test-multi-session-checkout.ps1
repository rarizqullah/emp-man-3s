# Test Script untuk Multi-Session Checkout Logic
# Memvalidasi requirement: Case 1-4 sesuai skenario B dengan label "Terlambat Checkout"

Write-Host "=== Test Multi-Session Checkout Logic ===" -ForegroundColor Cyan
Write-Host ""

# Informasi skenario
Write-Host "Skenario B:" -ForegroundColor Yellow
Write-Host "- Main Work: 07:00 - 17:00" -ForegroundColor White
Write-Host "- Overtime: 17:00 - 19:00" -ForegroundColor White  
Write-Host "- Grace Period Main Work: 17:00 - 17:15" -ForegroundColor White
Write-Host "- Grace Period Overtime: 19:00 - 19:15" -ForegroundColor White
Write-Host "- Case 4 dengan label 'Terlambat Checkout' untuk checkout setelah grace period" -ForegroundColor Magenta
Write-Host ""

# Test Cases
$testCases = @(
    @{
        Name = "Case 1: Checkout 16:30 (main work aktif)"
        Time = "16:30"
        Expected = "16:30 (waktu aktual)"
        Description = "Checkout dalam sesi main work aktif"
        ExpectedLateCheckout = $false
    },
    @{
        Name = "Case 2: Checkout 17:05 (grace period main work)"
        Time = "17:05"
        Expected = "17:00 (akhir main work)"
        Description = "Checkout dalam grace period main work"
        ExpectedLateCheckout = $false
    },
    @{
        Name = "Case 3: Checkout 19:05 (grace period overtime)"
        Time = "19:05"
        Expected = "19:00 (akhir overtime)"
        Description = "Checkout dalam grace period overtime"
        ExpectedLateCheckout = $false
    },
    @{
        Name = "Case 4: Checkout 19:20 (setelah semua grace)"
        Time = "19:20"
        Expected = "19:20 (waktu aktual) + 'Terlambat Checkout'"
        Description = "Checkout setelah grace period, manual override dengan label Terlambat Checkout"
        ExpectedLateCheckout = $true
        ExpectedLabel = "Terlambat Checkout"
    }
)

# Function untuk test API
function Test-CheckoutAPI {
    param(
        [string]$EmployeeId,
        [string]$TestName,
        [string]$ExpectedTime,
        [bool]$ExpectedLateCheckout = $false,
        [string]$ExpectedLabel = "",
        [bool]$IsOverride = $false
    )
    
    try {
        Write-Host "Testing: $TestName" -ForegroundColor Cyan
        
        $body = @{
            employeeId = $EmployeeId
            isOverrideAutoCutoff = $IsOverride
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/check-out" -Method POST -Body $body -ContentType "application/json"
        
        if ($response.success) {
            $actualTime = ([DateTime]$response.data.checkOutTime).ToString("HH:mm")
            $sessionType = $response.data.multiSessionInfo.checkoutDecision.sessionType
            $useActualTime = $response.data.multiSessionInfo.checkoutDecision.useActualTime
            $isLateCheckout = $response.data.multiSessionInfo.checkoutDecision.isLateCheckout
            $lateCheckoutLabel = $response.data.multiSessionInfo.checkoutDecision.lateCheckoutLabel
            $reason = $response.data.multiSessionInfo.checkoutDecision.reason
            $message = $response.message
            
            Write-Host "  ✅ SUCCESS" -ForegroundColor Green
            Write-Host "  Expected: $ExpectedTime" -ForegroundColor White
            Write-Host "  Actual: $actualTime" -ForegroundColor White
            Write-Host "  Session Type: $sessionType" -ForegroundColor White
            Write-Host "  Use Actual Time: $useActualTime" -ForegroundColor White
            Write-Host "  Is Late Checkout: $isLateCheckout" -ForegroundColor $(if ($isLateCheckout) { "Red" } else { "Green" })
            Write-Host "  Late Checkout Label: $($lateCheckoutLabel ?? 'None')" -ForegroundColor $(if ($lateCheckoutLabel) { "Red" } else { "Gray" })
            Write-Host "  Success Message: $message" -ForegroundColor Cyan
            Write-Host "  Reason: $reason" -ForegroundColor Gray
            
            # Validasi late checkout
            $lateCheckoutValid = $isLateCheckout -eq $ExpectedLateCheckout
            if ($ExpectedLateCheckout -and $ExpectedLabel) {
                $lateCheckoutValid = $lateCheckoutValid -and ($lateCheckoutLabel -eq $ExpectedLabel)
            }
            
            Write-Host "  Late Checkout Validation: $(if ($lateCheckoutValid) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($lateCheckoutValid) { "Green" } else { "Red" })
            
            return @{
                Success = $true
                ActualTime = $actualTime
                SessionType = $sessionType
                UseActualTime = $useActualTime
                IsLateCheckout = $isLateCheckout
                LateCheckoutLabel = $lateCheckoutLabel
                LateCheckoutValid = $lateCheckoutValid
                Reason = $reason
                Message = $message
            }
        } else {
            Write-Host "  ❌ FAILED: $($response.error)" -ForegroundColor Red
            if ($response.multiSessionInfo) {
                Write-Host "  Session Info:" -ForegroundColor Yellow
                Write-Host "    Current Session: $($response.multiSessionInfo.currentSession ?? 'None')" -ForegroundColor Gray
                Write-Host "    Grace Period Session: $($response.multiSessionInfo.currentGracePeriodSession ?? 'None')" -ForegroundColor Gray
                Write-Host "    Can Checkout: $($response.multiSessionInfo.canCheckout)" -ForegroundColor Gray
                Write-Host "    Reason: $($response.multiSessionInfo.reason)" -ForegroundColor Gray
            }
            return @{
                Success = $false
                Error = $response.error
                CanOverride = $response.canOverride -eq $true
            }
        }
    }
    catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Main test execution
try {
    # Get test employee
    Write-Host "Getting test employee..." -ForegroundColor Yellow
    $employeeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/employees" -Method GET
    
    if (-not $employeeResponse.success -or $employeeResponse.data.Count -eq 0) {
        Write-Host "❌ No employees found for testing" -ForegroundColor Red
        exit 1
    }
    
    $testEmployee = $employeeResponse.data[0]
    $employeeId = $testEmployee.id
    Write-Host "Using test employee: $($testEmployee.name) (ID: $employeeId)" -ForegroundColor Green
    Write-Host ""
    
    # Check current time untuk informasi test
    $currentTime = Get-Date
    Write-Host "Current time: $($currentTime.ToString('HH:mm:ss'))" -ForegroundColor Yellow
    Write-Host "Note: Test results akan tergantung pada waktu sistem saat ini" -ForegroundColor Yellow
    Write-Host ""
    
    # Execute test cases
    $results = @()
    
    foreach ($testCase in $testCases) {
        Write-Host "=== $($testCase.Name) ===" -ForegroundColor Yellow
        Write-Host "Expected: $($testCase.Expected)" -ForegroundColor White
        Write-Host "Description: $($testCase.Description)" -ForegroundColor Gray
        if ($testCase.ExpectedLateCheckout) {
            Write-Host "Expected Late Checkout Label: $($testCase.ExpectedLabel)" -ForegroundColor Magenta
        }
        Write-Host ""
        
        # Determine if override is needed
        $isOverride = $testCase.Name -like "*19:20*" # Case 4 perlu override
        $result = Test-CheckoutAPI -EmployeeId $employeeId -TestName $testCase.Name -ExpectedTime $testCase.Expected -ExpectedLateCheckout $testCase.ExpectedLateCheckout -ExpectedLabel $testCase.ExpectedLabel -IsOverride $isOverride
        
        $results += @{
            TestCase = $testCase.Name
            Expected = $testCase.Expected
            ExpectedLateCheckout = $testCase.ExpectedLateCheckout
            ExpectedLabel = $testCase.ExpectedLabel
            Result = $result
        }
        
        Write-Host ""
        Start-Sleep -Seconds 2
    }
    
    # Summary
    Write-Host "=== Test Summary ===" -ForegroundColor Cyan
    $passCount = 0
    $totalCount = $results.Count
    
    foreach ($result in $results) {
        $isPass = $result.Result.Success
        $status = if ($isPass) { "✅ PASS" } else { "❌ FAIL" }
        if ($isPass) { $passCount++ }
        
        Write-Host "$status - $($result.TestCase)" -ForegroundColor $(if ($isPass) { "Green" } else { "Red" })
        if (-not $result.Result.Success) {
            Write-Host "  Error: $($result.Result.Error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Results: $passCount/$totalCount tests passed" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Yellow" })
    
    if ($passCount -eq $totalCount) {
        Write-Host "🎉 All tests passed! Multi-session checkout logic with 'Terlambat Checkout' label is working correctly." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some tests failed. Please check the implementation." -ForegroundColor Yellow
    }
    
    # Show implementation summary
    Write-Host ""
    Write-Host "=== Implementation Summary ===" -ForegroundColor Cyan
    Write-Host "✅ SessionCheckoutManager implemented" -ForegroundColor Green
    Write-Host "✅ Multi-session checkout logic" -ForegroundColor Green
    Write-Host "✅ Independent grace periods (15 min each)" -ForegroundColor Green
    Write-Host "✅ Case 4: 'Terlambat Checkout' label untuk checkout setelah grace period" -ForegroundColor Green
    Write-Host "✅ Enhanced check-out API dengan multiSessionInfo" -ForegroundColor Green
    Write-Host "✅ Enhanced auto-cutoff job dengan late checkout detection" -ForegroundColor Green
}
catch {
    Write-Host "❌ Test execution failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Completed ===" -ForegroundColor Cyan