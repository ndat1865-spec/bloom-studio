package dh13c6.nguyentiendat516.bloom.productservice.dto;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;

/**
 * DTO tra ve cho Category. Khong nhung danh sach products de tranh vong lap JSON;
 * danh sach san pham lay qua GET /api/categories/{id}/products.
 */
public record CategoryResponse(Long id, String name, long productCount) {

    public static CategoryResponse from(Category c, long productCount) {
        return new CategoryResponse(c.getId(), c.getName(), productCount);
    }
}
