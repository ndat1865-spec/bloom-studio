package dh13c6.nguyentiendat516.bloom.chatservice.exception;

/** Tai nguyen khong ton tai -> HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
