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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;
import java.util.UUID;

/**
 * VNPay phien ban 2.1.0.
 *
 * Cach ky: sap xep tham so theo ten, ma hoa URL tung gia tri (US-ASCII, dau cach thanh '+'),
 * noi bang '&' roi HMAC-SHA512 voi vnp_HashSecret. Chuoi da ma hoa do vua la du lieu ky,
 * vua la query string cua link thanh toan - hai thu phai GIONG HET nhau.
 *
 * vnp_OrderInfo chi dung tieng Viet khong dau: tai lieu VNPay yeu cau vay, va ma hoa
 * US-ASCII se bien chu co dau thanh '?', lam lech chu ky.
 */
@Component
public class VnpayGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(VnpayGateway.class);

    private static final String VERSION = "2.1.0";
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final RestTemplate restTemplate;
    private final String tmnCode;
    private final String hashSecret;
    private final String payUrl;
    private final String apiUrl;
    private final String returnUrl;
    private final int expireMinutes;

    public VnpayGateway(RestTemplate restTemplate,
                        @Value("${payment.vnpay.tmn-code}") String tmnCode,
                        @Value("${payment.vnpay.hash-secret}") String hashSecret,
                        @Value("${payment.vnpay.pay-url}") String payUrl,
                        @Value("${payment.vnpay.api-url}") String apiUrl,
                        @Value("${payment.return-url}") String returnUrl,
                        @Value("${payment.expire-minutes}") int expireMinutes) {
        this.restTemplate = restTemplate;
        this.tmnCode = tmnCode.trim();
        this.hashSecret = hashSecret.trim();
        this.payUrl = payUrl;
        this.apiUrl = apiUrl;
        this.returnUrl = returnUrl;
        this.expireMinutes = expireMinutes;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.VNPAY;
    }

    @Override
    public boolean isConfigured() {
        return !tmnCode.isEmpty() && !hashSecret.isEmpty();
    }

    @Override
    public String createPayUrl(Payment payment, String orderInfo, String clientIp) {
        ZonedDateTime created = payment.getCreatedAt().atZone(VN);

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", VERSION);
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        // Don vi cua VNPay la 1/100 dong: 150.000d gui 15000000
        params.put("vnp_Amount", String.valueOf(payment.getAmount() * 100));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", payment.getTxnRef());
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", clientIp);
        params.put("vnp_CreateDate", TIME.format(created));
        params.put("vnp_ExpireDate", TIME.format(created.plusMinutes(expireMinutes)));

        String query = canonical(params);
        return payUrl + "?" + query + "&vnp_SecureHash=" + Hmac.sha512(hashSecret, query);
    }

    @Override
    public boolean recognizes(Map<String, String> params) {
        return params.containsKey("vnp_TxnRef") && params.containsKey("vnp_SecureHash");
    }

    @Override
    public GatewayResult verifyReturn(Map<String, String> params) {
        Map<String, String> signed = new TreeMap<>();
        params.forEach((key, value) -> {
            if (key.startsWith("vnp_") && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                signed.put(key, value);
            }
        });
        String expected = Hmac.sha512(hashSecret, canonical(signed));
        if (!Hmac.matches(expected, params.get("vnp_SecureHash"))) {
            throw new InvalidSignatureException("Chữ ký VNPay không hợp lệ");
        }
        if (!tmnCode.equals(params.get("vnp_TmnCode"))) {
            throw new InvalidSignatureException("Mã website VNPay không khớp");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        // Chi coi la da tra tien khi CA HAI ma deu 00. Ma 07 (tru tien nhung nghi ngo gian
        // lan) de o trang thai cho, doi soat roi moi quyet.
        GatewayResult.Outcome outcome;
        if ("00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus))) {
            outcome = GatewayResult.Outcome.SUCCESS;
        } else if ("07".equals(responseCode)) {
            outcome = GatewayResult.Outcome.PENDING;
        } else {
            outcome = GatewayResult.Outcome.FAILED;
        }
        return new GatewayResult(params.get("vnp_TxnRef"), outcome, parseAmount(params.get("vnp_Amount")),
                params.get("vnp_TransactionNo"), describe(responseCode));
    }

    /**
     * API querydr: hoi VNPay trang thai giao dich. Chu ky cua yeu cau la cac truong noi
     * bang '|' theo DUNG thu tu tai lieu quy dinh (khong sap xep nhu link thanh toan).
     */
    @Override
    public GatewayResult query(Payment payment) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        String transactionDate = TIME.format(payment.getCreatedAt().atZone(VN));
        String createDate = TIME.format(ZonedDateTime.now(VN));
        String ipAddr = "127.0.0.1";
        String orderInfo = "Truy van giao dich " + payment.getTxnRef();

        String data = String.join("|", requestId, VERSION, "querydr", tmnCode, payment.getTxnRef(),
                transactionDate, createDate, ipAddr, orderInfo);

        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VERSION);
        body.put("vnp_Command", "querydr");
        body.put("vnp_TmnCode", tmnCode);
        body.put("vnp_TxnRef", payment.getTxnRef());
        body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_TransactionDate", transactionDate);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ipAddr);
        body.put("vnp_SecureHash", Hmac.sha512(hashSecret, data));

        Map<?, ?> response;
        try {
            response = restTemplate.postForObject(apiUrl, body, Map.class);
        } catch (RestClientException e) {
            log.warn("Không truy vấn được VNPay cho {}: {}", payment.getTxnRef(), e.getMessage());
            throw new GatewayException(CircuitOpenException.messageOr(e, "Không kết nối được VNPay"));
        }
        if (response == null) {
            throw new GatewayException("VNPay không trả lời");
        }

        String responseCode = str(response.get("vnp_ResponseCode"));
        String transactionStatus = str(response.get("vnp_TransactionStatus"));
        if ("91".equals(responseCode)) {
            // Khong tim thay giao dich: khach chua tung mo trang thanh toan
            return new GatewayResult(payment.getTxnRef(), GatewayResult.Outcome.PENDING, null, null,
                    "VNPay chưa ghi nhận giao dịch");
        }
        if (!"00".equals(responseCode)) {
            throw new GatewayException("VNPay từ chối truy vấn (mã " + responseCode + ")");
        }
        GatewayResult.Outcome outcome = switch (transactionStatus) {
            case "00" -> GatewayResult.Outcome.SUCCESS;
            case "01", "05", "06", "07" -> GatewayResult.Outcome.PENDING;
            default -> GatewayResult.Outcome.FAILED;
        };
        return new GatewayResult(payment.getTxnRef(), outcome, parseAmount(str(response.get("vnp_Amount"))),
                str(response.get("vnp_TransactionNo")), "VNPay: trạng thái giao dịch " + transactionStatus);
    }

    /**
     * API refund: hoan toan bo (vnp_TransactionType = 02). Chu ky la 13 truong noi bang '|'
     * theo dung thu tu tai lieu. vnp_TransactionDate phai la vnp_CreateDate cua giao dich goc.
     */
    @Override
    public RefundResult refund(Payment payment, String reason) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        String amount = String.valueOf(payment.getAmount() * 100);
        String transactionNo = payment.getProviderTxnId() == null ? "" : payment.getProviderTxnId();
        String transactionDate = TIME.format(payment.getCreatedAt().atZone(VN));
        String createBy = "admin";
        String createDate = TIME.format(ZonedDateTime.now(VN));
        String ipAddr = "127.0.0.1";
        String orderInfo = "Hoan tien giao dich " + payment.getTxnRef();

        String data = String.join("|", requestId, VERSION, "refund", tmnCode, "02", payment.getTxnRef(),
                amount, transactionNo, transactionDate, createBy, createDate, ipAddr, orderInfo);

        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VERSION);
        body.put("vnp_Command", "refund");
        body.put("vnp_TmnCode", tmnCode);
        body.put("vnp_TransactionType", "02");
        body.put("vnp_TxnRef", payment.getTxnRef());
        body.put("vnp_Amount", amount);
        body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_TransactionNo", transactionNo);
        body.put("vnp_TransactionDate", transactionDate);
        body.put("vnp_CreateBy", createBy);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ipAddr);
        body.put("vnp_SecureHash", Hmac.sha512(hashSecret, data));

        Map<?, ?> response;
        try {
            response = restTemplate.postForObject(apiUrl, body, Map.class);
        } catch (RestClientException e) {
            log.warn("Không hoàn tiền VNPay được cho {}: {}", payment.getTxnRef(), e.getMessage());
            throw new GatewayException(CircuitOpenException.messageOr(e, "Không kết nối được VNPay"));
        }
        if (response == null) {
            throw new GatewayException("VNPay không trả lời");
        }
        String code = str(response.get("vnp_ResponseCode"));
        String message = "VNPay: " + str(response.get("vnp_Message")) + " (mã " + code + ")";
        return switch (code) {
            case "00" -> new RefundResult(RefundResult.Outcome.SUCCESS, str(response.get("vnp_TransactionNo")), message);
            // 94: yeu cau trung - VNPay dang xu ly lan gui truoc
            case "94" -> new RefundResult(RefundResult.Outcome.PENDING, null, message);
            default -> new RefundResult(RefundResult.Outcome.FAILED, null, message);
        };
    }

    // ===================== HO TRO =====================

    /** Chuoi chuan de ky: key=value da ma hoa URL, sap xep theo key, bo gia tri rong. */
    static String canonical(Map<String, String> sorted) {
        StringJoiner joiner = new StringJoiner("&");
        sorted.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                joiner.add(URLEncoder.encode(key, StandardCharsets.US_ASCII) + "="
                        + URLEncoder.encode(value, StandardCharsets.US_ASCII));
            }
        });
        return joiner.toString();
    }

    private static Long parseAmount(String raw) {
        try {
            return raw == null ? null : Long.parseLong(raw) / 100;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    /** Bang ma loi rut gon tu tai lieu VNPay. */
    static String describe(String code) {
        if (code == null) {
            return "VNPay không trả mã kết quả";
        }
        return switch (code) {
            case "00" -> "Giao dịch thành công";
            case "07" -> "Trừ tiền thành công, giao dịch đang được VNPay kiểm tra";
            case "09" -> "Thẻ/Tài khoản chưa đăng ký InternetBanking";
            case "10" -> "Xác thực thông tin thẻ sai quá 3 lần";
            case "11" -> "Hết thời gian chờ thanh toán";
            case "12" -> "Thẻ/Tài khoản bị khoá";
            case "13" -> "Nhập sai mã OTP";
            case "24" -> "Khách hàng huỷ giao dịch";
            case "51" -> "Tài khoản không đủ số dư";
            case "65" -> "Vượt hạn mức giao dịch trong ngày";
            case "75" -> "Ngân hàng thanh toán đang bảo trì";
            case "79" -> "Nhập sai mật khẩu thanh toán quá số lần quy định";
            default -> "Giao dịch không thành công (mã " + code + ")";
        };
    }
}
