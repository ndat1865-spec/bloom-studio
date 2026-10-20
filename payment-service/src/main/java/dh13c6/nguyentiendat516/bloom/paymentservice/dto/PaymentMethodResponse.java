package dh13c6.nguyentiendat516.bloom.paymentservice.dto;

/** Mot lua chon o trang thanh toan. COD luon co; cong truc tuyen chi hien khi da khai khoa. */
public record PaymentMethodResponse(String code, String label, String description, boolean online) {
}
