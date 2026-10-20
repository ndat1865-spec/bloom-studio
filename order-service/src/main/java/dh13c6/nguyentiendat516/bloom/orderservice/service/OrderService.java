package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.client.ProductClient;
import dh13c6.nguyentiendat516.bloom.orderservice.client.ProductSnapshot;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.AddonLineRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.CreateOrderRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.OrderLineRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CardType;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.DeliverySlot;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.GiftAddon;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderAddon;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderItem;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentMethod;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.events.OrderEvent;
import dh13c6.nguyentiendat516.bloom.orderservice.events.OrderEventPublisher;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ServiceUnavailableException;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.OrderRepository;
import dh13c6.nguyentiendat516.bloom.orderservice.shipping.ShippingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Nghiep vu don hang.
 *
 * Khac ban monolith o cho quan trong nhat: gia va ton kho khong con doc tu CSDL cua
 * chinh minh nua ma phai goi sang product-service. Doan code nay vi the phai xu ly
 * them nhung tinh huong monolith khong bao gio gap.
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    /** Tien te: VND. Don hang hoa (sau giam gia) tu nguong nay duoc mien phi giao hang. */
    public static final double FREE_DELIVERY_THRESHOLD = 800_000;
    /** Phi giao hang co dinh - chi dung khi CHUA cau hinh GHN. */
    public static final double DELIVERY_FEE = 30_000;

    /** Co bo mac dinh khi client khong gui (client cu, bo hoa khong chia co). */
    private static final String DEFAULT_SIZE = "STANDARD";

    private static final EnumSet<PaymentMethod> ONLINE =
            EnumSet.of(PaymentMethod.VNPAY, PaymentMethod.MOMO, PaymentMethod.ZALOPAY);

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final VoucherService voucherService;
    private final ShippingService shippingService;
    private final OrderEventPublisher events;
    private final DeliveryPolicy deliveryPolicy;
    private final CustomRequestService customRequestService;
    private final MediaStorageService mediaStorageService;

    public OrderService(OrderRepository orderRepository, ProductClient productClient,
                        VoucherService voucherService, ShippingService shippingService,
                        OrderEventPublisher events, DeliveryPolicy deliveryPolicy,
                        CustomRequestService customRequestService, MediaStorageService mediaStorageService) {
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.voucherService = voucherService;
        this.shippingService = shippingService;
        this.events = events;
        this.deliveryPolicy = deliveryPolicy;
        this.customRequestService = customRequestService;
        this.mediaStorageService = mediaStorageService;
    }

    /** Mot dong bo hoa co san sau khi gop: san pham + co bo. */
    private record LineKey(Long productId, String size) {
    }

    /**
     * Dat hang.
     *
     * KHONG dung @Transactional bao ca ham: transaction cua MySQL chi quan duoc cac bang
     * trong bloom_order, no khong the rollback viec da tru ton kho ben product-service.
     * Vi vay phai tu bu tru bang tay - xem khoi catch ben duoi.
     *
     * userId lay tu JWT da xac thuc, KHONG nhan tu body. Ban monolith nhan userId tu
     * client va da tu ghi nhan day la han che cua no.
     */
    public Order createOrder(Long userId, String username, CreateOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("Giỏ hàng đang trống");
        }
        // Kiem tra so bo truoc (qua khu, gio chot, khung gio). So ngay dat truoc cua tung
        // bo hoa chi biet sau khi hoi product-service - kiem tra lan hai ben duoi.
        // Co khung 1 tieng thi buoi giao suy ra tu gio, khong tin timeSlot client gui kem
        DeliverySlot slot = request.deliveryHour() != null
                ? DeliverySlot.ofHour(request.deliveryHour())
                : request.timeSlot();
        deliveryPolicy.validate(request.deliveryDate(), slot, request.deliveryHour(), 0);

        Order order = new Order();
        order.setCode(generateCode());
        order.setCustomerName(request.customerName().trim());
        order.setPhone(request.phone().trim());
        order.setNote(blankToNull(request.note()));
        order.setDeliveryDate(request.deliveryDate());
        order.setTimeSlot(slot);
        order.setDeliveryHour(request.deliveryHour());
        order.setStatus(OrderStatus.PENDING);
        order.setUserId(userId);
        order.setUsername(username);

        // Nguoi tang: chi luu khi khac nguoi nhan (co nhap ten)
        order.setSenderName(blankToNull(request.senderName()));
        order.setSenderPhone(order.getSenderName() == null ? null : blankToNull(request.senderPhone()));
        order.setAnonymousSender(Boolean.TRUE.equals(request.anonymousSender()));

        // Thiep: khong chon thiep thi khong co gi de in loi chuc len
        CardType card = request.cardType() == null ? CardType.NONE : request.cardType();
        order.setCardType(card);
        order.setCardMessage(card == CardType.NONE ? null : blankToNull(request.cardMessage()));

        // Qua kem: gia lay tu enum phia server, client chi gui ma + so luong
        double extras = card.getPrice();
        for (Map.Entry<GiftAddon, Integer> entry : mergeAddons(request.addons()).entrySet()) {
            GiftAddon addon = entry.getKey();
            int quantity = entry.getValue();
            if (quantity > 10) {
                throw new BadRequestException("Số lượng " + addon.getLabel() + " tối đa là 10");
            }
            OrderAddon line = new OrderAddon();
            line.setCode(addon);
            line.setName(addon.getLabel());
            line.setUnitPrice(addon.getPrice());
            line.setQuantity(quantity);
            line.setLineTotal(round2(addon.getPrice() * quantity));
            order.addAddon(line);
            extras += line.getLineTotal();
        }

        Map<LineKey, Integer> lines = mergeLines(request.items());
        List<Long> customIds = customRequestIds(request.items());

        // Thanh toan: truc tuyen thi don cho payment-service bao "da thanh toan"
        PaymentMethod method = request.paymentMethod() == null ? PaymentMethod.COD : request.paymentMethod();
        order.setPaymentMethod(method);
        order.setPaymentStatus(PaymentStatus.UNPAID);

        // Dia chi + phi giao hang: hoi GHN TRUOC khi tru kho - GHN tu choi dia chi thi khong
        // phai hoan kho. Chua cau hinh GHN thi giu cach cu: dia chi go tu do, phi co dinh.
        double shippingFee;
        if (shippingService.enabled()) {
            ShippingService.ResolvedAddress resolved = shippingService.resolve(request.address(),
                    request.provinceId(), request.districtId(), request.wardCode());
            if (!order.getPhone().replaceAll("\\D", "").matches("(0|84)\\d{9}")) {
                throw new BadRequestException("Số điện thoại người nhận phải là số di động Việt Nam 10 chữ số");
            }
            // Hoa tuoi khong gui lien tinh: chi nhan dia chi trong vung giao cua studio
            deliveryPolicy.validateProvince(resolved.provinceId());
            order.setAddress(resolved.fullAddress());
            order.setToProvinceId(resolved.provinceId());
            order.setToDistrictId(resolved.districtId());
            order.setToWardCode(resolved.wardCode());
            int itemCount = lines.values().stream().mapToInt(Integer::intValue).sum() + customIds.size();
            shippingFee = shippingService.quote(resolved.districtId(), resolved.wardCode(), itemCount);
        } else {
            if (request.address().trim().length() < 5) {
                throw new BadRequestException("Địa chỉ cần ít nhất 5 ký tự");
            }
            order.setAddress(request.address().trim());
            shippingFee = DELIVERY_FEE;
        }

        List<Map.Entry<Long, Integer>> daTruKho = new ArrayList<>();
        List<Long> daGiuYeuCau = new ArrayList<>();
        double subtotal = 0.0;
        int leadDays = 0;

        try {
            for (Map.Entry<LineKey, Integer> entry : lines.entrySet()) {
                Long productId = entry.getKey().productId();
                String size = entry.getKey().size();
                int quantity = entry.getValue();

                // Mot loi goi lam ca hai viec: tru ton kho VA lay ve ten, gia tung co, anh.
                // Gia lay tu product-service, khong bao gio tin gia client gui len.
                ProductSnapshot snapshot = productClient.reserveStock(productId, quantity);
                daTruKho.add(Map.entry(productId, quantity));

                ProductSnapshot.SizeOption option = sizeOf(snapshot, size);
                double unitPrice = option.price() == null ? 0.0 : option.price();
                double lineTotal = round2(unitPrice * quantity);
                if (snapshot.leadDays() != null) {
                    leadDays = Math.max(leadDays, snapshot.leadDays());
                }

                OrderItem item = new OrderItem();
                item.setProductId(productId);
                item.setProductName(snapshot.name());
                item.setUnitPrice(round2(unitPrice));
                item.setImageUrl(snapshot.imageUrl());
                item.setQuantity(quantity);
                item.setLineTotal(lineTotal);
                item.setSize(option.code());
                item.setSizeLabel(option.stems() == null
                        ? option.label() : option.label() + " · " + option.stems() + " bông");
                order.addItem(item);

                subtotal += lineTotal;
            }

            // Hoa dat theo yeu cau: gia la gia studio da bao, giu yeu cau de khong dat hai lan
            for (Long requestId : customIds) {
                CustomRequest custom = customRequestService.claim(requestId, userId);
                daGiuYeuCau.add(requestId);

                OrderItem item = new OrderItem();
                item.setCustomRequestId(requestId);
                item.setProductName("Hoa theo yêu cầu " + custom.getCode());
                item.setUnitPrice(custom.getQuotedPrice());
                item.setImageUrl(custom.getReferenceImageUrl());
                item.setQuantity(1);
                item.setLineTotal(custom.getQuotedPrice());
                item.setSizeLabel(customLineLabel(custom));
                order.addItem(item);

                subtotal += custom.getQuotedPrice();
                // Studio can it nhat mot ngay de nhap hoa cho bo lam rieng
                leadDays = Math.max(leadDays, 1);
            }

            // Hoa cuoi, hoa su kien can dat truoc nhieu ngay - nem loi thi khoi catch hoan kho
            if (leadDays > 0) {
                deliveryPolicy.validate(request.deliveryDate(), slot, request.deliveryHour(), leadDays);
            }

            // Cach tinh tien (giong het phan xem truoc o trang thanh toan):
            //   hang hoa   = tien hoa + qua kem + phi thiep
            //   giam gia   = theo ma, tinh tren hang hoa
            //   phi ship   = mien phi neu (hang hoa - giam gia) >= nguong, khong thi theo GHN
            //   tong cong  = hang hoa - giam gia + phi ship
            double roundedSubtotal = round2(subtotal);
            double roundedExtras = round2(extras);
            double merchandise = round2(roundedSubtotal + roundedExtras);

            // Kiem tra ma SAU khi tru kho vi phai co gia that moi biet don dat toi thieu chua.
            // Ma khong hop le -> nem loi -> khoi catch ben duoi hoan lai ton kho.
            VoucherService.Quote quote = null;
            String voucherCode = blankToNull(request.voucherCode());
            if (voucherCode != null) {
                quote = voucherService.evaluate(voucherCode, merchandise, userId);
                order.setVoucherCode(quote.voucher().getCode());
            }
            double discount = quote == null ? 0.0 : quote.discount();

            double afterDiscount = round2(merchandise - discount);
            double fee = afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0.0 : shippingFee;
            order.setSubtotal(roundedSubtotal);
            order.setExtrasTotal(roundedExtras);
            order.setDiscount(discount);
            order.setDeliveryFee(fee);
            order.setTotal(round2(afterDiscount + fee));

            // Luu don + ghi nhan luot dung ma trong cung mot transaction
            Order saved = voucherService.saveWithVoucher(order, quote, userId);
            customRequestService.attachOrder(saved);
            events.publish(OrderEvent.Type.PLACED, saved);
            return saved;

        } catch (RuntimeException ex) {
            // BU TRU: mot dong loi thi phai tra lai ton kho cho nhung dong da tru truoc do,
            // neu khong kho hang se hao dan sau moi don dat that bai giua chung.
            hoanTraTonKho(daTruKho);
            daGiuYeuCau.forEach(customRequestService::release);
            throw ex;
        }
    }

    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn hàng id = " + id));
    }

    public Page<Order> getOrders(Pageable pageable) {
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    /**
     * Danh sach don cho quan tri, co loc. statuses rong = moi trang thai; q tim theo ma don,
     * nguoi nhan, SDT, tai khoan, nguoi tang (khong phan biet hoa thuong).
     */
    public Page<Order> searchOrders(java.util.Set<OrderStatus> statuses, java.time.LocalDate deliveryDate,
                                    String q, Pageable pageable) {
        String keyword = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase(java.util.Locale.ROOT) + "%";
        boolean anyStatus = statuses == null || statuses.isEmpty();
        // Danh sach IN khong duoc rong ke ca khi anyStatus = true
        java.util.Collection<OrderStatus> in = anyStatus ? List.of(OrderStatus.PENDING) : statuses;
        return orderRepository.search(anyStatus, in, deliveryDate, keyword, pageable);
    }

    /** So don moi trang thai + so don con phai giao hom nay (gio Viet Nam). */
    public java.util.Map<String, Long> statusCounts() {
        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) {
            counts.put(s.name(), 0L);
        }
        for (Object[] row : orderRepository.countGroupByStatus()) {
            counts.put(((OrderStatus) row[0]).name(), (Long) row[1]);
        }
        counts.put("DUE_TODAY", orderRepository.countOpenForDelivery(deliveryPolicy.today(),
                List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED)));
        return counts;
    }

    public Page<Order> getOrdersByUser(Long userId, Pageable pageable) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * ADMIN / nhan vien doi trang thai don.
     *
     * Chuyen sang CANCELLED di qua cancel() de hoan ton kho va tra luot ma giam gia -
     * truoc day chi doi chu tren don, ton kho mat han. Don da huy thi khong mo lai duoc:
     * ton kho da tra ve, mo lai ma khong tru kho lan nua la ban khong co hang.
     *
     * Con lai chi di TOI theo PENDING -> CONFIRMED -> PREPARING -> SHIPPING -> DELIVERED,
     * duoc nhay coc. Lui lai (vd. da giao -> dang giao) se lam sai email da gui khach va
     * tien COD da ghi nhan, nen chan.
     */
    public Order updateStatus(Long id, OrderStatus status) {
        Order order = getOrderById(id);
        if (status == OrderStatus.CANCELLED) {
            return cancel(id);
        }
        OrderStatus current = order.getStatus();
        if (current == OrderStatus.CANCELLED) {
            throw new ConflictException("Đơn đã huỷ và đã hoàn tồn kho, không mở lại được. Hãy tạo đơn mới");
        }
        if (current == status) {
            return order;
        }
        if (current == OrderStatus.DELIVERED) {
            throw new ConflictException("Đơn đã giao xong, không đổi trạng thái được nữa");
        }
        // Dang co van don GHN: buoc "dang giao / da giao" do GHN bao (webhook, nut cap nhat).
        // Tu danh dau tay se lech voi van don - don "da giao" ma GHN van "cho lay hang".
        if (hasActiveShipment(order)
                && (status == OrderStatus.SHIPPING || status == OrderStatus.DELIVERED)) {
            throw new ConflictException("Đơn đang giao qua Giao Hàng Nhanh (vận đơn " + order.getGhnOrderCode()
                    + "): trạng thái giao được cập nhật từ GHN. Bấm \"Cập nhật từ GHN\", hoặc huỷ vận đơn "
                    + "nếu studio tự giao");
        }
        if (status.ordinal() < current.ordinal()) {
            throw new ConflictException("Không lùi trạng thái đơn từ \"" + current.getLabel() + "\" về \""
                    + status.getLabel() + "\"");
        }
        // Don tra truc tuyen chua nhan tien thi chua bo hoa, chua giao
        if (status.ordinal() > OrderStatus.CONFIRMED.ordinal()
                && order.effectivePaymentMethod().isOnline()
                && order.effectivePaymentStatus() != PaymentStatus.PAID) {
            throw new ConflictException("Đơn thanh toán trực tuyến chưa trả tiền, chưa chuẩn bị hay giao được");
        }
        return advance(order, status);
    }

    /** Dua don toi trang thai moi, ghi nhan COD khi giao xong, phat su kien DELIVERED. */
    private Order advance(Order order, OrderStatus status) {
        boolean justDelivered = status == OrderStatus.DELIVERED && order.getStatus() != OrderStatus.DELIVERED;
        order.moveTo(status);
        markCodCollected(order);
        Order saved = orderRepository.save(order);
        if (justDelivered) {
            events.publish(OrderEvent.Type.DELIVERED, saved);
        }
        return saved;
    }

    /**
     * Huy don: huy van don GHN (neu co), hoan tra ton kho va luot dung ma giam gia, roi moi
     * doi trang thai. Don da thanh toan truc tuyen chuyen sang "cho hoan tien".
     */
    public Order cancel(Long id) {
        Order order = getOrderById(id);
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ConflictException("Đơn hàng này đã bị huỷ trước đó");
        }
        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new ConflictException("Đơn hàng đã giao thì không huỷ được");
        }
        if (order.getStatus() == OrderStatus.SHIPPING) {
            throw new ConflictException("Hoa đã rời cửa hàng, đang giao thì không huỷ được. "
                    + "Nếu khách từ chối nhận, chờ GHN trả hàng rồi xử lý");
        }
        // GHN chi cho huy khi chua lay hang; da lay roi thi GhnException -> 409, don giu nguyen
        if (order.getGhnOrderCode() != null && !"cancel".equals(order.getShippingStatus())) {
            shippingService.cancelShipment(order.getGhnOrderCode());
            order.setShippingStatus("cancel");
            order.setShippingUpdatedAt(Instant.now());
            orderRepository.save(order);
        }
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() != null) {
                productClient.releaseStock(item.getProductId(), item.getQuantity());
            }
        }
        voucherService.releaseFor(order);
        customRequestService.releaseFor(order);
        if (orderRepository.claimCancel(id,
                EnumSet.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING),
                OrderStatus.CANCELLED, Instant.now()) == 0) {
            log.error("Đơn {} đổi trạng thái giữa lúc huỷ - tồn kho đã hoàn, cần đối soát", order.getCode());
            throw new ConflictException("Đơn vừa được cập nhật ở nơi khác, tải lại trang rồi thử lại");
        }
        // Tien da vao tai khoan cua hang (ke ca khi payment-service vua bao trong luc huy)
        orderRepository.markRefundPending(id, PaymentStatus.PAID, PaymentStatus.REFUND_PENDING);
        Order cancelled = getOrderById(id);
        events.publish(OrderEvent.Type.CANCELLED, cancelled);
        return cancelled;
    }

    // ===================== THANH TOAN (payment-service goi) =====================

    /**
     * Ghi nhan don da duoc thanh toan truc tuyen.
     *
     * Idempotent: cung mot txnRef bao nhieu lan cung chi ghi mot lan. Tu choi (409) khi don
     * da huy, da tra bang giao dich khac, hoac so tien lech - payment-service se danh dau
     * giao dich do can hoan tien.
     */
    public Order markPaid(Long id, PaymentMethod method, String txnRef, long amount) {
        if (method == null || !method.isOnline()) {
            throw new BadRequestException("Cổng thanh toán không hợp lệ");
        }
        Order order = getOrderById(id);
        if (txnRef.equals(order.getPaymentRef())) {
            return order;
        }
        if (Math.round(order.getTotal()) != amount) {
            throw new ConflictException("Số tiền thanh toán (" + amount + "đ) không khớp tổng đơn "
                    + order.getCode() + " (" + Math.round(order.getTotal()) + "đ)");
        }
        if (orderRepository.markPaidIfOpen(id, method, txnRef, Instant.now(), PaymentStatus.PAID,
                PaymentStatus.UNPAID, OrderStatus.CANCELLED) == 0) {
            Order now = getOrderById(id);
            if (txnRef.equals(now.getPaymentRef())) {
                return now;
            }
            if (now.getStatus() == OrderStatus.CANCELLED) {
                throw new ConflictException("Đơn " + now.getCode() + " đã bị huỷ");
            }
            throw new ConflictException("Đơn " + now.getCode() + " đã được thanh toán bằng giao dịch khác");
        }
        log.info("Đơn {} đã thanh toán qua {} (giao dịch {})", order.getCode(), method, txnRef);
        Order paid = getOrderById(id);
        events.publish(OrderEvent.Type.PAID, paid);
        return paid;
    }

    /**
     * payment-service bao da hoan tien. Chi don "cho hoan tien" va dung giao dich da tra don
     * moi chuyen "da hoan"; giao dich du (khach tra hai lan) thi don giu nguyen.
     */
    public Order markRefunded(Long id, String txnRef) {
        Order order = getOrderById(id);
        if (orderRepository.markRefunded(id, txnRef, PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED) > 0) {
            log.info("Đơn {} đã được hoàn tiền (giao dịch {})", order.getCode(), txnRef);
            Order refunded = getOrderById(id);
            events.publish(OrderEvent.Type.REFUNDED, refunded);
            return refunded;
        }
        return order;
    }

    /**
     * Tu huy don thanh toan truc tuyen qua han ma chua tra tien, de tra ton kho cho khach khac.
     *
     * Thu tu nguoc voi cancel(): GIANH trang thai truoc (chi thanh cong khi van chua thanh
     * toan), roi moi hoan kho. Lam nguoc lai thi co the hoan kho cho mot don vua duoc tra tien.
     */
    public int cancelExpiredUnpaid(Instant createdBefore) {
        int count = 0;
        for (Order order : orderRepository.findByStatusAndPaymentMethodInAndCreatedAtBefore(
                OrderStatus.PENDING, ONLINE, createdBefore)) {
            if (orderRepository.claimCancelUnpaid(order.getId(), OrderStatus.PENDING, PaymentStatus.UNPAID,
                    OrderStatus.CANCELLED, Instant.now()) == 0) {
                continue;
            }
            List<Map.Entry<Long, Integer>> lines = new ArrayList<>();
            for (OrderItem item : order.getItems()) {
                if (item.getProductId() != null) {
                    lines.add(Map.entry(item.getProductId(), item.getQuantity()));
                }
            }
            hoanTraTonKho(lines);
            voucherService.releaseFor(order);
            customRequestService.releaseFor(order);
            log.info("Tự huỷ đơn {} vì quá hạn thanh toán {}", order.getCode(), order.getPaymentMethod());
            events.publish(OrderEvent.Type.CANCELLED, getOrderById(order.getId()));
            count++;
        }
        return count;
    }

    // ===================== ANH BO HOA THANH PHAM =====================

    /**
     * Cua hang tai anh bo hoa da cam xong. Don chua o buoc "Dang cam hoa" thi keo toi buoc
     * do (co anh nghia la hoa dang duoc lam). Tai lai anh khac thi thay anh cu - vd. khach
     * nhan xet, tho sua lai bo hoa. Moi lan tai deu bao khach qua email.
     */
    public Order uploadArrangementPhoto(Long id, MultipartFile file) {
        Order order = getOrderById(id);
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) {
            throw new ConflictException("Đơn đã huỷ hoặc đã giao, không tải ảnh hoa được nữa");
        }
        if (order.effectivePaymentMethod().isOnline() && order.effectivePaymentStatus() != PaymentStatus.PAID) {
            throw new ConflictException("Đơn thanh toán trực tuyến chưa trả tiền, chưa cắm hoa được");
        }
        order.setArrangementPhotoUrl(mediaStorageService.store(file, "arrangements"));
        order.setArrangementPhotoAt(Instant.now());
        if (order.getStatus().ordinal() < OrderStatus.PREPARING.ordinal()) {
            order.moveTo(OrderStatus.PREPARING);
        }
        Order saved = orderRepository.save(order);
        log.info("Đã tải ảnh hoa thành phẩm cho đơn {}", saved.getCode());
        events.publish(OrderEvent.Type.ARRANGED, saved);
        return saved;
    }

    // ===================== GIAO HANG GHN =====================

    /**
     * ADMIN tao van don GHN. Don thanh toan truc tuyen phai tra tien xong moi giao; don COD
     * thi shipper thu ho toan bo tong tien.
     */
    public Order createShipment(Long id) {
        if (!shippingService.enabled()) {
            throw new ServiceUnavailableException("Chưa cấu hình Giao Hàng Nhanh (GHN_TOKEN, GHN_SHOP_ID)");
        }
        Order order = getOrderById(id);
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) {
            throw new ConflictException("Đơn đã huỷ hoặc đã giao, không tạo vận đơn được");
        }
        if (order.getStatus() == OrderStatus.SHIPPING) {
            throw new ConflictException("Đơn đã được đánh dấu đang giao (cửa hàng tự giao), không tạo vận đơn GHN nữa");
        }
        if (order.getGhnOrderCode() != null && !"cancel".equals(order.getShippingStatus())) {
            throw new ConflictException("Đơn đã có vận đơn GHN " + order.getGhnOrderCode());
        }
        if (order.getToDistrictId() == null || order.getToWardCode() == null) {
            throw new ConflictException("Đơn này nhập địa chỉ tự do (trước khi dùng GHN), không tạo vận đơn GHN được");
        }
        PaymentStatus paid = order.effectivePaymentStatus();
        if (order.effectivePaymentMethod().isOnline() && paid != PaymentStatus.PAID) {
            throw new ConflictException("Đơn thanh toán trực tuyến chưa trả tiền, chưa giao được");
        }

        ShippingService.Shipment shipment = shippingService.createShipment(order, paid != PaymentStatus.PAID);
        Instant now = Instant.now();
        order.setGhnOrderCode(shipment.orderCode());
        order.setShippingStatus("ready_to_pick");
        order.setExpectedDeliveryAt(shipment.expectedDeliveryAt());
        order.setShippingUpdatedAt(now);
        order.setGhnFee(shipment.fee());
        order.setCodAmount(shipment.codAmount());
        order.setShippingWeight(shipment.weight());
        // Van don tao lai sau khi huy: hanh trinh cu van giu, noi them moc moi
        order.setShippingLog(ShippingService.encodeLog(ShippingService.mergeLog(
                ShippingService.decodeLog(order.getShippingLog()),
                List.of(new ShippingService.TrackingEvent("ready_to_pick", now)))));
        // Co van don = hoa dang duoc dong goi cho shipper toi lay
        if (order.getStatus().ordinal() < OrderStatus.PREPARING.ordinal()) {
            order.moveTo(OrderStatus.PREPARING);
        }
        log.info("Đã tạo vận đơn GHN {} cho đơn {}", shipment.orderCode(), order.getCode());
        Order shipped = orderRepository.save(order);
        events.publish(OrderEvent.Type.SHIPPED, shipped);
        return shipped;
    }

    /**
     * Huy van don GHN de studio tu giao (hoac don lo danh dau giao tay truoc khi co chan).
     * GHN chi cho huy khi chua lay hang - da lay thi GhnException -> 409. Trang thai don giu
     * nguyen; sau khi huy, nhan vien tu chuyen "dang giao" / "da giao" nhu don tu giao.
     */
    public Order cancelShipment(Long id) {
        Order order = getOrderById(id);
        if (!hasActiveShipment(order)) {
            throw new ConflictException("Đơn không có vận đơn GHN nào đang hoạt động");
        }
        shippingService.cancelShipment(order.getGhnOrderCode());
        Instant now = Instant.now();
        order.setShippingStatus("cancel");
        order.setShippingUpdatedAt(now);
        order.setShippingLog(ShippingService.encodeLog(ShippingService.mergeLog(
                ShippingService.decodeLog(order.getShippingLog()),
                List.of(new ShippingService.TrackingEvent("cancel", now)))));
        log.info("Đã huỷ vận đơn GHN {} của đơn {}", order.getGhnOrderCode(), order.getCode());
        return orderRepository.save(order);
    }

    /**
     * CHI MOI TRUONG THU: gia lap shipper GHN (lay hang / dang giao / da giao) vi sandbox cua
     * GHN khong co shipper that. Di dung duong cua webhook that: ghi hanh trinh roi keo trang
     * thai don (giao xong -> ghi nhan COD, gui email "da giao").
     */
    public Order simulateShipment(Long id, String ghnStatus) {
        if (!shippingService.sandbox()) {
            throw new ConflictException("Chỉ giả lập được khi dùng môi trường thử của GHN");
        }
        if (!List.of("picked", "delivering", "delivered").contains(ghnStatus)) {
            throw new BadRequestException("Trạng thái giả lập không hợp lệ");
        }
        Order order = getOrderById(id);
        if (!hasActiveShipment(order)) {
            throw new ConflictException("Đơn không có vận đơn GHN nào đang hoạt động");
        }
        if (ShippingService.progressRank(ghnStatus) <= ShippingService.progressRank(order.getShippingStatus())) {
            throw new ConflictException("Vận đơn đã ở bước \"" + ShippingService.label(order.getShippingStatus())
                    + "\", không lùi về \"" + ShippingService.label(ghnStatus) + "\"");
        }
        Instant now = Instant.now();
        order.setShippingStatus(ghnStatus);
        order.setShippingUpdatedAt(now);
        order.setShippingLog(ShippingService.encodeLog(ShippingService.mergeLog(
                ShippingService.decodeLog(order.getShippingLog()),
                List.of(new ShippingService.TrackingEvent(ghnStatus, now)))));
        log.info("[GHN sandbox] Giả lập vận đơn {} của đơn {} -> {}", order.getGhnOrderCode(), order.getCode(), ghnStatus);

        OrderStatus target = ShippingService.stageOf(ghnStatus);
        if (target != null && !order.getStatus().isFinal() && target.ordinal() > order.getStatus().ordinal()) {
            return advance(order, target);
        }
        return orderRepository.save(order);
    }

    /** Nhan phu cua dong hoa lam rieng tren don: "Gio hoa · Sinh nhat" (cot size_label 60 ky tu). */
    private static String customLineLabel(CustomRequest custom) {
        String label = java.util.stream.Stream.of(custom.getArrangement(), custom.getOccasion())
                .filter(s -> s != null && !s.isBlank())
                .collect(java.util.stream.Collectors.joining(" · "));
        if (label.isEmpty()) {
            return null;
        }
        return label.length() <= 60 ? label : label.substring(0, 60);
    }

    private static boolean regresses(String current, String next) {
        int from = ShippingService.progressRank(current);
        int to = ShippingService.progressRank(next);
        return from >= 0 && to >= 0 && to < from;
    }

    /** Co van don GHN chua huy. */
    private static boolean hasActiveShipment(Order order) {
        return order.getGhnOrderCode() != null && !"cancel".equals(order.getShippingStatus());
    }

    /**
     * Hoi GHN trang thai van don, luu hanh trinh, roi keo trang thai don theo:
     * cho lay hang -> Dang chuan bi, da lay / dang giao -> Dang giao, da giao -> Da giao
     * (don COD coi nhu da thu tien). Chi keo TOI, khong keo lui: nhan vien da tu danh dau
     * "dang giao" thi GHN bao "cho lay" cung khong lui lai.
     */
    public Order refreshShipment(Long id) {
        Order order = getOrderById(id);
        if (order.getGhnOrderCode() == null) {
            throw new ConflictException("Đơn chưa có vận đơn GHN");
        }
        Map<String, Object> detail = shippingService.detail(order.getGhnOrderCode());
        Instant now = Instant.now();
        Object status = detail.get("status");
        // Chi di toi: trang thai GHN bao cu hon trang thai dang luu (vd. sandbox bao "cho lay hang"
        // sau khi da gia lap "da giao") thi giu nguyen
        if (status != null && !regresses(order.getShippingStatus(), String.valueOf(status))) {
            order.setShippingStatus(String.valueOf(status));
        }
        Instant leadtime = parseInstant(detail.get("leadtime"));
        if (leadtime != null) {
            order.setExpectedDeliveryAt(leadtime);
        }
        Integer weight = ShippingService.chargeableWeight(detail);
        if (weight != null) {
            order.setShippingWeight(weight);
        }
        if (detail.get("cod_amount") instanceof Number cod) {
            order.setCodAmount(cod.longValue());
        }

        // Hanh trinh: moc GHN tra ve + moc hien tai (GHN chi tra "log" sau lan doi dau tien)
        List<ShippingService.TrackingEvent> known = ShippingService.decodeLog(order.getShippingLog());
        List<ShippingService.TrackingEvent> fresh = new ArrayList<>(ShippingService.trackingEvents(detail));
        String current = order.getShippingStatus();
        String lastLogged = !fresh.isEmpty() ? fresh.get(fresh.size() - 1).status()
                : known.isEmpty() ? null : known.get(known.size() - 1).status();
        if (current != null && !current.equals(lastLogged)) {
            Instant at = parseInstant(detail.get("updated_date"));
            fresh.add(new ShippingService.TrackingEvent(current, at == null ? now : at));
        }
        order.setShippingLog(ShippingService.encodeLog(ShippingService.mergeLog(known, fresh)));
        order.setShippingUpdatedAt(now);

        OrderStatus target = ShippingService.stageOf(current);
        if (target != null && !order.getStatus().isFinal() && target.ordinal() > order.getStatus().ordinal()) {
            return advance(order, target);
        }
        return orderRepository.save(order);
    }

    /** Webhook GHN: KHONG tin noi dung GHN gui, chi lay ma van don roi tu hoi lai GHN. */
    public void refreshShipmentByCode(String ghnOrderCode) {
        orderRepository.findByGhnOrderCode(ghnOrderCode).ifPresent(order -> refreshShipment(order.getId()));
    }

    /**
     * Cho product-service hoi truoc khi cho danh gia: user nay da NHAN duoc san pham
     * nay chua (co don DELIVERED chua san pham do).
     */
    public boolean hasDeliveredPurchase(Long userId, Long productId) {
        return orderRepository.existsDeliveredPurchase(userId, productId, OrderStatus.DELIVERED);
    }

    // ===================== HO TRO =====================

    /** Don COD giao xong = shipper da thu tien. */
    private void markCodCollected(Order order) {
        if (order.getStatus() == OrderStatus.DELIVERED
                && order.effectivePaymentMethod() == PaymentMethod.COD
                && order.getPaymentStatus() != PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setPaidAt(Instant.now());
        }
    }

    private static Instant parseInstant(Object value) {
        try {
            return value == null ? null : Instant.parse(String.valueOf(value));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private void hoanTraTonKho(List<Map.Entry<Long, Integer>> daTruKho) {
        for (Map.Entry<Long, Integer> e : daTruKho) {
            try {
                productClient.releaseStock(e.getKey(), e.getValue());
            } catch (RuntimeException ignored) {
                // Chi ghi log, khong nem tiep: nem o day se che mat loi goc khien nguoi
                // dung nhan duoc thong bao sai.
                // GIOI HAN DA BIET: luc nay ton kho bi lech, phai doi soat lai bang tay.
                // Cach lam dung trong thuc te la Saga pattern hoac hang doi bu tru.
                log.error("Hoàn trả tồn kho thất bại cho sản phẩm id = {}, số lượng {}",
                        e.getKey(), e.getValue());
            }
        }
    }

    /** Gop cac dong qua kem trung ma lai, so luong cong don. */
    private Map<GiftAddon, Integer> mergeAddons(List<AddonLineRequest> addons) {
        Map<GiftAddon, Integer> merged = new LinkedHashMap<>();
        if (addons != null) {
            for (AddonLineRequest line : addons) {
                merged.merge(line.code(), line.quantity(), Integer::sum);
            }
        }
        return merged;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /**
     * Gop cac dong bo hoa trung (san pham, co bo) lai, so luong cong don.
     * Co bo de trong = Tieu chuan. Dong hoa theo yeu cau di rieng (customRequestIds).
     */
    private Map<LineKey, Integer> mergeLines(Iterable<OrderLineRequest> lines) {
        Map<LineKey, Integer> merged = new LinkedHashMap<>();
        for (OrderLineRequest line : lines) {
            boolean hasProduct = line.productId() != null;
            boolean hasRequest = line.customRequestId() != null;
            if (hasProduct == hasRequest) {
                throw new BadRequestException("Mỗi dòng giỏ hàng là một bó hoa hoặc một yêu cầu đặt hoa");
            }
            if (hasProduct) {
                String size = line.size() == null || line.size().isBlank()
                        ? DEFAULT_SIZE : line.size().trim().toUpperCase();
                merged.merge(new LineKey(line.productId(), size), line.quantity(), Integer::sum);
            }
        }
        return merged;
    }

    /** Id cac yeu cau dat hoa trong gio, khong trung. Moi yeu cau la MOT bo hoa. */
    private static List<Long> customRequestIds(List<OrderLineRequest> lines) {
        return lines.stream()
                .map(OrderLineRequest::customRequestId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    /**
     * Chon co bo khach dat trong danh sach product-service tra ve. product-service ban cu
     * (chua co sizes) thi chi nhan co Tieu chuan voi gia goc.
     */
    private static ProductSnapshot.SizeOption sizeOf(ProductSnapshot snapshot, String size) {
        if (snapshot.sizes() == null || snapshot.sizes().isEmpty()) {
            if (!DEFAULT_SIZE.equals(size)) {
                throw new BadRequestException(snapshot.name() + " chỉ có một cỡ");
            }
            return new ProductSnapshot.SizeOption(DEFAULT_SIZE, "Tiêu chuẩn", null, snapshot.price());
        }
        return snapshot.sizes().stream()
                .filter(o -> size.equals(o.code()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException(snapshot.name() + " không có cỡ bó này"));
    }

    private String generateCode() {
        return "BLM" + System.currentTimeMillis() + ThreadLocalRandom.current().nextInt(100, 1000);
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
