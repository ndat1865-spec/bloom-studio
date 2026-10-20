package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.CardType;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.DeliverySlot;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Body cua POST /api/orders.
 *
 * customerName / phone / address la cua NGUOI NHAN. Cac truong sender* la cua NGUOI TANG,
 * bo trong khi tu mua cho minh. Moi truong tu "cardType" tro xuong deu tuy chon, nen
 * client cu chi gui nhu truoc van dat hang duoc.
 *
 * Khi da cau hinh GHN: address CHI la so nha + ten duong; tinh / quan / phuong gui bang
 * MA cua GHN (provinceId, districtId, wardCode) va server tu ghep thanh dia chi day du.
 * Khong co truong phi giao hang: server hoi GHN, khong tin so client gui.
 */
public record CreateOrderRequest(
        @NotBlank(message = "Tên người nhận không được để trống")
        @Size(min = 2, max = 100, message = "Tên người nhận cần 2 đến 100 ký tự")
        String customerName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Size(min = 8, max = 20, message = "Số điện thoại cần 8 đến 20 ký tự")
        String phone,

        @NotBlank(message = "Địa chỉ giao hàng không được để trống")
        @Size(min = 3, max = 255, message = "Địa chỉ cần 3 đến 255 ký tự")
        String address,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        String note,

        LocalDate deliveryDate,

        // KHONG co userId: chu don luon lay tu JWT da xac thuc trong
        // OrderController, khong bao gio tin gia tri client gui len. Neu de o day
        // thi khach A chi can sua mot so trong body la dat hang duoi ten khach B.

        @NotEmpty(message = "Giỏ hàng đang trống")
        @Valid
        List<OrderLineRequest> items,

        // ---------- Qua tang (tuy chon) ----------

        @Size(max = 100, message = "Tên người tặng tối đa 100 ký tự")
        String senderName,

        @Size(max = 20, message = "Số điện thoại người tặng tối đa 20 ký tự")
        String senderPhone,

        Boolean anonymousSender,

        CardType cardType,

        @Size(max = 200, message = "Lời chúc trên thiệp tối đa 200 ký tự")
        String cardMessage,

        DeliverySlot timeSlot,

        /** Khung giao 1 tieng: gio bat dau 8..20. Co thi uu tien hon timeSlot. */
        @Min(value = 8, message = "Studio giao từ 8:00")
        @Max(value = 20, message = "Khung giao muộn nhất là 20:00 – 21:00")
        Integer deliveryHour,

        @Valid
        @Size(max = 10, message = "Tối đa 10 loại quà kèm")
        List<AddonLineRequest> addons,

        @Size(max = 30, message = "Mã giảm giá không hợp lệ")
        String voucherCode,

        // ---------- Giao hang GHN (bat buoc khi da cau hinh GHN) ----------

        Integer provinceId,

        Integer districtId,

        @Size(max = 20, message = "Mã phường/xã không hợp lệ")
        String wardCode,

        // ---------- Thanh toan (null = COD) ----------

        PaymentMethod paymentMethod
) {
}
