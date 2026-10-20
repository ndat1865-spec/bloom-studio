package dh13c6.nguyentiendat516.bloom.productservice.exception;

/** Xung dot du lieu (username trung, xoa danh muc con san pham) -> HTTP 409. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
