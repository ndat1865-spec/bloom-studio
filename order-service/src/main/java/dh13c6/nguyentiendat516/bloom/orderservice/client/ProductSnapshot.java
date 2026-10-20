package dh13c6.nguyentiendat516.bloom.orderservice.client;

import java.util.List;

/**
 * Anh chup thong tin san pham do product-service tra ve.
 *
 * Chi khai bao nhung truong order-service thuc su dung. product-service tra ve nhieu
 * truong hon (description, stockQuantity, category) - Spring Boot mac dinh bo qua
 * truong la nen khong sao, va day cung la mot loi ich cua giao tiep bang JSON: hai
 * service tien hoa doc lap, them truong moi khong lam vo ben con lai.
 *
 * sizes: gia tung co bo do product-service tinh san - order-service chi chon dong khop
 * voi co khach chon, khong tu nhan he so. leadDays: so ngay phai dat truoc.
 * Ca hai co the null khi product-service con la ban cu.
 */
public record ProductSnapshot(
        Long id,
        String name,
        Double price,
        String imageUrl,
        List<SizeOption> sizes,
        Integer leadDays
) {
    public record SizeOption(String code, String label, Integer stems, Double price) {
    }
}
