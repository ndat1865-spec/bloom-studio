package dh13c6.nguyentiendat516.bloom.paymentservice.exception;

/** order-service khong phan hoi -> 503. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
