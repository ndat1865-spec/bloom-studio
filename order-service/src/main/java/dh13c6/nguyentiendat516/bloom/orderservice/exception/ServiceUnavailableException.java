package dh13c6.nguyentiendat516.bloom.orderservice.exception;

/** Dich vu ben ngoai (GHN) khong phan hoi hoac chua duoc cau hinh -> 503. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
