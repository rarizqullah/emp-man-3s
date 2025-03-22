// Deklarasi global untuk properti kustom
interface Window {
  /**
   * Flag khusus untuk mencegah redirect otomatis ke halaman login
   * saat terjadi error otentikasi (401/403)
   */
  __FORCE_STAY_ON_PAGE__?: boolean;
} 