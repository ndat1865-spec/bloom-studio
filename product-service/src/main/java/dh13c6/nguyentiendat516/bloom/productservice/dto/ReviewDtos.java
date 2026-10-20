package dh13c6.nguyentiendat516.bloom.productservice.dto;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Review;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

/** Cac DTO cua chuc nang danh gia san pham, gom chung mot file cho gon. */
public final class ReviewDtos {

    private ReviewDtos() {
    }

    /** Body cua POST /products/{id}/reviews. KHONG co userId - lay tu JWT. */
    public record ReviewRequest(
            @NotNull(message = "Chọn số sao")
            @Min(value = 1, message = "Số sao từ 1 đến 5")
            @Max(value = 5, message = "Số sao từ 1 đến 5")
            Integer rating,

            @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự")
            String comment
    ) {
    }

    /** Body cua PATCH /reviews/{id}/visibility (ADMIN). */
    public record VisibilityRequest(@NotNull(message = "Thiếu trạng thái ẩn/hiện") Boolean hidden) {
    }

    public record ReviewResponse(
            Long id,
            Long productId,
            String productName,
            String username,
            Integer rating,
            String comment,
            boolean hidden,
            Instant createdAt,
            Instant updatedAt
    ) {
        /** Ban day du - cho ADMIN va cho chinh chu danh gia. */
        public static ReviewResponse full(Review r) {
            return new ReviewResponse(r.getId(), r.getProduct().getId(), r.getProduct().getName(),
                    r.getUsername(), r.getRating(), r.getComment(), r.isHidden(),
                    r.getCreatedAt(), r.getUpdatedAt());
        }

        /**
         * Ban cong khai: che bot ten tai khoan ("customer" -> "cu*****r").
         * Ten dang nhap la mot nua thong tin dang nhap, khong nen bay ra cho ca the gioi xem.
         */
        public static ReviewResponse publicView(Review r) {
            return new ReviewResponse(r.getId(), r.getProduct().getId(), r.getProduct().getName(),
                    mask(r.getUsername()), r.getRating(), r.getComment(), false,
                    r.getCreatedAt(), r.getUpdatedAt());
        }

        private static String mask(String username) {
            if (username == null || username.length() <= 2) {
                return "***";
            }
            if (username.length() <= 4) {
                return username.charAt(0) + "***";
            }
            return username.substring(0, 2)
                    + "*".repeat(username.length() - 3)
                    + username.charAt(username.length() - 1);
        }
    }

    /**
     * Tom tat diem cua mot san pham.
     * counts: so danh gia theo tung muc sao, du ca 5 khoa (1..5) ke ca khi bang 0.
     */
    public record ReviewSummary(Double average, long count, Map<Integer, Long> counts) {
    }

    /**
     * Nguoi dang dang nhap co danh gia duoc san pham nay khong.
     * reason: ly do khi canReview = false, de giao dien hien dung cau thay vi an nut di.
     */
    public record ReviewEligibility(boolean canReview, String reason, ReviewResponse myReview) {
    }
}
