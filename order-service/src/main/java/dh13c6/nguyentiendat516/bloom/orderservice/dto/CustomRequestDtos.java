package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequest;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

/** DTO cua yeu cau dat hoa theo y khach. */
public final class CustomRequestDtos {

    private CustomRequestDtos() {
    }

    /** Khach gui yeu cau. KHONG co userId - lay tu JWT. */
    public record CreateRequest(
            @Size(max = 40, message = "Dịp tặng tối đa 40 ký tự")
            String occasion,

            @NotNull(message = "Hãy cho studio biết ngân sách")
            @DecimalMin(value = "200000", message = "Ngân sách tối thiểu 200.000đ")
            @DecimalMax(value = "50000000", message = "Ngân sách tối đa 50.000.000đ — đơn lớn hơn hãy gọi studio")
            Double budget,

            @Size(max = 100, message = "Tông màu tối đa 100 ký tự")
            String colors,

            @NotBlank(message = "Chọn kiểu hoa: bó, giỏ, hộp, bình…")
            @Size(max = 40, message = "Kiểu hoa tối đa 40 ký tự")
            String arrangement,

            @Size(max = 60, message = "Kích cỡ tối đa 60 ký tự")
            String sizeOption,

            @Size(max = 200, message = "Danh sách hoa tối đa 200 ký tự")
            String flowers,

            @Size(max = 40, message = "Phong cách tối đa 40 ký tự")
            String style,

            @Size(max = 40, message = "Giấy gói tối đa 40 ký tự")
            String wrapping,

            @Size(max = 200, message = "Phần cần tránh tối đa 200 ký tự")
            String avoid,

            /** Ghi chu them - khong bat buoc vi cac lua chon o tren da du de studio bao gia. */
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
            String description,

            LocalDate desiredDate,

            @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
            String contactPhone
    ) {
    }

    /** Studio bao gia. */
    public record QuoteRequest(
            @NotNull(message = "Nhập giá báo cho khách")
            @DecimalMin(value = "50000", message = "Giá báo tối thiểu 50.000đ")
            @DecimalMax(value = "100000000", message = "Giá báo quá lớn")
            Double price,

            @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự")
            String note
    ) {
    }

    /** Studio tu choi. */
    public record RejectRequest(
            @NotBlank(message = "Cho khách biết lý do")
            @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự")
            String note
    ) {
    }

    public record Response(
            Long id,
            String code,
            String username,
            String occasion,
            Double budget,
            String colors,
            String arrangement,
            String sizeOption,
            String flowers,
            String style,
            String wrapping,
            String avoid,
            String description,
            String referenceImageUrl,
            LocalDate desiredDate,
            String contactPhone,
            String status,
            String statusLabel,
            Double quotedPrice,
            String shopNote,
            Instant quotedAt,
            String handledBy,
            Instant createdAt,
            Long orderId,
            String orderCode
    ) {
        public static Response from(CustomRequest r) {
            return new Response(r.getId(), r.getCode(), r.getUsername(), r.getOccasion(), r.getBudget(),
                    r.getColors(), r.getArrangement(), r.getSizeOption(), r.getFlowers(), r.getStyle(),
                    r.getWrapping(), r.getAvoid(), r.getDescription(), r.getReferenceImageUrl(), r.getDesiredDate(),
                    r.getContactPhone(), r.getStatus().name(), r.getStatus().getLabel(), r.getQuotedPrice(),
                    r.getShopNote(), r.getQuotedAt(), r.getHandledBy(), r.getCreatedAt(), r.getOrderId(),
                    r.getOrderCode());
        }
    }
}
