# Test Implementation Guide

## Testing Script untuk Role Management

Berikut adalah panduan untuk menguji implementasi sistem role dan permission management:

### 1. Test Database Setup

```sql
-- Pastikan tabel User memiliki kolom role
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'role';

-- Test data user dengan berbagai role
INSERT INTO "User" (id, email, name, role) VALUES 
('admin-1', 'admin@company.com', 'Admin User', 'ADMIN'),
('manager-1', 'manager@company.com', 'Manager User', 'MANAGER'),
('employee-1', 'employee@company.com', 'Employee User', 'EMPLOYEE');
```

### 2. Test API Endpoints

```bash
# Test dengan curl (ganti TOKEN dengan JWT yang valid)

# 1. Test endpoint yang memerlukan admin role
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-user-role: ADMIN"

# 2. Test dengan role yang tidak diizinkan (should return 403)
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-user-role: EMPLOYEE"

# 3. Test update role user
curl -X PUT "http://localhost:3000/api/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-user-role: ADMIN" \
  -d '{"userId": "employee-1", "role": "MANAGER"}'
```

### 3. Test Frontend Components

```javascript
// Test di browser console setelah login
console.log('User role:', localStorage.getItem('userRole'));

// Test useUserRole hook
// Di component, tambahkan:
const { role, isAdmin, isManager, canManageEmployees } = useUserRole();
console.log({
  role,
  isAdmin: isAdmin(),
  isManager: isManager(),
  canManageEmployees: canManageEmployees()
});
```

### 4. Test Cases Checklist

- [ ] **Admin user** dapat:
  - [ ] Login berhasil
  - [ ] Melihat semua menu di sidebar
  - [ ] Mengakses halaman konfigurasi
  - [ ] Mengelola role user lain
  - [ ] Melihat data semua karyawan

- [ ] **Manager user** dapat:
  - [ ] Login berhasil
  - [ ] Melihat menu dashboard, karyawan, absensi, penggajian
  - [ ] Tidak dapat mengakses menu konfigurasi
  - [ ] Melihat data karyawan di departemennya
  - [ ] Approve izin/cuti karyawan

- [ ] **Employee user** dapat:
  - [ ] Login berhasil
  - [ ] Hanya melihat menu dashboard, absensi, dan izin/cuti
  - [ ] Tidak dapat mengakses menu karyawan atau konfigurasi
  - [ ] Hanya melihat data dirinya sendiri
  - [ ] Mengajukan izin/cuti

### 5. Security Test Cases

- [ ] **Unauthorized Access**:
  - [ ] URL langsung ke `/configuration` sebagai employee → redirect ke dashboard
  - [ ] API call tanpa token → return 401
  - [ ] API call dengan token expired → return 401

- [ ] **Forbidden Access**:
  - [ ] Employee akses API admin → return 403
  - [ ] Manager akses endpoint admin-only → return 403
  - [ ] Employee coba ubah role user lain → return 403

### 6. Manual Testing Flow

1. **Setup Test Users**:
   ```
   Admin: admin@test.com / password123
   Manager: manager@test.com / password123  
   Employee: employee@test.com / password123
   ```

2. **Test Admin Flow**:
   - Login sebagai admin
   - Cek semua menu muncul
   - Buka halaman user management
   - Ubah role employee menjadi manager
   - Logout

3. **Test Manager Flow**:
   - Login sebagai manager (yang tadi diubah)
   - Cek menu yang muncul (tidak ada menu konfigurasi)
   - Coba akses `/configuration/users` langsung → should redirect
   - Test approve izin karyawan

4. **Test Employee Flow**:
   - Login sebagai employee
   - Cek hanya menu dashboard, absensi, izin muncul
   - Coba akses URL admin langsung → should redirect
   - Test submit izin/cuti

### 7. Browser Network Tab Tests

Buka Developer Tools → Network tab dan cek:

- [ ] Request ke `/api/users/me` return role yang benar
- [ ] Request ke protected endpoint dengan role tidak sesuai return 403
- [ ] Header `x-user-role` dikirim dengan benar di setiap API call

### 8. Common Issues & Solutions

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Menu tidak muncul | Role tidak ter-set | Cek useUserRole hook & database |
| Infinite redirect | Fallback URL salah | Cek RoleProtection fallbackUrl |
| 401 di API | Token tidak valid | Cek JWT implementation |
| 403 di API | Role tidak sesuai | Cek requireRole middleware |

### 9. Performance Tests

```javascript
// Test di browser console untuk cek performa
console.time('roleCheck');
const hasAccess = canAccessUrl('/employee', 'ADMIN');
console.timeEnd('roleCheck'); // Should be < 1ms

console.time('menuGeneration');
const menus = getAccessibleMenus('MANAGER');
console.timeEnd('menuGeneration'); // Should be < 5ms
```

### 10. Automated Test Example

```javascript
// Jest test example
describe('Role Management System', () => {
  test('Admin can access all menus', () => {
    const menus = getAccessibleMenus('ADMIN');
    expect(menus.length).toBeGreaterThan(0);
    expect(menus.some(section => 
      section.items.some(item => item.url === '/configuration/users')
    )).toBe(true);
  });

  test('Employee cannot access admin endpoints', async () => {
    const response = await fetch('/api/admin/users', {
      headers: { 'x-user-role': 'EMPLOYEE' }
    });
    expect(response.status).toBe(403);
  });
});
```

Jalankan semua test ini untuk memastikan sistem role dan permission berjalan dengan baik tanpa bug!
