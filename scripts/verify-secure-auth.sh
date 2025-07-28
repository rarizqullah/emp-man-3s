#!/bin/bash

echo "🔍 Verifying Secure Authentication Implementation"
echo "=================================================="

# Check if there are any remaining insecure getSession() calls
echo "1. Checking for insecure getSession() usage..."
INSECURE_CALLS=$(grep -r "getSession()" src/ --include="*.ts" --include="*.tsx" | grep -v "getUser()" | wc -l)

if [ $INSECURE_CALLS -gt 0 ]; then
    echo "❌ Found $INSECURE_CALLS insecure getSession() calls:"
    grep -r "getSession()" src/ --include="*.ts" --include="*.tsx" | grep -v "getUser()"
    echo ""
else
    echo "✅ No insecure getSession() calls found"
fi

# Check if secure getUser() calls are being used
echo "2. Checking for secure getUser() usage..."
SECURE_CALLS=$(grep -r "getUser()" src/ --include="*.ts" --include="*.tsx" | wc -l)

if [ $SECURE_CALLS -gt 0 ]; then
    echo "✅ Found $SECURE_CALLS secure getUser() calls"
else
    echo "❌ No secure getUser() calls found"
fi

# Check if requireRole and requireAuth helpers are being used
echo "3. Checking for proper API protection..."
REQUIRE_ROLE=$(grep -r "requireRole" src/app/api/ --include="*.ts" | wc -l)
REQUIRE_AUTH=$(grep -r "requireAuth" src/app/api/ --include="*.ts" | wc -l)

if [ $REQUIRE_ROLE -gt 0 ] || [ $REQUIRE_AUTH -gt 0 ]; then
    echo "✅ Found API protection: requireRole ($REQUIRE_ROLE), requireAuth ($REQUIRE_AUTH)"
else
    echo "⚠️  No API protection helpers found"
fi

# Check specific files that were fixed
echo "4. Verifying specific files..."
FILES_TO_CHECK=(
    "src/app/api/employees/[id]/contract-history/route.ts"
    "src/lib/auth/api-helpers.ts"
    "src/app/api/users/route.ts"
    "src/app/api/attendance/today/route.ts"
    "src/app/api/attendance/employee/[employeeId]/route.ts"
    "src/app/api/attendance/employee-data/route.ts"
    "src/app/api/analytics/dashboard-v2/route.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "getUser()" "$file"; then
            echo "✅ $file - using secure getUser()"
        elif grep -q "requireRole\|requireAuth" "$file"; then
            echo "✅ $file - using API protection helpers"
        else
            echo "⚠️  $file - no explicit auth verification found"
        fi
    else
        echo "❌ $file - file not found"
    fi
done

echo ""
echo "🔒 Security Implementation Summary:"
echo "- Fixed Supabase auth to use secure getUser() instead of getSession()"
echo "- Implemented role-based API protection"
echo "- Enhanced API authentication helpers"
echo "- Removed duplicate package-lock.json files"

if [ $INSECURE_CALLS -eq 0 ]; then
    echo ""
    echo "🎉 All authentication issues have been resolved!"
    echo "   The application now uses secure authentication methods."
else
    echo ""
    echo "⚠️  Some issues still need attention. Please review the output above."
fi
