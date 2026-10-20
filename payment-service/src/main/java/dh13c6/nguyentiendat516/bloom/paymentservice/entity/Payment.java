package dh13c6.nguyentiendat516.bloom.paymentservice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Mot giao dich thanh toan truc tuyen.
 *
 * Moi lan khach bam "Thanh toan" la mot dong moi: lan dau huy giua chung roi thanh toan
 * lai bang cong khac thi don co hai dong, dong dau FAILED/PENDING, dong sau SUCCESS.
 *
 * Khong co khoa ngoai toi bang orders: bang do nam o CSDL cua order-service. Chi luu
 * orderId dang so va chup lai ma don de doi soat.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_order", columnList = "order_id"),
        @Index(name = "idx_payments_status", columnList = "status")
})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_code", nullable = false, length = 32)
    private String orderCode;

    /** Chu don tai thoi diem tao giao dich - lay tu JWT, khong nhan tu client. */
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private PaymentProvider provider;

    /** So tien VND (so nguyen). Lay tu order-service, KHONG bao gio lay tu client. */
    @Column(name = "amount", nullable = false)
    private Long amount;

    /**
     * Ma giao dich phia cua hang gui sang cong thanh toan (vnp_TxnRef / orderId cua MoMo /
     * app_trans_id cua ZaloPay). Duy nhat - dung de tim lai giao dich khi cong bao ket qua.
     */
    @Column(name = "txn_ref", nullable = false, unique = true, length = 40)
    private String txnRef;

    /** Ma giao dich phia cong thanh toan (vnp_TransactionNo / transId / zp_trans_id). */
    @Column(name = "provider_txn_id", length = 64)
    private String providerTxnId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    /** Ghi chu ket qua de doc: ma loi cua cong, ly do tu choi... */
    @Column(name = "message", length = 255)
    private String message;

    @Column(name = "pay_url", length = 1000)
    private String payUrl;

    /**
     * Da bao duoc cho order-service chua. Tach rieng voi status: cong bao SUCCESS nhung luc
     * do order-service dang tat thi giao dich van la SUCCESS, chi la don chua biet - bo doi
     * soat se bao lai sau (xem PaymentReconciler).
     */
    @Column(name = "order_notified", nullable = false)
    private boolean orderNotified = false;

    /** Tien da tru nhung don khong nhan (da huy / da tra bang giao dich khac) -> phai hoan tay. */
    @Column(name = "refund_required", nullable = false)
    private boolean refundRequired = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    /**
     * Ma yeu cau hoan tien phia cua hang (MoMo can orderId moi, ZaloPay can m_refund_id).
     * Giu lai de truy van trang thai hoan tien va de khong gui trung.
     */
    @Column(name = "refund_ref", length = 60)
    private String refundRef;

    /** Ma giao dich hoan tien phia cong thanh toan. */
    @Column(name = "refund_txn_id", length = 64)
    private String refundTxnId;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    public Payment() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public PaymentProvider getProvider() {
        return provider;
    }

    public void setProvider(PaymentProvider provider) {
        this.provider = provider;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getTxnRef() {
        return txnRef;
    }

    public void setTxnRef(String txnRef) {
        this.txnRef = txnRef;
    }

    public String getProviderTxnId() {
        return providerTxnId;
    }

    public void setProviderTxnId(String providerTxnId) {
        this.providerTxnId = providerTxnId;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPayUrl() {
        return payUrl;
    }

    public void setPayUrl(String payUrl) {
        this.payUrl = payUrl;
    }

    public boolean isOrderNotified() {
        return orderNotified;
    }

    public void setOrderNotified(boolean orderNotified) {
        this.orderNotified = orderNotified;
    }

    public boolean isRefundRequired() {
        return refundRequired;
    }

    public void setRefundRequired(boolean refundRequired) {
        this.refundRequired = refundRequired;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public String getRefundRef() {
        return refundRef;
    }

    public void setRefundRef(String refundRef) {
        this.refundRef = refundRef;
    }

    public String getRefundTxnId() {
        return refundTxnId;
    }

    public void setRefundTxnId(String refundTxnId) {
        this.refundTxnId = refundTxnId;
    }

    public Instant getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(Instant refundedAt) {
        this.refundedAt = refundedAt;
    }
}
