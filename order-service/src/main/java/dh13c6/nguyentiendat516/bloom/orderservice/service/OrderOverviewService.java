package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.OrderOverviewResponse;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderItem;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tinh so lieu tong quan cho trang quan tri.
 *
 * Chuyen tu AdminOverviewService cua ban monolith, bo ba con so tong
 * (san pham / danh muc / khach hang) vi chung thuoc CSDL cua service khac.
 */
@Service
public class OrderOverviewService {

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final int TOP_PRODUCT_LIMIT = 5;

    private final OrderRepository orderRepository;

    public OrderOverviewService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public OrderOverviewResponse getOverview(LocalDate from, LocalDate to) {
        // Mac dinh 30 ngay gan nhat; tu dao lai neu nguoi dung chon nguoc thu tu
        LocalDate end = (to == null) ? LocalDate.now(ZONE) : to;
        LocalDate start = (from == null) ? end.minusDays(29) : from;
        if (start.isAfter(end)) {
            LocalDate swap = start;
            start = end;
            end = swap;
        }

        Instant startInstant = start.atStartOfDay(ZONE).toInstant();
        Instant endInstant = end.plusDays(1).atStartOfDay(ZONE).toInstant();
        List<Order> orders = orderRepository.findByCreatedAtBetween(startInstant, endInstant);

        double revenue = 0;
        double cancelledValue = 0;
        long pending = 0, confirmed = 0, delivered = 0, cancelled = 0;
        long revenueOrderCount = 0;

        // Dien san khung ngay de bieu do khong dut doan o nhung ngay khong co don
        Map<LocalDate, double[]> byDay = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            byDay.put(d, new double[] { 0, 0 });
        }

        Map<Long, long[]> quantityByProduct = new LinkedHashMap<>();
        Map<Long, double[]> revenueByProduct = new LinkedHashMap<>();
        Map<Long, String> nameByProduct = new LinkedHashMap<>();

        for (Order order : orders) {
            double total = order.getTotal() == null ? 0 : order.getTotal();

            switch (order.getStatus()) {
                case PENDING -> pending++;
                case CONFIRMED -> confirmed++;
                case DELIVERED -> delivered++;
                case CANCELLED -> cancelled++;
            }

            if (order.getStatus() == OrderStatus.CANCELLED) {
                cancelledValue += total;
                continue; // don huy khong tinh vao doanh thu, bieu do hay top ban chay
            }

            revenue += total;
            revenueOrderCount++;

            LocalDate day = order.getCreatedAt().atZone(ZONE).toLocalDate();
            double[] slot = byDay.get(day);
            if (slot != null) {
                slot[0] += total;
                slot[1] += 1;
            }

            for (OrderItem item : order.getItems()) {
                Long productId = item.getProductId();
                if (productId == null) continue;
                // Ten lay tu ban da chup trong order_items, khong phai goi sang
                // product-service - nho vay trang nay khong phu thuoc service do.
                nameByProduct.putIfAbsent(productId, item.getProductName());
                quantityByProduct.computeIfAbsent(productId, k -> new long[1])[0] += item.getQuantity();
                revenueByProduct.computeIfAbsent(productId, k -> new double[1])[0] += item.getLineTotal();
            }
        }

        List<OrderOverviewResponse.DailyPoint> daily = new ArrayList<>();
        byDay.forEach((date, slot) ->
                daily.add(new OrderOverviewResponse.DailyPoint(date, round(slot[0]), (long) slot[1])));

        List<OrderOverviewResponse.TopProduct> topProducts = new ArrayList<>();
        quantityByProduct.forEach((productId, qty) -> topProducts.add(
                new OrderOverviewResponse.TopProduct(
                        productId,
                        nameByProduct.get(productId),
                        qty[0],
                        round(revenueByProduct.get(productId)[0]))));
        topProducts.sort(Comparator
                .comparingLong(OrderOverviewResponse.TopProduct::quantity).reversed()
                .thenComparing(OrderOverviewResponse.TopProduct::name));
        List<OrderOverviewResponse.TopProduct> topSlice =
                topProducts.subList(0, Math.min(TOP_PRODUCT_LIMIT, topProducts.size()));

        double average = (revenueOrderCount == 0) ? 0 : revenue / revenueOrderCount;

        return new OrderOverviewResponse(
                start, end,
                round(revenue), round(cancelledValue), round(average),
                orders.size(), pending, confirmed, delivered, cancelled,
                daily, List.copyOf(topSlice));
    }

    /** Lam tron 2 chu so - tranh so tien le kieu 51.500000000000004 khi cong don double. */
    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
