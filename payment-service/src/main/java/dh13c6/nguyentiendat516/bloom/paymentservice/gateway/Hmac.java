package dh13c6.nguyentiendat516.bloom.paymentservice.gateway;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/** Ham bam co khoa dung chung cho ba cong thanh toan. */
public final class Hmac {

    private Hmac() {
    }

    public static String sha256(String key, String data) {
        return hex("HmacSHA256", key, data);
    }

    public static String sha512(String key, String data) {
        return hex("HmacSHA512", key, data);
    }

    /**
     * So sanh hai chuoi hex trong thoi gian khong doi (khong dung equals): equals dung o ky
     * tu sai dau tien, do thoi gian phan hoi co the doan dan tung ky tu cua chu ky dung.
     */
    public static boolean matches(String expectedHex, String actualHex) {
        if (expectedHex == null || actualHex == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expectedHex.toLowerCase().getBytes(StandardCharsets.US_ASCII),
                actualHex.toLowerCase().getBytes(StandardCharsets.US_ASCII));
    }

    private static String hex(String algorithm, String key, String data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), algorithm));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Không tính được chữ ký " + algorithm, e);
        }
    }
}
