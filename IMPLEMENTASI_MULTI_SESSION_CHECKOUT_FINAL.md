# Implementasi Multi-Session Checkout Logic dengan Label "Terlambat Checkout"

## Overview
Implementasi sistem checkout yang menangani multiple session dengan grace period independen untuk setiap sesi kerja, termasuk fitur label "Terlambat Checkout" untuk case 4.

## Requirement Final
Berdasarkan skenario B dengan clarifikasi lengkap:
- **Main Work**: 07:00 - 17:00
- **Overtime**: 17:00 - 19:00  
- **Grace Period Main Work**: 17:00 - 17:15 (independen)
- **Grace Period Overtime**: 19:00 - 19:15 (independen)

### Test Cases Lengkap
1. **Case 1 (16:30)**: Checkout dalam main work aktif → waktu aktual (16:30) ✅
2. **Case 2 (17:05)**: Checkout dalam grace period main work → waktu akhir main work (17:00) ✅  
3. **Case 3 (19:05)**: Checkout dalam grace period overtime → waktu akhir overtime (19:00) ✅
4. **Case 4 (19:20)**: Checkout setelah grace period dengan override → waktu aktual (19:20) + **label "Terlambat Checkout"** ✅

## Implementasi

### 1. SessionCheckoutManager
**File**: `src/lib/utils/session-checkout-manager.ts`

#### Fitur Utama:
- **Multi-session detection** (Main Work, Regular Overtime, Weekly Overtime)
- **Independent grace period** untuk setiap sesi (15 menit)
- **Intelligent checkout decision** berdasarkan session status
- **Late checkout detection** dengan label "Terlambat Checkout"
- **Comprehensive debug info** untuk troubleshooting

#### Interface Baru:
```typescript
interface CheckoutDecision {
  checkoutTime: Date;
  originalTime: Date;
  sessionType: string;
  isGracePeriod: boolean;
  isActiveSession: boolean;
  isLateCheckout: boolean; // NEW: Flag untuk checkout terlambat
  lateCheckoutLabel: string | null; // NEW: Label untuk checkout terlambat
  reason: string;
  canCheckout: boolean;
  useActualTime: boolean;
}
```

### 2. Enhanced Check-out API
**File**: `src/app/api/attendance/check-out/route.ts`

Case 4 dengan label "Terlambat Checkout":
```json
{
  "success": true,
  "message": "Check-out berhasil untuk John Doe (Manual Override) - Terlambat Checkout",
  "data": {
    "multiSessionInfo": {
      "checkoutDecision": {
        "isLateCheckout": true,
        "lateCheckoutLabel": "Terlambat Checkout",
        "reason": "Manual override checkout setelah grace period - Terlambat Checkout"
      }
    }
  }
}
```

### 3. Test Script
**File**: `test-multi-session-checkout.ps1`

## Files Implemented
✅ `src/lib/utils/session-checkout-manager.ts` - Core logic
✅ `src/app/api/attendance/check-out/route.ts` - Enhanced API  
✅ `src/app/api/attendance/auto-cutoff-job/route.ts` - Enhanced auto-cutoff
✅ `test-multi-session-checkout.ps1` - Testing script
✅ `IMPLEMENTASI_MULTI_SESSION_CHECKOUT_FINAL.md` - Documentation

## Key Features
- ✅ Multi-session checkout logic dengan grace period independen
- ✅ Label "Terlambat Checkout" untuk case 4 (checkout setelah grace period)
- ✅ Enhanced API response dengan multiSessionInfo lengkap
- ✅ Automated testing script dengan validation lengkap
- ✅ Backward compatibility - no breaking changes
- ✅ Performance optimized dan production ready