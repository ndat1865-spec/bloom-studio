package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.GatewayException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.InvalidSignatureException;
import dh13c6.nguyentiendat516.bloom.paymentservice.resilience.CircuitOpenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * MoMo - API v2 (payWithMethod: trang cua MoMo cho khach chon vi, the ATM hoac the quoc te).
 *
 * Cach ky: chuoi "key=value&..." voi cac key xep theo bang chu cai, gia tri GIU NGUYEN
 * (khong ma hoa URL), HMAC-SHA256 voi secretKey. Moi loai yeu cau co mot bo key rieng.
 */
@Component
public class MomoGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MomoGateway.class);

    private static final String REQUEST_TYPE = "payWithMethod";

    private final RestTemplate restTemplate;
    private final String partnerCode;
    private final String accessKey;
    private final String secretKey;
    private final String endpoint;
    private final String returnUrl;
    private final String ipnUrl;
    private final int expireMinutes;

    public MomoGateway(RestTemplate restTemplate,
                       @Value("${payment.momo.partner-code}") String partnerCode,
                       @Value("${payment.momo.access-key}") String accessKey,
                       @Value("${payment.momo.secret-key}") String secretKey,
                       @Value("${payment.momo.endpoint}") String endpoint,
                       @Value("${payment.return-url}") String returnUrl,
                       @Value("${payment.public-base-url}") String publicBaseUrl,
                       @Value("${payment.expire-minutes}") int expireMinutes) {
        this.restTemplate = restTemplate;
        this.partnerCode = partnerCode.trim();
        this.accessKey = accessKey.trim();
        this.secretKey = secretKey.trim();
        this.endpoint = endpoint;
        this.returnUrl = returnUrl;
        this.ipnUrl = publicBaseUrl + "/api/payments/momo/ipn";
        this.expireMinutes = expireMinutes;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.MOMO;
    }

    @Override
    public boolean isConfigured() {
        return !partnerCode.isEmpty() && !accessKey.isEmpty() && !secretKey.isEmpty();
    }

    @Override
    public String createPayUrl(Payment payment, String orderInfo, String clientIp) {
        String amount = String.valueOf(payment.getAmount());
        String orderId = payment.getTxnRef();
        String requestId = payment.getTxnRef();
        String extraData = "";

        String raw = "accessKey=" + accessKey
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + ipnUrl
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + partnerCode
                + "&redirectUrl=" + returnUrl
                + "&requestId=" + requestId
                + "&requestType=" + REQUEST_TYPE;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("requestId", requestId);
        body.put("amount", payment.getAmount());
        body.put("orderId", orderId);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", returnUrl);
        body.put("ipnUrl", ipnUrl);
        body.put("requestType", REQUEST_TYPE);
        body.put("extraData", extraData);
        body.put("orderExpireTime", expireMinutes);
        body.put("lang", "vi");
        body.put("signature", Hmac.sha256(secretKey, raw));

        Map<?, ?> response = post("/v2/gateway/api/create", body);
        if (!"0".equals(str(response.get("resultCode"))) || response.get("payUrl") == null) {
            throw new GatewayException("MoMo từ chối tạo giao dịch: " + str(response.get("message")));
        }
        return str(response.get("payUrl"));
    }

    @Override
    public boolean recognizes(Map<String, String> params) {
        return params.containsKey("partnerCode") && params.containsKey("signature")
                && params.containsKey("resultCode") && params.containsKey("orderId");
    }

    @Override
    public GatewayResult verifyReturn(Map<String, String> params) {
        String raw = "accessKey=" + accessKey
                + "&amount=" + val(params, "amount")
                + "&extraData=" + val(params, "extraData")
                + "&message=" + val(params, "message")
                + "&orderId=" + val(params, "orderId")
                + "&orderInfo=" + val(params, "orderInfo")
                + "&orderType=" + val(params, "orderType")
                + "&partnerCode=" + val(params, "partnerCode")
                + "&payType=" + val(params, "payType")
                + "&requestId=" + val(params, "requestId")
                + "&responseTime=" + val(params, "responseTime")
                + "&resultCode=" + val(params, "resultCode")
                + "&transId=" + val(params, "transId");
        if (!Hmac.matches(Hmac.sha256(secretKey, raw), params.get("signature"))) {
            throw new InvalidSignatureException("Chữ ký MoMo không hợp lệ");
        }
        if (!partnerCode.equals(params.get("partnerCode"))) {
            throw new InvalidSignatureException("Mã đối tác MoMo không khớp");
        }
        return new GatewayResult(params.get("orderId"), outcomeOf(params.get("resultCode")),
                parseLong(params.get("amount")), params.get("transId"), params.get("message"));
    }

    @Override
    public GatewayResult query(Payment payment) {
        String requestId = UUID.randomUUID().toString();
        String raw = "accessKey=" + accessKey
                + "&orderId=" + payment.getTxnRef()
                + "&partnerCode=" + partnerCode
                + "&requestId=" + requestId;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("requestId", requestId);
        body.put("orderId", payment.getTxnRef());
        body.put("lang", "vi");
        body.put("signature", Hmac.sha256(secretKey, raw));

        Map<?, ?> response = post("/v2/gateway/api/query", body);
        String resultCode = str(response.get("resultCode"));
        return new GatewayResult(payment.getTxnRef(), outcomeOf(resultCode),
                parseLong(str(response.get("amount"))), str(response.get("transId")),
                str(response.get("message")));
    }

    /**
     * API refund v2. orderId la MA MOI cho yeu cau hoan tien (payment.refundRef), transId la ma
     * giao dich MoMo cua lan thanh toan goc.
     */
    @Override
    public RefundResult refund(Payment payment, String reason) {
        if (payment.getProviderTxnId() == null || payment.getProviderTxnId().isEmpty()) {
            return new RefundResult(RefundResult.Outcome.FAILED, null, "Thiếu mã giao dịch MoMo (transId), không hoàn được");
        }
        String requestId = UUID.randomUUID().toString();
        String amount = String.valueOf(payment.getAmount());
        String description = reason == null ? "" : reason;
        String raw = "accessKey=" + accessKey
                + "&amount=" + amount
                + "&description=" + description
                + "&orderId=" + payment.getRefundRef()
                + "&partnerCode=" + partnerCode
                + "&requestId=" + requestId
                + "&transId=" + payment.getProviderTxnId();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("orderId", payment.getRefundRef());
        body.put("requestId", requestId);
        body.put("amount", payment.getAmount());
        body.put("transId", Long.parseLong(payment.getProviderTxnId()));
        body.put("lang", "vi");
        body.put("description", description);
        body.put("signature", Hmac.sha256(secretKey, raw));

        Map<?, ?> response = post("/v2/gateway/api/refund", body);
        String code = str(response.get("resultCode"));
        String message = "MoMo: " + str(response.get("message")) + " (mã " + code + ")";
        return switch (code) {
            case "0" -> new RefundResult(RefundResult.Outcome.SUCCESS, str(response.get("transId")), message);
            case "1000", "7000", "7002" -> new RefundResult(RefundResult.Outcome.PENDING, null, message);
            default -> new RefundResult(RefundResult.Outcome.FAILED, null, message);
        };
    }

    // ===================== HO TRO =====================

    /**
     * 0 = thanh cong, 9000 = da uy quyen (tu dong thu tien ngay sau do).
     * 1000 / 7000 / 7002 = dang cho khach xac nhan hoac dang xu ly. Con lai la that bai.
     */
    static GatewayResult.Outcome outcomeOf(String resultCode) {
        return switch (resultCode == null ? "" : resultCode) {
            case "0", "9000" -> GatewayResult.Outcome.SUCCESS;
            case "1000", "7000", "7002" -> GatewayResult.Outcome.PENDING;
            default -> GatewayResult.Outcome.FAILED;
        };
    }

    private Map<?, ?> post(String path, Map<String, Object> body) {
        try {
            Map<?, ?> response = restTemplate.postForObject(endpoint + path, body, Map.class);
            if (response == null) {
                throw new GatewayException("MoMo không trả lời");
            }
            return response;
        } catch (RestClientException e) {
            log.warn("Gọi MoMo {} thất bại: {}", path, e.getMessage());
            throw new GatewayException(CircuitOpenException.messageOr(e, "Không kết nối được MoMo"));
        }
    }

    private static String val(Map<String, String> params, String key) {
        String value = params.get(key);
        return value == null ? "" : value;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static Long parseLong(String raw) {
        try {
            return raw == null || raw.isEmpty() ? null : Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
