package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.InvalidSignatureException;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Giu chu ky cua ba cong thanh toan. Khong can mang, khong can CSDL.
 *
 * Hai loai kiem tra:
 *  - Vector co dinh tinh bang mot thu vien KHAC (crypto cua Node.js): bat loi ma hoa
 *    (UTF-8, dau cach, ky tu dac biet) ma kiem tra khu hoi (tu ky tu kiem) khong bat duoc.
 *  - Sua mot tham so sau khi ky thi phai bi tu choi: day chinh la tan cong "doi
 *    vnp_ResponseCode=24 thanh 00 tren thanh dia chi".
 */
class GatewaySignatureTests {

    private static final String RETURN_URL = "http://localhost:5173/payment/result";

    // ---------- HMAC: doi chieu voi Node.js ----------

    @Test
    void hmacSha256KhopVoiNodeCrypto() {
        String raw = "accessKey=F8BBA842ECF85&amount=50000&extraData=&ipnUrl=http://localhost:8080/api/payments/momo/ipn"
                + "&orderId=BP1&orderInfo=Thanh toán&partnerCode=MOMO&redirectUrl=http://localhost:5173/payment/result"
                + "&requestId=BP1&requestType=payWithMethod";
        assertThat(Hmac.sha256("K951B6PE1waDMi640xX08PD3vg6EkVlz", raw))
                .isEqualTo("54758169715f1f221bda9079bf94216eadc0e2c08001bf2cc4204f8584a39de6");
    }

    @Test
    void vnpayMaHoaVaKyKhopVoiNodeCrypto() {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", "15000000");
        params.put("vnp_OrderInfo", "Thanh toan don hang BLM1");
        params.put("vnp_ReturnUrl", RETURN_URL);
        params.put("vnp_BankCode", ""); // gia tri rong bi bo qua

        String canonical = VnpayGateway.canonical(params);
        assertThat(canonical).isEqualTo(
                "vnp_Amount=15000000&vnp_OrderInfo=Thanh+toan+don+hang+BLM1"
                        + "&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A5173%2Fpayment%2Fresult");
        assertThat(Hmac.sha512("SECRETVNP", canonical)).isEqualTo(
                "89b92d3e822137bf584746edd92c9516cecbbf263dbc8e025df602e6a3d1edd8"
                        + "094ad80894c9eb7b6f5730b6d7aa5501e42e9639e2b359b0799b76ac084ed492");
    }

    // ---------- VNPay ----------

    private VnpayGateway vnpay() {
        return new VnpayGateway(new RestTemplate(), "BLOOMTMN", "SECRETVNP",
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", "https://example.invalid", RETURN_URL, 15);
    }

    @Test
    void vnpayLinkThanhToanTuKiemDuocChuKy() {
        Payment payment = payment("BP1790000000000123", 150_000L);
        String url = vnpay().createPayUrl(payment, "Thanh toan don hang BLM1", "127.0.0.1");

        Map<String, String> query = parseQuery(url);
        assertThat(query).containsEntry("vnp_Amount", "15000000").containsEntry("vnp_TxnRef", "BP1790000000000123")
                .containsEntry("vnp_CreateDate", "20260925103000")   // gio Viet Nam, khong phai UTC
                .containsEntry("vnp_ExpireDate", "20260925104500");
        // Chu ky tren link phai tinh lai duoc tu chinh cac tham so tren link
        Map<String, String> signed = new TreeMap<>(query);
        String hash = signed.remove("vnp_SecureHash");
        assertThat(Hmac.sha512("SECRETVNP", VnpayGateway.canonical(signed))).isEqualTo(hash);

        // VNPay tra ve dung bo tham so + ket qua, ky lai bang cung khoa
        Map<String, String> back = vnpayReturn(payment.getTxnRef(), "15000000", "00");
        GatewayResult result = vnpay().verifyReturn(back);
        assertThat(result.outcome()).isEqualTo(GatewayResult.Outcome.SUCCESS);
        assertThat(result.amount()).isEqualTo(150_000L);
        assertThat(result.txnRef()).isEqualTo("BP1790000000000123");
    }

    @Test
    void vnpaySuaMaKetQuaSauKhiKyThiBiTuChoi() {
        Map<String, String> back = vnpayReturn("BP1", "15000000", "24");
        back.put("vnp_ResponseCode", "00");
        back.put("vnp_TransactionStatus", "00");
        assertThatThrownBy(() -> vnpay().verifyReturn(back)).isInstanceOf(InvalidSignatureException.class);
    }

    @Test
    void vnpayKhachHuyLaThatBai() {
        GatewayResult result = vnpay().verifyReturn(vnpayReturn("BP1", "15000000", "24"));
        assertThat(result.outcome()).isEqualTo(GatewayResult.Outcome.FAILED);
        assertThat(result.message()).contains("huỷ");
    }

    private Map<String, String> vnpayReturn(String txnRef, String amount, String code) {
        Map<String, String> signed = new TreeMap<>();
        signed.put("vnp_TmnCode", "BLOOMTMN");
        signed.put("vnp_TxnRef", txnRef);
        signed.put("vnp_Amount", amount);
        signed.put("vnp_OrderInfo", "Thanh toan don hang BLM1");
        signed.put("vnp_ResponseCode", code);
        signed.put("vnp_TransactionStatus", code.equals("00") ? "00" : "02");
        signed.put("vnp_TransactionNo", "14123456");
        signed.put("vnp_PayDate", "20260925103000");
        Map<String, String> all = new LinkedHashMap<>(signed);
        all.put("vnp_SecureHash", Hmac.sha512("SECRETVNP", VnpayGateway.canonical(signed)));
        return all;
    }

    // ---------- MoMo ----------

    private MomoGateway momo() {
        return new MomoGateway(new RestTemplate(), "MOMO", "F8BBA842ECF85", "K951B6PE1waDMi640xX08PD3vg6EkVlz",
                "https://example.invalid", RETURN_URL, "http://localhost:8080", 15);
    }

    @Test
    void momoKetQuaDungChuKyVaSuaSoTienThiBiTuChoi() {
        Map<String, String> back = new LinkedHashMap<>();
        back.put("partnerCode", "MOMO");
        back.put("orderId", "BP1");
        back.put("requestId", "BP1");
        back.put("amount", "250000");
        back.put("orderInfo", "Thanh toán đơn hàng BLM1");
        back.put("orderType", "momo_wallet");
        back.put("transId", "4100000001");
        back.put("resultCode", "0");
        back.put("message", "Thành công.");
        back.put("payType", "qr");
        back.put("responseTime", "1790000000000");
        back.put("extraData", "");
        String raw = "accessKey=F8BBA842ECF85&amount=250000&extraData=&message=Thành công.&orderId=BP1"
                + "&orderInfo=Thanh toán đơn hàng BLM1&orderType=momo_wallet&partnerCode=MOMO&payType=qr"
                + "&requestId=BP1&responseTime=1790000000000&resultCode=0&transId=4100000001";
        back.put("signature", Hmac.sha256("K951B6PE1waDMi640xX08PD3vg6EkVlz", raw));

        GatewayResult result = momo().verifyReturn(back);
        assertThat(result.outcome()).isEqualTo(GatewayResult.Outcome.SUCCESS);
        assertThat(result.amount()).isEqualTo(250_000L);
        assertThat(result.providerTxnId()).isEqualTo("4100000001");

        back.put("amount", "1000");
        assertThatThrownBy(() -> momo().verifyReturn(back)).isInstanceOf(InvalidSignatureException.class);
    }

    @Test
    void momoMaKetQua() {
        assertThat(MomoGateway.outcomeOf("0")).isEqualTo(GatewayResult.Outcome.SUCCESS);
        assertThat(MomoGateway.outcomeOf("7000")).isEqualTo(GatewayResult.Outcome.PENDING);
        assertThat(MomoGateway.outcomeOf("1006")).isEqualTo(GatewayResult.Outcome.FAILED);
    }

    // ---------- ZaloPay ----------

    private ZalopayGateway zalopay() {
        return new ZalopayGateway(new RestTemplate(), JsonMapper.builder().build(), "2553", "KEY1", "KEY2",
                "https://example.invalid", RETURN_URL, "http://localhost:8080", 15);
    }

    @Test
    void zalopayRedirectKiemBangKey2() {
        Map<String, String> back = new LinkedHashMap<>();
        back.put("appid", "2553");
        back.put("apptransid", "260925_BP1");
        back.put("pmcid", "38");
        back.put("bankcode", "");
        back.put("amount", "250000");
        back.put("discountamount", "0");
        back.put("status", "1");
        back.put("checksum", Hmac.sha256("KEY2", "2553|260925_BP1|38||250000|0|1"));

        assertThat(zalopay().verifyReturn(back).outcome()).isEqualTo(GatewayResult.Outcome.SUCCESS);

        // Ky bang key1 (khoa cua cua hang) thi khong hop le - ZaloPay ky ket qua bang key2
        back.put("checksum", Hmac.sha256("KEY1", "2553|260925_BP1|38||250000|0|1"));
        assertThatThrownBy(() -> zalopay().verifyReturn(back)).isInstanceOf(InvalidSignatureException.class);
    }

    @Test
    void zalopayCallbackKiemMacTrenChuoiDataGoc() {
        String data = "{\"app_id\":2553,\"app_trans_id\":\"260925_BP1\",\"amount\":250000,\"zp_trans_id\":260925000001}";
        GatewayResult result = zalopay().verifyCallback(data, Hmac.sha256("KEY2", data));
        assertThat(result.txnRef()).isEqualTo("260925_BP1");
        assertThat(result.amount()).isEqualTo(250_000L);
        assertThat(result.providerTxnId()).isEqualTo("260925000001");

        String tampered = data.replace("250000", "1000");
        assertThatThrownBy(() -> zalopay().verifyCallback(tampered, Hmac.sha256("KEY2", data)))
                .isInstanceOf(InvalidSignatureException.class);
    }

    // ---------- ho tro ----------

    private static Payment payment(String txnRef, long amount) {
        Payment p = new Payment();
        p.setTxnRef(txnRef);
        p.setAmount(amount);
        p.setUserId(7L);
        p.setCreatedAt(Instant.parse("2026-09-25T03:30:00Z"));
        return p;
    }

    private static Map<String, String> parseQuery(String url) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String pair : URI.create(url).getRawQuery().split("&")) {
            String[] kv = pair.split("=", 2);
            map.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.US_ASCII));
        }
        return map;
    }
}
