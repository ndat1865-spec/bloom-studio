package dh13c6.nguyentiendat516.bloom.productservice.exception;

/** Service khac khong phan hoi -> 503, phan biet voi loi do du lieu cua client. */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }
}
