package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.*;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.orderservice.service.DeliveryPolicy;
import dh13c6.nguyentiendat516.bloom.orderservice.service.OrderOverviewService;
import dh13c6.nguyentiendat516.bloom.orderservice.service.OrderService;
import dh13c6.nguyentiendat516.bloom.orderservice.shipping.ShippingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

/**
 * Don hang.
 *
 * userId LUON lay tu JWT da xac thuc, khong bao gio nhan tu body hay query param.
 * Chi tiet mot don con kiem tra nguoi goi dung la chu don - neu khong, khach A chi
 * can doi so tren URL la doc duoc don cua khach B (lo hong IDOR).
 */
@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderOverviewService orderOverviewService;
    private final ShippingService shippingService;
    private final DeliveryPolicy deliveryPolicy;

    public OrderController(OrderService orderService,
                           OrderOverviewService orderOverviewService,
                           ShippingService shippingService,
                           DeliveryPolicy deliveryPolicy) {
        this.orderService = orderService;
        this.orderOverviewService = orderOverviewService;
        this.shippingService = shippingService;
        this.deliveryPolicy = deliveryPolicy;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(Authentication authentication,
                                @Valid @RequestBody CreateOrderRequest request) {
        return OrderResponse.from(orderService.createOrder(
                currentUserId(authentication), authentication.getName(), request));
    }

    /** Loai thiep, qua kem, khung gio, phi ship - ai cung xem duoc (khai o SecurityConfig). */
    @GetMapping("/options")
    public OrderOptionsResponse options() {
        return OrderOptionsResponse.current(shippingService.enabled(), shippingService.sandbox(), deliveryPolicy);
    }

    /** Don cua chinh toi. */
    @GetMapping("/my")
    public PageResponse<OrderResponse> myOrders(Authentication authentication, Pageable pageable) {
        Page<Order> page = orderService.getOrdersByUser(currentUserId(authentication), pageable);
        return PageResponse.from(page, OrderResponse::from);
    }

    /**
     * So lieu tong quan - chi ADMIN, khai o SecurityConfig.
     *
     * Chi tra phan order-service tu tinh duoc. Ba con so tong san pham / danh muc /
     * khach hang do frontend goi rieng tung service roi ghep lai, vi chung thuoc
     * CSDL ma service nay khong duoc phep doc.
     */
    @GetMapping("/overview")
    public OrderOverviewResponse overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return orderOverviewService.getOverview(from, to);
    }

    /**
     * Toan bo don - ADMIN / nhan vien, khai o SecurityConfig. Loc tuy chon:
     * status=PENDING,CONFIRMED (nhieu gia tri cach dau phay), q=tu khoa (ma don, nguoi nhan,
     * SDT, tai khoan, nguoi tang), deliveryDate=yyyy-MM-dd.
     */
    @GetMapping
    public PageResponse<OrderResponse> getAll(
            @RequestParam(required = false) java.util.Set<OrderStatus> status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate,
            Pageable pageable) {
        return PageResponse.from(orderService.searchOrders(status, deliveryDate, q, pageable), OrderResponse::from);
    }

    /** So don moi trang thai + DUE_TODAY (con phai giao hom nay) - cho the loc trang quan tri. */
    @GetMapping("/status-counts")
    public java.util.Map<String, Long> statusCounts() {
        return orderService.statusCounts();
    }

    @GetMapping("/{id}")
    public OrderResponse getById(Authentication authentication, @PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        requireOwnerOrAdmin(authentication, order);
        return OrderResponse.from(order);
    }

    /** Doi trang thai - chi ADMIN, khai o SecurityConfig. */
    @PutMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable Long id,
                                      @Valid @RequestBody UpdateOrderStatusRequest request) {
        return OrderResponse.from(orderService.updateStatus(id, request.status()));
    }

    @DeleteMapping("/{id}")
    public OrderResponse cancel(Authentication authentication, @PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        requireOwnerOrAdmin(authentication, order);
        // Khach chi tu huy khi cua hang chua bat tay bo hoa; tu luc do phai lien he cua hang
        if (!isAdmin(authentication)
                && order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new ConflictException("Cửa hàng đã bắt đầu chuẩn bị hoa, bạn liên hệ cửa hàng để huỷ đơn nhé");
        }
        return OrderResponse.from(orderService.cancel(id));
    }

    /**
     * Tai anh bo hoa thanh pham cho khach xem truoc khi giao - ADMIN / nhan vien, khai o
     * SecurityConfig. Multipart, truong "file".
     */
    @PostMapping("/{id}/arrangement-photo")
    public OrderResponse uploadArrangementPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return OrderResponse.from(orderService.uploadArrangementPhoto(id, file));
    }

    /** Tao van don GHN - chi ADMIN, khai o SecurityConfig. */
    @PostMapping("/{id}/shipment")
    public OrderResponse createShipment(@PathVariable Long id) {
        return OrderResponse.from(orderService.createShipment(id));
    }

    public record SimulateShipmentRequest(@jakarta.validation.constraints.NotBlank String status) {
    }

    /**
     * CHI MOI TRUONG THU GHN: gia lap shipper (picked / delivering / delivered) vi sandbox
     * khong co shipper that - ADMIN / nhan vien, khai o SecurityConfig.
     */
    @PostMapping("/{id}/shipment/simulate")
    public OrderResponse simulateShipment(@PathVariable Long id, @Valid @RequestBody SimulateShipmentRequest body) {
        return OrderResponse.from(orderService.simulateShipment(id, body.status()));
    }

    /** Huy van don GHN (studio tu giao) - ADMIN / nhan vien, khai o SecurityConfig. */
    @PostMapping("/{id}/shipment/cancel")
    public OrderResponse cancelShipment(@PathVariable Long id) {
        return OrderResponse.from(orderService.cancelShipment(id));
    }

    /** Hoi GHN trang thai van don moi nhat - chu don hoac ADMIN. */
    @PostMapping("/{id}/shipment/refresh")
    public OrderResponse refreshShipment(Authentication authentication, @PathVariable Long id) {
        requireOwnerOrAdmin(authentication, orderService.getOrderById(id));
        return OrderResponse.from(orderService.refreshShipment(id));
    }

    // ===================== HO TRO =====================

    /** JwtAuthFilter dat userId vao o credentials cua Authentication. */
    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }

    /** ADMIN hoac nhan vien: xem va xu ly moi don. */
    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_STAFF".equals(a.getAuthority()));
    }

    /**
     * Tra 404 chu khong phai 403 khi khong phai chu don: bao 403 la vo tinh xac nhan
     * don hang do co that, giup ke to mo do duoc so luong don cua he thong.
     */
    private void requireOwnerOrAdmin(Authentication authentication, Order order) {
        if (isAdmin(authentication)) {
            return;
        }
        Long userId = currentUserId(authentication);
        if (order.getUserId() == null || !order.getUserId().equals(userId)) {
            throw new NotFoundException("Không tìm thấy đơn hàng id = " + order.getId());
        }
    }
}
