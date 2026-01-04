export function getFirebaseAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Tidak ada pengguna yang ditemukan dengan email ini.';
    case 'auth/wrong-password':
      return 'Kata sandi salah. Silakan coba lagi.';
    case 'auth/email-already-in-use':
      return 'Alamat email ini sudah digunakan oleh akun lain.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/network-request-failed':
      return 'Gagal terhubung ke jaringan. Periksa koneksi internet Anda.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
    default:
      return 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
  }
}
