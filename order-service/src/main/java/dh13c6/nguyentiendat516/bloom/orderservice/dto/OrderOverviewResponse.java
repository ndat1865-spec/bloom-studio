package dh13c6.nguyentiendat516.bloom.orderservice.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * So lieu tong quan ma order-service tu tinh duoc tren CSDL cua chinh no.
 *
 * KHONG co totalProducts / totalCategories / totalCustomers nhu ban monolith:
 * ba con so do thuoc CSDL cua product-service va auth-service, order-service
 * khong duoc phep doc. Frontend goi song song ba service roi ghep lai
 * (xem api.getAdminOverview trong bloom-frontend).
 *
 * Tinh duoc top san pham ban chay ma KHONG phai goi sang product-service, vi
 * order_items da chup lai san product_name tai thoi diem dat hang.
 */
public record OrderOverviewResponse(
        LocalDate from,
        LocalDate to,
        double revenue,
        double cancelledValue,
        double averageOrderValue,
        long orderCount,
        long pendingCount,
        long confirmedCount,
        long deliveredCount,
        long cancelledCount,
        List<DailyPoint> daily,
        List<TopProduct> topProducts
) {
    public record DailyPoint(LocalDate date, double revenue, long orders) {
    }

    public record TopProduct(Long productId, String name, long quantity, double revenue) {
    }
}
