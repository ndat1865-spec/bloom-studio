package dh13c6.nguyentiendat516.bloom.paymentservice.service;

import dh13c6.nguyentiendat516.bloom.paymentservice.client.OrderClient;
import dh13c6.nguyentiendat516.bloom.paymentservice.client.OrderSnapshot;
import dh13c6.nguyentiendat516.bloom.paymentservice.dto.PaymentMethodResponse;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentStatus;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.GatewayException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.ServiceUnavailableException;
import dh13c6.nguyentiendat516.bloom.paymentservice.gateway.GatewayResult;
import dh13c6.nguyentiendat516.bloom.paymentservice.gateway.PaymentGateway;
import dh13c6.nguyentiendat516.bloom.paymentservice.gateway.RefundResult;
import dh13c6.nguyentiendat516.bloom.paymentservice.gateway.ZalopayGateway;
import dh13c6.nguyentiendat516.bloom.paymentservice.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Nghiep vu thanh toan.
 *
 * Ba nguyen tac:
 *  1. So tien luon lay tu order-service, khong bao gio tu client.
 *  2. Chi tin ket qua da kiem chu ky (return URL, IPN) hoac do chinh minh hoi cong (query).
 *  3. Moi buoc ghi nhan deu idempotent: return URL va IPN co the toi cung luc, hoac cung mot
 *     IPN toi nhieu lan - ket qua cuoi cung khong doi.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final OrderClient orderClient;
    private final Map<PaymentProvider, PaymentGateway> gateways = new EnumMap<>(PaymentProvider.class);

    public PaymentService(PaymentRepository paymentRepository, OrderClient orderClient,
                          List<PaymentGateway> gatewayBeans) {
        this.paymentRepository = paymentRepository;
        this.orderClient = orderClient;
        gatewayBeans.forEach(g -> gateways.put(g.provider(), g));
    }

    /** COD luon co; cong truc tuyen chi hien khi da khai du khoa trong bien moi truong. */
    public List<PaymentMethodResponse> methods() {
        List<PaymentMethodResponse> list = new ArrayList<>();
        list.add(new PaymentMethodResponse("COD", "Thanh toán khi nhận hàng",
                "Trả tiền mặt cho nhân viên giao hàng", false));
        for (PaymentProvider p : PaymentProvider.values()) {
            PaymentGateway g = gateways.get(p);
            if (g != null && g.isConfigured()) {
                list.add(new PaymentMethodResponse(p.name(), p.getLabel(), p.getDescription(), true));
            }
        }
        return list;
    }

    // ===================== TAO GIAO DICH =====================

    /**
     * Tao giao dich va link thanh toan cho mot don.
     *
     * userId lay tu JWT: chi chu don moi tra tien cho don cua minh (ADMIN cung khong).
     */
    public Payment create(Long userId, Long orderId, PaymentProvider provider, String clientIp) {
        PaymentGateway gateway = configuredGateway(provider);

        OrderSnapshot order = orderClient.getOrder(orderId);
        if (order.userId() == null || !order.userId().equals(userId)) {
            // 404 chu khong phai 403: khong xac nhan don cua nguoi khac co ton tai
            throw new NotFoundException("Không tìm thấy đơn hàng id = " + orderId);
        }
        if ("PAID".equals(order.paymentStatus())) {
            throw new ConflictException("Đơn " + order.code() + " đã được thanh toán");
        }
        if (!"PENDING".equals(order.status())) {
            throw new ConflictException("Đơn " + order.code() + " không còn chờ thanh toán");
        }
        long amount = Math.round(order.total() == null ? 0 : order.total());
        if (amount < 1000) {
            throw new BadRequestException("Số tiền thanh toán tối thiểu là 1.000đ");
        }

        Payment payment = new Payment();
        payment.setOrderId(order.id());
        payment.setOrderCode(order.code());
        payment.setUserId(userId);
        payment.setProvider(provider);
        payment.setAmount(amount);
        // Cat ve giay: VNPay ky ca thoi diem tao, luc truy van phai tai tao dung chuoi do
        payment.setCreatedAt(Instant.now().truncatedTo(ChronoUnit.SECONDS));
        payment.setTxnRef(newTxnRef(provider, payment.getCreatedAt()));
        payment.setStatus(PaymentStatus.PENDING);
        // Luu truoc de giu cho txnRef (cot unique) roi moi goi cong thanh toan
        payment = paymentRepository.save(payment);

        try {
            payment.setPayUrl(gateway.createPayUrl(payment, orderInfo(order), clientIp));
        } catch (GatewayException e) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setMessage(e.getMessage());
            touch(payment);
            throw e;
        }
        return touch(payment);
    }

    // ===================== NHAN KET QUA =====================

    /**
     * Frontend chuyen nguyen bo tham so tren URL tro ve (sau khi khach thanh toan) len day.
     * Tu nhan dang cong nao qua ten tham so, kiem chu ky roi moi ghi nhan.
     */
    public Payment confirmReturn(Map<String, String> params) {
        PaymentGateway gateway = gateways.values().stream()
                .filter(g -> g.isConfigured() && g.recognizes(params))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Không nhận ra kết quả thanh toán"));
        return apply(gateway.provider(), gateway.verifyReturn(params));
    }

    /** IPN cua VNPay / MoMo: cung bo tham so voi return URL. */
    public Payment confirmIpn(PaymentProvider provider, Map<String, String> params) {
        return apply(provider, configuredGateway(provider).verifyReturn(params));
    }

    /** Callback cua ZaloPay: dinh dang rieng {data, mac}. */
    public Payment confirmZalopayCallback(String data, String mac) {
        ZalopayGateway gateway = (ZalopayGateway) configuredGateway(PaymentProvider.ZALOPAY);
        return apply(PaymentProvider.ZALOPAY, gateway.verifyCallback(data, mac));
    }

    /**
     * Ghi nhan mot ket qua DA kiem chu ky.
     *
     * Chuyen trang thai:
     *   PENDING -> SUCCESS / FAILED
     *   FAILED  -> SUCCESS  (tien da tru la su that; vi du ZaloPay bao huy nhung sau do IPN bao thanh cong)
     *   SUCCESS -> giu nguyen
     */
    public synchronized Payment apply(PaymentProvider provider, GatewayResult result) {
        Payment payment = paymentRepository.findByTxnRef(result.txnRef())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giao dịch " + result.txnRef()));
        if (payment.getProvider() != provider) {
            throw new BadRequestException("Giao dịch " + result.txnRef() + " không thuộc cổng " + provider.getLabel());
        }
        // Chi so so tien khi cong bao DA TRU TIEN: giao dich dang cho, ZaloPay tra amount = 0
        if (result.outcome() == GatewayResult.Outcome.SUCCESS
                && result.amount() != null && !result.amount().equals(payment.getAmount())) {
            // Chu ky dung nhung so tien lech: khong the xay ra neu cong va cua hang deu dung.
            // Khong ghi nhan, de nguoi quan tri kiem tra.
            log.error("Lệch số tiền ở giao dịch {}: cổng báo {}, cửa hàng ghi {}",
                    payment.getTxnRef(), result.amount(), payment.getAmount());
            throw new BadRequestException("Số tiền thanh toán không khớp với đơn hàng");
        }

        switch (result.outcome()) {
            case SUCCESS -> {
                if (payment.getStatus() != PaymentStatus.SUCCESS) {
                    payment.setStatus(PaymentStatus.SUCCESS);
                    payment.setPaidAt(Instant.now());
                    payment.setMessage(result.message());
                    if (result.providerTxnId() != null && !result.providerTxnId().isEmpty()) {
                        payment.setProviderTxnId(result.providerTxnId());
                    }
                    touch(payment);
                }
                notifyOrder(payment);
            }
            case FAILED -> {
                if (payment.getStatus() == PaymentStatus.PENDING) {
                    payment.setStatus(PaymentStatus.FAILED);
                    payment.setMessage(result.message());
                    touch(payment);
                }
            }
            case PENDING -> {
                // Chua co ket qua cuoi cung - doi soat se hoi lai
            }
        }
        return payment;
    }

    /**
     * Hoi thang cong thanh toan (API truy van). Dung khi IPN khong toi duoc - vi du chay tren
     * may ca nhan, cong thanh toan khong goi vao localhost duoc.
     */
    public Payment refresh(Payment payment) {
        if (payment.getStatus() == PaymentStatus.PENDING) {
            PaymentGateway gateway = configuredGateway(payment.getProvider());
            payment = apply(payment.getProvider(), gateway.query(payment));
        } else if (payment.getStatus() == PaymentStatus.SUCCESS) {
            notifyOrder(payment);
        } else if (payment.getStatus() == PaymentStatus.REFUNDING) {
            applyRefund(payment, configuredGateway(payment.getProvider()).queryRefund(payment));
        } else if (payment.getStatus() == PaymentStatus.REFUNDED) {
            notifyRefund(payment);
        }
        return payment;
    }

    // ===================== HOAN TIEN =====================

    /**
     * ADMIN hoan toan bo tien cua mot giao dich da thanh cong, qua API cua chinh cong do.
     *
     * Chi cho hoan khi don KHONG con dung khoan tien nay: giao dich bi danh dau "can hoan"
     * (tra cho don da huy, hoac tra hai lan), hoac don dang "cho hoan tien". Hoan tien cua mot
     * don con hieu luc la mat tien ma van phai giao hoa.
     */
    public synchronized Payment refund(Long paymentId, String reason) {
        Payment payment = get(paymentId);
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new ConflictException("Giao dịch " + payment.getTxnRef() + " đã được hoàn tiền");
        }
        if (payment.getStatus() == PaymentStatus.REFUNDING) {
            throw new ConflictException("Cổng đang xử lý hoàn tiền giao dịch này, bấm kiểm tra lại sau");
        }
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new ConflictException("Chỉ hoàn được giao dịch đã thanh toán thành công");
        }
        if (!payment.isRefundRequired()) {
            OrderSnapshot order = orderClient.getOrder(payment.getOrderId());
            if (!"REFUND_PENDING".equals(order.paymentStatus())) {
                throw new ConflictException("Đơn " + order.code() + " vẫn đang dùng khoản tiền này. Huỷ đơn trước rồi mới hoàn tiền");
            }
        }

        PaymentGateway gateway = configuredGateway(payment.getProvider());
        // Ma yeu cau hoan tien luu TRUOC khi goi cong: lan goi hong giua chung van tra cuu duoc
        if (payment.getRefundRef() == null) {
            String unique = System.currentTimeMillis() + "" + ThreadLocalRandom.current().nextInt(100, 1000);
            payment.setRefundRef(payment.getProvider() == PaymentProvider.ZALOPAY
                    ? ((ZalopayGateway) gateway).newRefundId(unique)
                    : "RF" + unique);
            touch(payment);
        }

        RefundResult result = gateway.refund(payment, reason);
        if (result.outcome() == RefundResult.Outcome.FAILED) {
            // Tien van o cua hang. Bo ma cu de lan thu sau gui ma moi (cong tu choi ma trung).
            payment.setRefundRef(null);
            payment.setMessage("Hoàn tiền thất bại: " + result.message());
            touch(payment);
            throw new GatewayException(result.message());
        }
        return applyRefund(payment, result);
    }

    private Payment applyRefund(Payment payment, RefundResult result) {
        switch (result.outcome()) {
            case SUCCESS -> {
                payment.setStatus(PaymentStatus.REFUNDED);
                payment.setRefundedAt(Instant.now());
                payment.setRefundTxnId(result.refundTxnId() == null || result.refundTxnId().isEmpty()
                        ? null : result.refundTxnId());
                payment.setMessage(result.message());
                // Dung lai co orderNotified cho viec bao "da hoan" sang order-service
                payment.setOrderNotified(false);
                touch(payment);
                log.info("Đã hoàn {}đ cho giao dịch {}", payment.getAmount(), payment.getTxnRef());
                notifyRefund(payment);
            }
            case PENDING -> {
                payment.setStatus(PaymentStatus.REFUNDING);
                payment.setMessage(result.message());
                touch(payment);
            }
            case FAILED -> {
                // Chi xay ra khi hoi lai mot yeu cau dang xu ly: cong bao that bai -> tro ve SUCCESS
                payment.setStatus(PaymentStatus.SUCCESS);
                payment.setRefundRef(null);
                payment.setMessage("Hoàn tiền thất bại: " + result.message());
                touch(payment);
            }
        }
        return payment;
    }

    /** Bao order-service don da duoc hoan tien. Loi mang thi doi soat bao lai sau. */
    public void notifyRefund(Payment payment) {
        if (payment.getStatus() != PaymentStatus.REFUNDED || payment.isOrderNotified()) {
            return;
        }
        try {
            orderClient.markRefunded(payment.getOrderId(), payment.getTxnRef());
            payment.setOrderNotified(true);
            touch(payment);
        } catch (ServiceUnavailableException e) {
            log.warn("Chưa báo được order-service giao dịch {} đã hoàn tiền, sẽ thử lại", payment.getTxnRef());
        }
    }

    /** Het han ma cong van chua bao ket qua -> dong lai, de khach tao giao dich moi. */
    public void expire(Payment payment) {
        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setMessage("Hết thời gian thanh toán");
            touch(payment);
        }
    }

    /**
     * Bao order-service. Khong nem loi ra ngoai: tien da tru roi thi giao dich van la
     * SUCCESS; neu order-service tat thi doi soat bao lai sau.
     */
    public void notifyOrder(Payment payment) {
        if (payment.isOrderNotified()) {
            return;
        }
        try {
            orderClient.markPaid(payment.getOrderId(), payment.getProvider(), payment.getTxnRef(),
                    payment.getAmount());
            payment.setOrderNotified(true);
        } catch (ConflictException e) {
            // Don da huy (qua han) hoac da tra bang giao dich khac -> tien nay phai hoan lai
            payment.setOrderNotified(true);
            payment.setRefundRequired(true);
            payment.setMessage("Đã trừ tiền nhưng đơn không nhận: " + e.getMessage() + ". Cần hoàn tiền cho khách");
            log.warn("Giao dịch {} cần hoàn tiền: {}", payment.getTxnRef(), e.getMessage());
        } catch (ServiceUnavailableException e) {
            log.warn("Chưa báo được order-service cho giao dịch {}, sẽ thử lại", payment.getTxnRef());
            return;
        }
        touch(payment);
    }

    // ===================== DOC =====================

    public Payment get(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giao dịch id = " + id));
    }

    public List<Payment> listByOrder(Long orderId) {
        return paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    public Page<Payment> listAll(Pageable pageable) {
        return paymentRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    // ===================== HO TRO =====================

    private PaymentGateway configuredGateway(PaymentProvider provider) {
        PaymentGateway gateway = gateways.get(provider);
        if (gateway == null || !gateway.isConfigured()) {
            throw new BadRequestException("Cổng " + provider.getLabel() + " chưa được cấu hình");
        }
        return gateway;
    }

    private Payment touch(Payment payment) {
        payment.setUpdatedAt(Instant.now());
        return paymentRepository.save(payment);
    }

    /**
     * Ma giao dich phia cua hang: chu va so, duy nhat. ZaloPay bat buoc tien to yyMMdd_
     * theo gio Viet Nam.
     */
    static String newTxnRef(PaymentProvider provider, Instant createdAt) {
        String base = "BP" + createdAt.toEpochMilli() + ThreadLocalRandom.current().nextInt(100, 1000);
        return provider == PaymentProvider.ZALOPAY ? ZalopayGateway.TRANS_DATE.format(createdAt) + "_" + base : base;
    }

    /** Noi dung giao dich: khong dau, khong ky tu dac biet (yeu cau cua VNPay). */
    private static String orderInfo(OrderSnapshot order) {
        return "Thanh toan don hang " + order.code() + " tai Bloom Studio";
    }
}
