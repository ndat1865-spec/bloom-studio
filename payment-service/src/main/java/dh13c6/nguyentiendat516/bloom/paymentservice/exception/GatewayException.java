package dh13c6.nguyentiendat516.bloom.paymentservice.exception;

/** Cong thanh toan tu choi yeu cau hoac khong phan hoi -> 502. */
public class GatewayException extends RuntimeException {
    public GatewayException(String message) {
        super(message);
    }
}
