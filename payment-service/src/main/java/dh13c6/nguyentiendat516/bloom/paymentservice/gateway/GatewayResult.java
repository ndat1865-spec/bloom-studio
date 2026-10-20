package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

/**
 * Ket qua mot giao dich do cong thanh toan bao ve, DA kiem tra chu ky.
 *
 * @param txnRef        ma giao dich phia cua hang (de tim lai Payment)
 * @param amount        so tien VND cong bao da tru - null neu cong khong tra ve
 * @param providerTxnId ma giao dich phia cong
 * @param message       mo ta ket qua de doc
 */
public record GatewayResult(String txnRef, Outcome outcome, Long amount, String providerTxnId, String message) {

    public enum Outcome {
        SUCCESS,
        FAILED,
        /** Cong chua co ket qua cuoi cung - de nguyen, doi soat lai sau. */
        PENDING
    }
}
