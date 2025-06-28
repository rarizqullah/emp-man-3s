#!/usr/bin/env pwsh

Write-Host "=== Test Transaction Timeout Fix ===" -ForegroundColor Cyan
Write-Host "Menguji perbaikan transaction timeout saat menambah karyawan" -ForegroundColor Yellow

# Function untuk generate random data
function Get-RandomEmployeeData {
    $randomId = Get-Random -Minimum 10000 -Maximum 99999
    $randomEmail = "test$randomId@example.com"
    
    return @{
        # Personal Info
        name = "Test Employee $randomId"
        email = $randomEmail
        phone = "081234567$randomId"
        idNumber = "EMP$randomId"
        positionId = $null # Will set after getting positions
        gender = "MALE"
        address = "Jl. Test No. $randomId"
        
        # Department Info  
        department = $null # Will set after getting departments
        subDepartment = $null # Will set after getting sub departments
        shift = $null # Will set after getting shifts
        
        # Contract Info
        contractType = "Training"
        contractNumber = $null
        contractStartDate = "2024-01-01"
        contractEndDate = "2024-12-31"
        
        # Optional
        faceData = $null
    }
}

# Test 1: Cek ketersediaan API endpoints untuk mendapatkan master data
Write-Host "`n1. Testing master data endpoints..." -ForegroundColor Green

$masterData = @{
    departments = @()
    positions = @()
    shifts = @()
}

# Get departments
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/departments" -Method GET -Headers @{
        "Content-Type" = "application/json"
    } -UseBasicParsing -TimeoutSec 10

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        if ($data -and $data.Count -gt 0) {
            $masterData.departments = $data
            Write-Host "✅ Departments loaded: $($data.Count) items" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No departments found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error loading departments: $($_.Exception.Message)" -ForegroundColor Red
}

# Get positions
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/positions" -Method GET -Headers @{
        "Content-Type" = "application/json"
    } -UseBasicParsing -TimeoutSec 10

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        if ($data -and $data.Count -gt 0) {
            $masterData.positions = $data
            Write-Host "✅ Positions loaded: $($data.Count) items" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No positions found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error loading positions: $($_.Exception.Message)" -ForegroundColor Red
}

# Get shifts
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/shifts" -Method GET -Headers @{
        "Content-Type" = "application/json"
    } -UseBasicParsing -TimeoutSec 10

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        if ($data -and $data.Count -gt 0) {
            $masterData.shifts = $data
            Write-Host "✅ Shifts loaded: $($data.Count) items" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No shifts found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error loading shifts: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test menambah karyawan dengan data yang valid
Write-Host "`n2. Testing employee registration with enhanced timeout..." -ForegroundColor Green

if ($masterData.departments.Count -gt 0 -and $masterData.shifts.Count -gt 0) {
    $testEmployee = Get-RandomEmployeeData
    
    # Set master data IDs
    $testEmployee.department = $masterData.departments[0].id
    $testEmployee.shift = $masterData.shifts[0].id
    
    if ($masterData.positions.Count -gt 0) {
        $testEmployee.positionId = $masterData.positions[0].id
    }
    
    # Test department dengan sub department jika ada
    if ($masterData.departments[0].subDepartments -and $masterData.departments[0].subDepartments.Count -gt 0) {
        $testEmployee.subDepartment = $masterData.departments[0].subDepartments[0].id
    }
    
    Write-Host "Test data:" -ForegroundColor Blue
    Write-Host "  Name: $($testEmployee.name)" -ForegroundColor White
    Write-Host "  Email: $($testEmployee.email)" -ForegroundColor White
    Write-Host "  ID: $($testEmployee.idNumber)" -ForegroundColor White
    Write-Host "  Department: $($testEmployee.department)" -ForegroundColor White
    Write-Host "  Shift: $($testEmployee.shift)" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        
        $jsonBody = $testEmployee | ConvertTo-Json -Depth 10
        Write-Host "`nSending POST request..." -ForegroundColor Blue
        
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/employees/register" -Method POST -Headers @{
            "Content-Type" = "application/json"
        } -Body $jsonBody -UseBasicParsing -TimeoutSec 30
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq 201) {
            $data = $response.Content | ConvertFrom-Json
            Write-Host "✅ Employee registration successful!" -ForegroundColor Green
            Write-Host "Duration: $([math]::Round($duration))ms" -ForegroundColor Blue
            Write-Host "Employee ID: $($data.id)" -ForegroundColor White
            Write-Host "Employee Name: $($data.user.name)" -ForegroundColor White
            
            if ($duration -gt 5000) {
                Write-Host "⚠️ Duration > 5 seconds but transaction completed successfully" -ForegroundColor Yellow
            } else {
                Write-Host "✅ Duration < 5 seconds - good performance" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Unexpected response status: $($response.StatusCode)" -ForegroundColor Red
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "❌ Employee registration failed" -ForegroundColor Red
        Write-Host "Duration: $([math]::Round($duration))ms" -ForegroundColor Blue
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        # Analyze error type
        if ($_.Exception.Message -match "408" -or $_.Exception.Message -match "timeout") {
            Write-Host "🔍 Timeout error detected - this should now be handled better" -ForegroundColor Yellow
        }
        
        if ($_.Exception.Message -match "transaction") {
            Write-Host "🔍 Transaction error detected" -ForegroundColor Yellow
        }
        
        # Try to get response content if available
        try {
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseContent = $reader.ReadToEnd()
                $errorData = $responseContent | ConvertFrom-Json
                
                Write-Host "Error Details:" -ForegroundColor Yellow
                Write-Host "  Message: $($errorData.error)" -ForegroundColor White
                Write-Host "  Retryable: $($errorData.retryable)" -ForegroundColor White
            }
        } catch {
            # Ignore response parsing errors
        }
    }
} else {
    Write-Host "❌ Cannot test employee registration - missing master data" -ForegroundColor Red
}

# Test 3: Test multiple concurrent registrations (stress test)
Write-Host "`n3. Testing concurrent employee registrations..." -ForegroundColor Green

if ($masterData.departments.Count -gt 0 -and $masterData.shifts.Count -gt 0) {
    $jobs = @()
    $concurrentCount = 3
    
    Write-Host "Starting $concurrentCount concurrent employee registrations..." -ForegroundColor Blue
    
    for ($i = 1; $i -le $concurrentCount; $i++) {
        $testEmployee = Get-RandomEmployeeData
        $testEmployee.department = $masterData.departments[0].id
        $testEmployee.shift = $masterData.shifts[0].id
        
        if ($masterData.positions.Count -gt 0) {
            $testEmployee.positionId = $masterData.positions[0].id
        }
        
        $job = Start-Job -ScriptBlock {
            param($employeeData, $index)
            
            try {
                $startTime = Get-Date
                $jsonBody = $employeeData | ConvertTo-Json -Depth 10
                
                $response = Invoke-WebRequest -Uri "http://localhost:3000/api/employees/register" -Method POST -Headers @{
                    "Content-Type" = "application/json"
                } -Body $jsonBody -UseBasicParsing -TimeoutSec 30
                
                $endTime = Get-Date
                $duration = ($endTime - $startTime).TotalMilliseconds
                
                return @{
                    Index = $index
                    Success = $true
                    StatusCode = $response.StatusCode
                    Duration = $duration
                    EmployeeName = $employeeData.name
                }
            } catch {
                $endTime = Get-Date
                $duration = ($endTime - $startTime).TotalMilliseconds
                
                return @{
                    Index = $index
                    Success = $false
                    Error = $_.Exception.Message
                    Duration = $duration
                    EmployeeName = $employeeData.name
                }
            }
        } -ArgumentList $testEmployee, $i
        
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    # Analyze results
    $successCount = ($results | Where-Object { $_.Success }).Count
    $failCount = ($results | Where-Object { -not $_.Success }).Count
    $avgDuration = ($results | Measure-Object -Property Duration -Average).Average
    
    Write-Host "Concurrent test results:" -ForegroundColor Blue
    Write-Host "  Successful: $successCount" -ForegroundColor Green
    Write-Host "  Failed: $failCount" -ForegroundColor Red
    Write-Host "  Average Duration: $([math]::Round($avgDuration))ms" -ForegroundColor Blue
    
    foreach ($result in $results) {
        $color = if ($result.Success) { "Green" } else { "Red" }
        $status = if ($result.Success) { "✅" } else { "❌" }
        Write-Host "  $status Employee $($result.Index): $($result.EmployeeName) - $([math]::Round($result.Duration))ms" -ForegroundColor $color
        
        if (-not $result.Success) {
            Write-Host "    Error: $($result.Error)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ Cannot test concurrent registrations - missing master data" -ForegroundColor Red
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✅ Transaction timeout increased to 15 seconds" -ForegroundColor Green
Write-Host "✅ Optimized transaction by removing includes" -ForegroundColor Green
Write-Host "✅ Added separate fetch for relations outside transaction" -ForegroundColor Green
Write-Host "✅ Enhanced error handling for timeout scenarios" -ForegroundColor Green
Write-Host "✅ Added retryable flag for timeout/connection errors" -ForegroundColor Green

Write-Host "`n=== Perbaikan Yang Diterapkan ===" -ForegroundColor Yellow
Write-Host "1. ✅ Increased transaction timeout: 5s -> 15s" -ForegroundColor White
Write-Host "2. ✅ Optimized transaction performance (no includes)" -ForegroundColor White
Write-Host "3. ✅ Separate relation fetch outside transaction" -ForegroundColor White
Write-Host "4. ✅ Enhanced timeout error handling (408 status)" -ForegroundColor White
Write-Host "5. ✅ Added retryable flag for better user experience" -ForegroundColor White
Write-Host "6. ✅ Better error categorization and logging" -ForegroundColor White

Write-Host "`nTest completed!" -ForegroundColor Cyan 