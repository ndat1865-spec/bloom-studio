package dh13c6.nguyentiendat516.bloom.productservice.exception;

/** Du lieu gui len khong hop le -> HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
