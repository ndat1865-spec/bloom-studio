package dh13c6.nguyentiendat516.bloom.productservice.exception;

/** Tai nguyen khong ton tai -> HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
