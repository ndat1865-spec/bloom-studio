package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.GatewayException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.InvalidSignatureException;
import dh13c6.nguyentiendat516.bloom.paymentservice.resilience.CircuitOpenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * ZaloPay - API v2.
 *
 * Hai khoa voi hai vai tro:
 *  - key1: cua hang KY yeu cau gui di (tao don, truy van).
 *  - key2: cua hang KIEM TRA du lieu ZaloPay gui ve (redirect, callback).
 * Chuoi ky la cac truong noi bang '|' theo thu tu co dinh, HMAC-SHA256.
 */
@Component
public class ZalopayGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(ZalopayGateway.class);

    /** app_trans_id bat buoc bat dau bang ngay yyMMdd theo gio Viet Nam. */
    public static final DateTimeFormatter TRANS_DATE = DateTimeFormatter.ofPattern("yyMMdd")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String appId;
    private final String key1;
    private final String key2;
    private final String endpoint;
    private final String returnUrl;
    private final String callbackUrl;
    private final int expireMinutes;

    public ZalopayGateway(RestTemplate restTemplate, ObjectMapper objectMapper,
                          @Value("${payment.zalopay.app-id}") String appId,
                          @Value("${payment.zalopay.key1}") String key1,
                          @Value("${payment.zalopay.key2}") String key2,
                          @Value("${payment.zalopay.endpoint}") String endpoint,
                          @Value("${payment.return-url}") String returnUrl,
                          @Value("${payment.public-base-url}") String publicBaseUrl,
                          @Value("${payment.expire-minutes}") int expireMinutes) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.appId = appId.trim();
        this.key1 = key1.trim();
        this.key2 = key2.trim();
        this.endpoint = endpoint;
        this.returnUrl = returnUrl;
        this.callbackUrl = publicBaseUrl + "/api/payments/zalopay/callback";
        this.expireMinutes = expireMinutes;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.ZALOPAY;
    }

    @Override
    public boolean isConfigured() {
        return !appId.isEmpty() && !key1.isEmpty() && !key2.isEmpty();
    }

    @Override
    public String createPayUrl(Payment payment, String orderInfo, String clientIp) {
        String appTransId = payment.getTxnRef();
        String appUser = payment.getUserId() == null ? "bloom" : "user" + payment.getUserId();
        String appTime = String.valueOf(payment.getCreatedAt().toEpochMilli());
        String amount = String.valueOf(payment.getAmount());
        // ZaloPay tu noi ket qua vao sau redirecturl khi dua khach quay ve
        String embedData = objectMapper.writeValueAsString(Map.of("redirecturl", returnUrl));
        String item = "[]";

        String data = String.join("|", appId, appTransId, appUser, amount, appTime, embedData, item);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("app_id", appId);
        form.add("app_trans_id", appTransId);
        form.add("app_user", appUser);
        form.add("app_time", appTime);
        form.add("amount", amount);
        form.add("item", item);
        form.add("embed_data", embedData);
        form.add("description", orderInfo);
        form.add("bank_code", "");
        form.add("callback_url", callbackUrl);
        form.add("expire_duration_seconds", String.valueOf(expireMinutes * 60));
        form.add("mac", Hmac.sha256(key1, data));

        Map<?, ?> response = postForm("/v2/create", form);
        if (!"1".equals(str(response.get("return_code"))) || response.get("order_url") == null) {
            throw new GatewayException("ZaloPay từ chối tạo giao dịch: "
                    + str(response.get("sub_return_message")) + " " + str(response.get("return_message")));
        }
        return str(response.get("order_url"));
    }

    @Override
    public boolean recognizes(Map<String, String> params) {
        return params.containsKey("apptransid") && params.containsKey("checksum");
    }

    /** Tham so ZaloPay gan them vao redirecturl, kiem bang key2. status = 1 la thanh cong. */
    @Override
    public GatewayResult verifyReturn(Map<String, String> params) {
        String data = String.join("|", val(params, "appid"), val(params, "apptransid"), val(params, "pmcid"),
                val(params, "bankcode"), val(params, "amount"), val(params, "discountamount"),
                val(params, "status"));
        if (!Hmac.matches(Hmac.sha256(key2, data), params.get("checksum"))) {
            throw new InvalidSignatureException("Chữ ký ZaloPay không hợp lệ");
        }
        if (!appId.equals(params.get("appid"))) {
            throw new InvalidSignatureException("Mã ứng dụng ZaloPay không khớp");
        }
        boolean ok = "1".equals(params.get("status"));
        return new GatewayResult(params.get("apptransid"),
                ok ? GatewayResult.Outcome.SUCCESS : GatewayResult.Outcome.FAILED,
                parseLong(params.get("amount")), null,
                ok ? "Giao dịch thành công" : "Giao dịch ZaloPay không thành công (status " + params.get("status") + ")");
    }

    /**
     * Callback server-to-server: body {data, mac, type}, mac = HMAC(key2, data).
     * data la mot chuoi JSON - phai kiem mac tren CHINH chuoi do truoc khi doc no.
     */
    public GatewayResult verifyCallback(String data, String mac) {
        if (data == null || !Hmac.matches(Hmac.sha256(key2, data), mac)) {
            throw new InvalidSignatureException("mac not equal");
        }
        Map<?, ?> payload = objectMapper.readValue(data, Map.class);
        return new GatewayResult(str(payload.get("app_trans_id")), GatewayResult.Outcome.SUCCESS,
                parseLong(str(payload.get("amount"))), str(payload.get("zp_trans_id")),
                "ZaloPay callback: thanh toán thành công");
    }

    @Override
    public GatewayResult query(Payment payment) {
        String data = String.join("|", appId, payment.getTxnRef(), key1);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("app_id", appId);
        form.add("app_trans_id", payment.getTxnRef());
        form.add("mac", Hmac.sha256(key1, data));

        Map<?, ?> response = postForm("/v2/query", form);
        String returnCode = str(response.get("return_code"));
        GatewayResult.Outcome outcome = switch (returnCode) {
            case "1" -> GatewayResult.Outcome.SUCCESS;
            case "2" -> GatewayResult.Outcome.FAILED;
            // 3: dang xu ly hoac khach chua thanh toan
            default -> GatewayResult.Outcome.PENDING;
        };
        return new GatewayResult(payment.getTxnRef(), outcome, parseLong(str(response.get("amount"))),
                str(response.get("zp_trans_id")), str(response.get("return_message")));
    }

    /**
     * API refund v2. m_refund_id (payment.refundRef) dang yyMMdd_appid_xxx.
     * mac = HMAC(key1, app_id|zp_trans_id|amount|description|timestamp).
     * return_code: 1 da hoan, 2 that bai, 3 dang xu ly -> hoi lai bang queryRefund.
     */
    @Override
    public RefundResult refund(Payment payment, String reason) {
        if (payment.getProviderTxnId() == null || payment.getProviderTxnId().isEmpty()) {
            return new RefundResult(RefundResult.Outcome.FAILED, null, "Thiếu mã giao dịch ZaloPay (zp_trans_id), không hoàn được");
        }
        String timestamp = String.valueOf(System.currentTimeMillis());
        String amount = String.valueOf(payment.getAmount());
        String description = reason == null || reason.isBlank() ? "Hoan tien don " + payment.getOrderCode() : reason;
        String data = String.join("|", appId, payment.getProviderTxnId(), amount, description, timestamp);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("app_id", appId);
        form.add("m_refund_id", payment.getRefundRef());
        form.add("zp_trans_id", payment.getProviderTxnId());
        form.add("amount", amount);
        form.add("timestamp", timestamp);
        form.add("description", description);
        form.add("mac", Hmac.sha256(key1, data));

        return refundOutcome(postForm("/v2/refund", form));
    }

    @Override
    public RefundResult queryRefund(Payment payment) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String data = String.join("|", appId, payment.getRefundRef(), timestamp);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("app_id", appId);
        form.add("m_refund_id", payment.getRefundRef());
        form.add("timestamp", timestamp);
        form.add("mac", Hmac.sha256(key1, data));
        return refundOutcome(postForm("/v2/query_refund", form));
    }

    /** Ma yeu cau hoan tien dung dinh dang ZaloPay: yyMMdd_appid_<chuoi rieng>. */
    public String newRefundId(String unique) {
        return TRANS_DATE.format(java.time.Instant.now()) + "_" + appId + "_" + unique;
    }

    private static RefundResult refundOutcome(Map<?, ?> response) {
        String code = str(response.get("return_code"));
        String message = "ZaloPay: " + str(response.get("return_message")) + " "
                + str(response.get("sub_return_message")) + " (mã " + code + ")";
        String refundId = str(response.get("refund_id"));
        return switch (code) {
            case "1" -> new RefundResult(RefundResult.Outcome.SUCCESS, refundId, message);
            case "3" -> new RefundResult(RefundResult.Outcome.PENDING, refundId, message);
            default -> new RefundResult(RefundResult.Outcome.FAILED, null, message);
        };
    }

    // ===================== HO TRO =====================

    private Map<?, ?> postForm(String path, MultiValueMap<String, String> form) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        try {
            Map<?, ?> response = restTemplate.postForObject(endpoint + path, new HttpEntity<>(form, headers), Map.class);
            if (response == null) {
                throw new GatewayException("ZaloPay không trả lời");
            }
            return response;
        } catch (RestClientException e) {
            log.warn("Gọi ZaloPay {} thất bại: {}", path, e.getMessage());
            throw new GatewayException(CircuitOpenException.messageOr(e, "Không kết nối được ZaloPay"));
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
