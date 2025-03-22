/**
 * Client-side authentication utilities
 * Berfungsi sebagai jembatan antara autentikasi client-side dengan localStorage
 * dan NextAuth di server-side
 */

/**
 * Fungsi untuk memeriksa apakah token sudah expired
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = JSON.parse(atob(base64));
    const expirationTime = jsonPayload.exp * 1000;
    const isExpired = Date.now() >= expirationTime;
    
    console.log(`[client-auth] Token expiration check: ${isExpired ? 'EXPIRED' : 'VALID'}`, {
      now: new Date(Date.now()).toISOString(),
      expires: new Date(expirationTime).toISOString()
    });
    
    return isExpired;
  } catch (e) {
    console.error('[client-auth] Error parsing token:', e);
    return true;
  }
}

/**
 * Fungsi untuk memicu event ketika sesi kedaluwarsa
 */
function triggerSessionExpiredEvent(url: string) {
  // Kirim event khusus untuk memberitahukan bahwa sesi telah kedaluwarsa
  const preventRedirect = 
    url.includes('/permission') || 
    url.includes('/leave') || 
    (typeof window !== 'undefined' && window.__FORCE_STAY_ON_PAGE__ === true);
  
  console.log(`[client-auth] Triggering sessionExpired event, preventRedirect=${preventRedirect}`, {
    url, 
    forceStayFlag: typeof window !== 'undefined' ? window.__FORCE_STAY_ON_PAGE__ : undefined
  });
  
  const event = new CustomEvent('auth:sessionExpired', { 
    detail: { 
      url,
      preventRedirect,
      timestamp: new Date().toISOString() 
    } 
  });
  
  window.dispatchEvent(event);
  return preventRedirect;
}

/**
 * Fungsi untuk mengarahkan ke halaman login
 */
export function redirectToLogin(message?: string) {
  if (typeof window === 'undefined') return false;
  
  // Periksa apakah kita harus mencegah redirect
  const currentUrl = window.location.href;
  const isPermissionOrLeavePage = 
    currentUrl.includes('/permission') || 
    currentUrl.includes('/leave') || 
    window.__FORCE_STAY_ON_PAGE__ === true;
  
  console.log(`[client-auth] redirectToLogin called`, { 
    message, 
    url: currentUrl,
    isPermissionOrLeavePage,
    forceStayFlag: window.__FORCE_STAY_ON_PAGE__
  });
  
  if (isPermissionOrLeavePage) {
    console.log('[client-auth] Preventing redirect on permission/leave page');
    // Hanya trigger event tapi jangan redirect
    triggerSessionExpiredEvent(currentUrl);
    return false;
  }
  
  // Hapus token
  localStorage.removeItem('token');
  
  // Redirect ke login dengan pesan
  const redirectUrl = message 
    ? `/login?message=${encodeURIComponent(message)}` 
    : '/login';
    
  window.location.href = redirectUrl;
  return true;
}

/**
 * Menambahkan token dari localStorage ke header fetch request
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  noRedirect: boolean = false
): Promise<Response> {
  try {
    console.log(`[client-auth] fetchWithAuth called`, { url, noRedirect });
    
    // Periksa apakah halaman saat ini adalah halaman izin atau cuti
    const isPermissionOrLeavePage =
      typeof window !== 'undefined' && (
        window.location.pathname.includes('/permission') ||
        window.location.pathname.includes('/leave') ||
        window.__FORCE_STAY_ON_PAGE__ === true
      );
    
    // Jika URL sendiri terkait dengan izin atau cuti, set noRedirect ke true
    if (!noRedirect && (url.includes('/permission') || url.includes('/leave'))) {
      console.log(`[client-auth] Auto-setting noRedirect=true for permission/leave URL: ${url}`);
      noRedirect = true;
    }
    
    // Jika kita berada di halaman izin/cuti, set noRedirect ke true
    if (!noRedirect && isPermissionOrLeavePage) {
      console.log(`[client-auth] Auto-setting noRedirect=true because we're on a permission/leave page`);
      noRedirect = true;
    }
    
    // Buat deep clone dari options untuk menghindari mutasi
    const optionsWithAuth = JSON.parse(JSON.stringify(options || {}));
    optionsWithAuth.headers = optionsWithAuth.headers || {};
    
    // Tambahkan parameter noRedirect ke URL jika diperlukan
    let finalUrl = url;
    if (noRedirect) {
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}noRedirect=true`;
      console.log(`[client-auth] Added noRedirect parameter to URL: ${finalUrl}`);
    }
    
    // Coba dapatkan token dari localStorage
    let token = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token') || '';
      
      if (token) {
        optionsWithAuth.headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('[client-auth] No token found in localStorage');
      }
    }
    
    // Lakukan request
    console.log(`[client-auth] Sending request to: ${finalUrl}`);
    const response = await fetch(finalUrl, optionsWithAuth);
    
    // Log status respons
    console.log(`[client-auth] Response status: ${response.status} ${response.statusText}`);
    
    // Handle berbagai kasus error autentikasi
    if (response.status === 401 || response.status === 403) {
      console.warn(`[client-auth] Authentication error: ${response.status}`);
      
      // Periksa apakah token expired
      if (token && isTokenExpired(token)) {
        console.warn('[client-auth] Token has expired');
      }
      
      // Jika noRedirect=true, handle error secara berbeda
      if (noRedirect || isPermissionOrLeavePage) {
        console.log('[client-auth] Not redirecting due to noRedirect flag or permission/leave page');
        // Trigger event sesi expired tetapi jangan redirect
        triggerSessionExpiredEvent(window.location.href);
        
        // Tetap kembalikan respons untuk dihandle oleh pemanggil
        return response;
      } 
      
      // Untuk kasus lain, redirect ke login
      redirectToLogin('Sesi Anda telah berakhir, silakan login kembali');
    }
    
    return response;
  } catch (error) {
    console.error('[client-auth] Error in fetchWithAuth:', error);
    if (!noRedirect && typeof window !== 'undefined' && window.__FORCE_STAY_ON_PAGE__ !== true) {
      redirectToLogin('Terjadi kesalahan pada koneksi');
    }
    throw error;
  }
}

/**
 * Helper untuk mendapatkan data user dari localStorage
 */
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
};

/**
 * Memastikan token disimpan di cookie untuk middleware
 */
export const ensureTokenCookie = (token: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Cek apakah cookie token sudah ada
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    
    // Jika cookie token tidak ada atau valuenya berbeda, set cookie baru
    if (!tokenCookie || !tokenCookie.includes(token)) {
      // Tetapkan cookie dengan opsi yang lebih lengkap
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 hari
      
      document.cookie = `token=${token}; Path=/; Expires=${expires}${secure}; SameSite=Lax`;
      console.log('[TokenSync] Token cookie diperbarui dengan pengaturan yang lebih baik');
    }
  } catch (error) {
    console.error('[TokenSync] Error saat mengatur cookie:', error);
  }
}; 