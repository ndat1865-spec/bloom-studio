package dh13c6.nguyentiendat516.bloom.paymentservice.controller;

import dh13c6.nguyentiendat516.bloom.paymentservice.entity.Payment;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentProvider;
import dh13c6.nguyentiendat516.bloom.paymentservice.entity.PaymentStatus;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.InvalidSignatureException;
import dh13c6.nguyentiendat516.bloom.paymentservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.paymentservice.repository.PaymentRepository;
import dh13c6.nguyentiendat516.bloom.paymentservice.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * IPN / callback: cong thanh toan goi thang vao server, khong qua trinh duyet.
 *
 * Cong khai vi cong thanh toan khong co JWT; an toan nho kiem chu ky. Moi cong doi mot
 * dinh dang tra loi rieng - tra sai dinh dang thi cong coi nhu that bai va goi lai nhieu lan.
 */
@RestController
@RequestMapping("/payments")
public class PaymentCallbackController {

    private static final Logger log = LoggerFactory.getLogger(PaymentCallbackController.class);

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;

    public PaymentCallbackController(PaymentService paymentService, PaymentRepository paymentRepository) {
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
    }

    /** VNPay: GET kem tham so, tra {RspCode, Message} theo bang ma cua VNPay. */
    @GetMapping("/vnpay/ipn")
    public Map<String, String> vnpayIpn(@RequestParam Map<String, String> params) {
        try {
            Payment before = paymentRepository.findByTxnRef(params.getOrDefault("vnp_TxnRef", ""))
                    .orElseThrow(() -> new NotFoundException("not found"));
            boolean alreadyConfirmed = before.getStatus() != PaymentStatus.PENDING;
            // Luon kiem chu ky truoc khi tra loi, ke ca khi da xac nhan roi
            paymentService.confirmIpn(PaymentProvider.VNPAY, params);
            return alreadyConfirmed ? vnpay("02", "Order already confirmed") : vnpay("00", "Confirm Success");
        } catch (InvalidSignatureException e) {
            return vnpay("97", "Invalid Checksum");
        } catch (NotFoundException e) {
            return vnpay("01", "Order not found");
        } catch (BadRequestException e) {
            return vnpay("04", "Invalid Amount");
        } catch (RuntimeException e) {
            log.error("IPN VNPay lỗi", e);
            return vnpay("99", "Unknown error");
        }
    }

    /** MoMo: POST JSON, tra 204 la du. */
    @PostMapping("/momo/ipn")
    public ResponseEntity<Void> momoIpn(@RequestBody Map<String, Object> body) {
        Map<String, String> params = new LinkedHashMap<>();
        body.forEach((key, value) -> params.put(key, value == null ? "" : String.valueOf(value)));
        try {
            paymentService.confirmIpn(PaymentProvider.MOMO, params);
        } catch (InvalidSignatureException e) {
            log.warn("IPN MoMo sai chữ ký cho {}", params.get("orderId"));
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.noContent().build();
    }

    /** ZaloPay: POST {data, mac, type}, tra {return_code, return_message}. */
    @PostMapping("/zalopay/callback")
    public Map<String, Object> zalopayCallback(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            Object data = body.get("data");
            Object mac = body.get("mac");
            paymentService.confirmZalopayCallback(data == null ? null : data.toString(),
                    mac == null ? null : mac.toString());
            result.put("return_code", 1);
            result.put("return_message", "success");
        } catch (InvalidSignatureException e) {
            result.put("return_code", -1);
            result.put("return_message", "mac not equal");
        } catch (RuntimeException e) {
            // return_code 0: ZaloPay se goi lai callback (toi da 3 lan)
            log.error("Callback ZaloPay lỗi", e);
            result.put("return_code", 0);
            result.put("return_message", e.getMessage());
        }
        return result;
    }

    private static Map<String, String> vnpay(String code, String message) {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("RspCode", code);
        result.put("Message", message);
        return result;
    }
}
