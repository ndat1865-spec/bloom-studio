package dh13c6.nguyentiendat516.bloom.productservice.dto;

import dh13c6.nguyentiendat516.bloom.productservice.entity.BouquetSize;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;

import java.util.Arrays;
import java.util.List;

/**
 * SOS05 - DTO tra ve cho Product.
 * Dung DTO thay cho @JsonBackReference de: (1) khong lap vong JSON,
 * (2) van giu category {id, name} cho form sua o frontend.
 */
public record ProductResponse(
        Long id,
        String name,
        Double price,
        String description,
        String imageUrl,
        Integer stockQuantity,
        CategorySummary category,
        /** Ma dip (BIRTHDAY, LOVE...) - nhan tieng Viet lay tu GET /products/attributes */
        List<String> occasions,
        String color,
        Double ratingAverage,
        int ratingCount,
        String composition,
        Integer stemCount,
        boolean sized,
        int leadDays,
        /**
         * Cac co khach chon duoc, kem gia da tinh. San pham khong chia co van co dung mot
         * dong STANDARD - order-service luon tim gia trong danh sach nay.
         */
        List<SizeOption> sizes
) {
    public record SizeOption(String code, String label, Integer stems, double price) {
    }

    public static ProductResponse from(Product p) {
        CategorySummary cat = (p.getCategory() == null)
                ? null
                : new CategorySummary(p.getCategory().getId(), p.getCategory().getName());
        List<BouquetSize> sizes = p.isSized()
                ? Arrays.asList(BouquetSize.values())
                : List.of(BouquetSize.STANDARD);
        return new ProductResponse(p.getId(), p.getName(), p.getPrice(), p.getDescription(),
                p.getImageUrl(), p.getStockQuantity(), cat,
                p.getOccasions().stream().map(Enum::name).sorted().toList(),
                p.getColor() == null ? null : p.getColor().name(),
                p.getRatingAverage(),
                p.getRatingCount() == null ? 0 : p.getRatingCount(),
                p.getComposition(),
                p.getStemCount(),
                p.isSized(),
                p.getLeadDays() == null ? 0 : p.getLeadDays(),
                sizes.stream()
                        .map(s -> new SizeOption(s.name(), s.getLabel(), s.stemsOf(p.getStemCount()),
                                s.priceOf(p.getPrice())))
                        .toList());
    }
}
