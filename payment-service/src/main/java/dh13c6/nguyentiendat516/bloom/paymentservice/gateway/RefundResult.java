package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

/**
 * Ket qua mot yeu cau hoan tien.
 *
 * @param refundTxnId ma giao dich hoan tien phia cong (null neu cong khong tra)
 */
public record RefundResult(Outcome outcome, String refundTxnId, String message) {

    public enum Outcome {
        /** Cong xac nhan da hoan. */
        SUCCESS,
        /** Cong tu choi - tien van o cua hang, co the thu lai. */
        FAILED,
        /** Cong dang xu ly (ZaloPay) - hoi lai sau. */
        PENDING
    }
}
