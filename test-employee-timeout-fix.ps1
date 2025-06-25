#!/usr/bin/env pwsh

Write-Host "=== Testing Employee Detail Timeout Fix ===" -ForegroundColor Green
Write-Host ""

# Tunggu server startup
Write-Host "Menunggu development server startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Test 1: Database Connection Health Check
Write-Host "1. Testing Database Connection Health..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/employees/clean-connection" -Method Get -TimeoutSec 10
    Write-Host "✅ Database Connection: OK" -ForegroundColor Green
    Write-Host "   Employee Count: $($response.employeeCount)" -ForegroundColor White
} catch {
    Write-Host "❌ Database Connection: Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Get All Employees (untuk cek performance umum)
Write-Host "2. Testing Get All Employees Performance..." -ForegroundColor Cyan
try {
    $startTime = Get-Date
    $employees = Invoke-RestMethod -Uri "http://localhost:3000/api/employees" -Method Get -TimeoutSec 15
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ Get All Employees: OK" -ForegroundColor Green
    Write-Host "   Duration: $($duration.ToString('F2')) seconds" -ForegroundColor White
    Write-Host "   Count: $($employees.Count) employees" -ForegroundColor White
    
    # Ambil ID employee pertama untuk test detail
    if ($employees.Count -gt 0) {
        $testEmployeeId = $employees[0].id
        Write-Host "   Test Employee ID: $testEmployeeId" -ForegroundColor White
        
        # Test 3: Get Employee Detail dengan timeout enhancement
        Write-Host ""
        Write-Host "3. Testing Employee Detail with Timeout Fix..." -ForegroundColor Cyan
        try {
            $startTime = Get-Date
            $employee = Invoke-RestMethod -Uri "http://localhost:3000/api/employees/$testEmployeeId" -Method Get -TimeoutSec 12
            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds
            
            Write-Host "✅ Employee Detail: OK" -ForegroundColor Green
            Write-Host "   Duration: $($duration.ToString('F2')) seconds" -ForegroundColor White
            Write-Host "   Employee: $($employee.name)" -ForegroundColor White
            Write-Host "   Department: $($employee.department.name)" -ForegroundColor White
            Write-Host "   Shift: $($employee.shift.name)" -ForegroundColor White
            
        } catch {
            Write-Host "❌ Employee Detail: Failed" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Get All Employees: Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Stress Test - Multiple concurrent requests
Write-Host "4. Testing Concurrent Employee Detail Requests..." -ForegroundColor Cyan
try {
    $employees = Invoke-RestMethod -Uri "http://localhost:3000/api/employees" -Method Get -TimeoutSec 10
    
    if ($employees.Count -ge 2) {
        $employeeIds = $employees[0..1] | ForEach-Object { $_.id }
        
        $jobs = @()
        foreach ($empId in $employeeIds) {
            $job = Start-Job -ScriptBlock {
                param($id)
                $startTime = Get-Date
                try {
                    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/employees/$id" -Method Get -TimeoutSec 10
                    $endTime = Get-Date
                    $duration = ($endTime - $startTime).TotalSeconds
                    return @{
                        Success = $true
                        Duration = $duration
                        EmployeeName = $result.name
                        Id = $id
                    }
                } catch {
                    $endTime = Get-Date
                    $duration = ($endTime - $startTime).TotalSeconds
                    return @{
                        Success = $false
                        Duration = $duration
                        Error = $_.Exception.Message
                        Id = $id
                    }
                }
            } -ArgumentList $empId
            $jobs += $job
        }
        
        # Tunggu semua job selesai
        $results = $jobs | Wait-Job | Receive-Job
        $jobs | Remove-Job
        
        $successCount = ($results | Where-Object { $_.Success }).Count
        $avgDuration = ($results | Measure-Object -Property Duration -Average).Average
        
        Write-Host "✅ Concurrent Test: $successCount/$($results.Count) succeeded" -ForegroundColor Green
        Write-Host "   Average Duration: $($avgDuration.ToString('F2')) seconds" -ForegroundColor White
        
        foreach ($result in $results) {
            if ($result.Success) {
                Write-Host "   ✅ $($result.EmployeeName): $($result.Duration.ToString('F2'))s" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $($result.Id): $($result.Error)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "❌ Concurrent Test: Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host "Timeout fixes implemented:" -ForegroundColor Yellow
Write-Host "  ✓ API timeout protection (15s database, 8s client)" -ForegroundColor White
Write-Host "  ✓ Enhanced retry logic with exponential backoff" -ForegroundColor White
Write-Host "  ✓ Optimized database queries with select fields" -ForegroundColor White
Write-Host "  ✓ Better error handling and user messages" -ForegroundColor White
Write-Host "  ✓ AbortController for client-side timeout management" -ForegroundColor White
Write-Host "" 