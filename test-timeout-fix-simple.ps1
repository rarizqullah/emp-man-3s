#!/usr/bin/env pwsh

Write-Host "=== Testing Timeout Fix for Employee Detail ===" -ForegroundColor Green
Write-Host ""

# Function to test API endpoint
function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Description,
        [int]$TimeoutSec = 15
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Cyan
    try {
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $TimeoutSec
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "✅ SUCCESS: $($duration.ToString('F2'))s" -ForegroundColor Green
        return $response
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        Write-Host "❌ FAILED: $($duration.ToString('F2'))s - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Wait for server
Write-Host "Waiting for development server..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test 1: Database Health Check
Write-Host ""
$healthCheck = Test-ApiEndpoint -Url "http://localhost:3000/api/employees/clean-connection" -Description "Database Health Check"

if ($healthCheck) {
    Write-Host "   Employee Count: $($healthCheck.employeeCount)" -ForegroundColor White
    Write-Host "   Connection Time: $($healthCheck.connectionTime)ms" -ForegroundColor White
    Write-Host "   Query Time: $($healthCheck.queryTime)ms" -ForegroundColor White
    
    # Test 2: Get Employee List
    Write-Host ""
    $employees = Test-ApiEndpoint -Url "http://localhost:3000/api/employees" -Description "Get Employee List"
    
    if ($employees -and $employees.Count -gt 0) {
        $testEmployeeId = $employees[0].id
        Write-Host "   Found $($employees.Count) employees" -ForegroundColor White
        Write-Host "   Test Employee ID: $testEmployeeId" -ForegroundColor White
        
        # Test 3: Get Employee Detail (Main Test)
        Write-Host ""
        $employee = Test-ApiEndpoint -Url "http://localhost:3000/api/employees/$testEmployeeId" -Description "Get Employee Detail (MAIN TEST)"
        
        if ($employee) {
            Write-Host "   Employee Name: $($employee.name)" -ForegroundColor White
            Write-Host "   Department: $($employee.department.name)" -ForegroundColor White
            Write-Host "   Shift: $($employee.shift.name)" -ForegroundColor White
            
            # Test 4: Multiple Employee Details
            Write-Host ""
            Write-Host "Testing Multiple Employee Details..." -ForegroundColor Cyan
            $successCount = 0
            $totalTests = [Math]::Min(3, $employees.Count)
            
            for ($i = 0; $i -lt $totalTests; $i++) {
                $empId = $employees[$i].id
                $empResult = Test-ApiEndpoint -Url "http://localhost:3000/api/employees/$empId" -Description "Employee $($i+1)" -TimeoutSec 12
                if ($empResult) { $successCount++ }
            }
            
            Write-Host "✅ Multiple Test: $successCount/$totalTests succeeded" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host "Fixes Applied:" -ForegroundColor Yellow
Write-Host "  ✓ Enhanced Prisma client with retry mechanism" -ForegroundColor White
Write-Host "  ✓ Improved AbortController timeout handling" -ForegroundColor White
Write-Host "  ✓ Better error detection and retry logic" -ForegroundColor White
Write-Host "  ✓ Database connection stability improvements" -ForegroundColor White
Write-Host "" 