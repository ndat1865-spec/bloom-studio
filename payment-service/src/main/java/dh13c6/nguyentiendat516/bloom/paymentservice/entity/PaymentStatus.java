package dh13c6.nguyentiendat516.bloom.paymentservice.entity;

/** Trang thai mot giao dich (mot lan bam "Thanh toan"). Mot don co the co nhieu giao dich. */
public enum PaymentStatus {
    /** Da tao link, khach chua tra hoac cong chua bao ket qua. */
    PENDING,
    /** Cong thanh toan xac nhan da tru tien. */
    SUCCESS,
    /** Khach huy, the bi tu choi, het han link... */
    FAILED,
    /** Da gui yeu cau hoan tien, cong dang xu ly (ZaloPay tra "dang xu ly"). */
    REFUNDING,
    /** Cong xac nhan da hoan tien ve cho khach. */
    REFUNDED
}
