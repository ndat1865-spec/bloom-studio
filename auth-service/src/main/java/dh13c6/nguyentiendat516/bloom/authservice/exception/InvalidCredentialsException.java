package dh13c6.nguyentiendat516.bloom.authservice.exception;

/**
 * Sai username hoac password. Tach rieng khoi NotFoundException de KHONG lo ra ngoai
 * la tai khoan co ton tai hay khong - neu bao "khong tim thay username" thi ke tan cong
 * biet duoc username nao co that, roi chi viet do mat khau.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
