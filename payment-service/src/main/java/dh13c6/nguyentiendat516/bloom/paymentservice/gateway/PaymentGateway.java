package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;

import java.util.Map;

/**
 * Mot cong thanh toan. Moi cong mot cach ky, mot bo tham so rieng, nhung PaymentService
 * chi lam viec qua giao dien nay nen them cong thu tu khong phai sua nghiep vu.
 */
public interface PaymentGateway {

    PaymentProvider provider();

    /** Da khai du khoa chua. Chua khai thi an cong nay khoi trang thanh toan. */
    boolean isConfigured();

    /** Tao link thanh toan de dua trinh duyet cua khach sang. */
    String createPayUrl(Payment payment, String orderInfo, String clientIp);

    /** Bo tham so tren URL tro ve co phai cua cong nay khong. */
    boolean recognizes(Map<String, String> params);

    /**
     * Kiem tra chu ky va doc ket qua tu bo tham so cong gui kem khi dua khach quay ve
     * (cung la bo tham so cua IPN voi VNPay va MoMo). Chu ky sai -> InvalidSignatureException.
     */
    GatewayResult verifyReturn(Map<String, String> params);

    /** Hoi thang cong thanh toan trang thai giao dich - dung khi IPN khong toi duoc. */
    GatewayResult query(Payment payment);

    /**
     * Hoan TOAN BO so tien cua mot giao dich da thanh cong. refundRef la ma yeu cau hoan tien
     * phia cua hang, da luu vao Payment truoc khi goi (goi lai cung ma thi cong bao trung).
     */
    RefundResult refund(Payment payment, String reason);

    /** Hoi trang thai mot yeu cau hoan tien dang xu ly. Cong nao hoan xong ngay thi khong can. */
    default RefundResult queryRefund(Payment payment) {
        return new RefundResult(RefundResult.Outcome.PENDING, null, "Cổng này không hỗ trợ truy vấn hoàn tiền");
    }
}
