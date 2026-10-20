package dh13c6.nguyentiendat516.bloom.orderservice.shipping;

/**
 * GHN tu choi yeu cau (dia chi khong ho tro, so dien thoai sai, van don da lay hang...).
 * Khac ServiceUnavailableException: GHN van song, chi la yeu cau khong hop le -> 409.
 */
public class GhnException extends RuntimeException {
    public GhnException(String message) {
        super(message);
    }
}
