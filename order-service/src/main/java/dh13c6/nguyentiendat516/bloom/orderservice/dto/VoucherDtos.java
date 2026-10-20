package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Voucher;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

/** Cac DTO cua chuc nang ma giam gia, gom chung mot file cho gon. */
public final class VoucherDtos {

    private VoucherDtos() {
    }

    /** Body tao / sua ma (ADMIN). */
    public record VoucherRequest(
            @NotBlank(message = "Nhập mã giảm giá")
            @Size(min = 3, max = 30, message = "Mã cần 3 đến 30 ký tự")
            @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mã chỉ gồm chữ không dấu, số, gạch ngang, gạch dưới")
            String code,

            @Size(max = 200, message = "Mô tả tối đa 200 ký tự")
            String description,

            @NotNull(message = "Chọn kiểu giảm giá")
            Voucher.Type type,

            @NotNull(message = "Nhập mức giảm")
            @DecimalMin(value = "0.01", message = "Mức giảm phải lớn hơn 0")
            Double value,

            @PositiveOrZero(message = "Giảm tối đa không được âm")
            Double maxDiscount,

            @PositiveOrZero(message = "Đơn tối thiểu không được âm")
            Double minOrderValue,

            LocalDate startDate,

            LocalDate endDate,

            @Min(value = 1, message = "Số lượt dùng tối thiểu là 1")
            Integer usageLimit,

            Boolean onePerCustomer,

            Boolean active,

            /** Ma rieng cho mot khach (id + username lay tu danh sach tai khoan). Bo trong = ma chung. */
            Long ownerUserId,

            @Size(max = 50, message = "Tên đăng nhập tối đa 50 ký tự")
            String ownerUsername,

            /** Ma san: khach phai bam Luu o trang Voucher moi dung duoc. */
            Boolean claimRequired,

            @Min(value = 1, message = "Số lượt lưu tối thiểu là 1")
            Integer claimLimit
    ) {
    }

    public record VoucherResponse(
            Long id,
            String code,
            String description,
            String type,
            Double value,
            Double maxDiscount,
            Double minOrderValue,
            LocalDate startDate,
            LocalDate endDate,
            Integer usageLimit,
            Integer usedCount,
            boolean onePerCustomer,
            boolean active,
            Instant createdAt,
            Long ownerUserId,
            String ownerUsername,
            boolean claimRequired,
            Integer claimLimit,
            Integer claimedCount
    ) {
        public static VoucherResponse from(Voucher v) {
            return new VoucherResponse(v.getId(), v.getCode(), v.getDescription(), v.getType().name(),
                    v.getValue(), v.getMaxDiscount(), v.getMinOrderValue(), v.getStartDate(),
                    v.getEndDate(), v.getUsageLimit(), v.getUsedCount(), v.isOnePerCustomer(),
                    v.isActive(), v.getCreatedAt(), v.getOwnerUserId(), v.getOwnerUsername(),
                    v.isClaimRequired(), v.getClaimLimit(), v.getClaimedCount());
        }
    }

    /**
     * Mot ma trong vi cua khach, kem danh gia cho don hien tai.
     * status: USABLE | NOT_STARTED | EXPIRED | USED_UP | ALREADY_USED | BELOW_MIN | INACTIVE.
     * discount: so tien giam neu dung cho don `amount` (0 khi khong dung duoc / khong gui amount).
     */
    public record MyVoucher(String code, String description, String type, Double value, Double maxDiscount,
                            Double minOrderValue, LocalDate startDate, LocalDate endDate, boolean personal,
                            String status, String reason, double discount) {
    }

    /**
     * Mot ma tren trang "San voucher".
     * state: CLAIMABLE (bam Luu duoc) | CLAIMED (da luu, nam trong vi) | READY (ma chung, co san
     * trong vi, khong can luu) | UPCOMING (chua toi ngay) | SOLD_OUT (het luot luu / het luot dung)
     * | USED (tai khoan nay da dung ma gioi han moi nguoi mot lan).
     * claimedPercent: phan tram da luu (ma san) hoac da dung (ma co gioi han luot), null khi khong
     * gioi han. Chi lo ti le chu khong lo so luot that - cung ly do voi PublicVoucher.
     */
    public record HuntVoucher(String code, String description, String type, Double value, Double maxDiscount,
                              Double minOrderValue, LocalDate startDate, LocalDate endDate,
                              boolean claimRequired, String state, Integer claimedPercent) {
    }

    /** Ket qua POST /vouchers/{code}/claim. alreadyClaimed = bam Luu lai mot ma da luu tu truoc. */
    public record ClaimResponse(String code, boolean alreadyClaimed, Integer claimedPercent) {
    }

    /**
     * Ma dang dung duoc - ban rut gon hien o trang thanh toan.
     * Khong lo usedCount / usageLimit: khach khong can biet, doi thu cung khong nen biet.
     */
    public record PublicVoucher(String code, String description, String type, Double value,
                                Double maxDiscount, Double minOrderValue, LocalDate endDate) {
        public static PublicVoucher from(Voucher v) {
            return new PublicVoucher(v.getCode(), v.getDescription(), v.getType().name(), v.getValue(),
                    v.getMaxDiscount(), v.getMinOrderValue(), v.getEndDate());
        }
    }

    /**
     * Body cua POST /vouchers/check - xem truoc so tien giam.
     * amount do client tinh (tien hoa + qua kem) CHI de hien thi; khi dat hang that,
     * server tinh lai tu gia trong CSDL va kiem tra ma lan nua.
     */
    public record VoucherCheckRequest(
            @NotBlank(message = "Nhập mã giảm giá") String code,
            @NotNull(message = "Thiếu giá trị đơn") @PositiveOrZero(message = "Giá trị đơn không hợp lệ") Double amount
    ) {
    }

    public record VoucherCheckResponse(String code, String description, double discount) {
    }
}
