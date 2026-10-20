package dh13c6.nguyentiendat516.bloom.paymentservice.exception;

/**
 * Chu ky tu cong thanh toan khong khop. Nghia la tham so da bi sua tren duong di (vi du
 * khach tu doi vnp_ResponseCode=00 tren thanh dia chi) - tuyet doi khong ghi nhan.
 */
public class InvalidSignatureException extends RuntimeException {
    public InvalidSignatureException(String message) {
        super(message);
    }
}
