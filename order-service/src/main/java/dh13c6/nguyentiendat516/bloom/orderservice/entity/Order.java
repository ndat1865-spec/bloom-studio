package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Don hang — PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Bang "orders" la bang moi, khong sua doi products / categories / users.
 * Moi con so tien deu do tang Service tinh lai tu bang products, khong tin gia client gui len.
 *
 * DynamicUpdate: chi UPDATE cac cot thuc su doi. Khong co no, ADMIN doi trang thai tu mot
 * ban doc cu se ghi de ca cot payment_status ma payment-service vua bao "da thanh toan".
 */
@Entity
@Table(name = "orders")
@DynamicUpdate
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ma don hien thi cho khach, vi du BS-8F3A21C7. */
    @Column(name = "code", nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "subtotal", nullable = false)
    private Double subtotal;

    @Column(name = "delivery_fee", nullable = false)
    private Double deliveryFee;

    @Column(name = "total", nullable = false)
    private Double total;

    @Enumerated(EnumType.STRING)
    // varchar chu khong de Hibernate tao ENUM cua MySQL: xem config/SchemaUpgrade
    @Column(name = "status", nullable = false, columnDefinition = "varchar(20)")
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /**
     * Chu don hang. Null khi khach chua dang nhap - khach vang lai van dat hang duoc.
     *
     * KHONG con @ManyToOne User: sau khi tach service, du lieu tai khoan nam o DB cua
     * auth-service nen khong the co khoa ngoai that. Chi luu id dang so; ten va so dien
     * thoai nguoi nhan da duoc chup lai vao chinh don hang o cac truong ben tren.
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * Ten tai khoan dat don, CHUP LAI tu claim "sub" cua JWT tai thoi diem dat hang.
     *
     * Vi sao chup lai thay vi goi sang auth-service moi lan hien danh sach don: trang
     * quan tri liet ke 20 don mot trang, neu tra cuu tung don se thanh 20 loi goi mang.
     * Chup lai cung dung ve nghiep vu - doi tai khoan sau nay khong duoc lam doi lich su don cu.
     */
    @Column(name = "username", length = 100)
    private String username;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    // ===================== PHAN MO RONG: qua tang =====================

    /**
     * Nguoi DAT hoa (nguoi tang). customerName / phone o tren la NGUOI NHAN.
     * Null = nguoi dat cung la nguoi nhan (tu mua cho minh).
     */
    @Column(name = "sender_name", length = 100)
    private String senderName;

    @Column(name = "sender_phone", length = 20)
    private String senderPhone;

    /** Giau ten nguoi tang tren thiep va voi nguoi giao hang. */
    @Column(name = "anonymous_sender", nullable = false, columnDefinition = "BIT NOT NULL DEFAULT 0")
    private boolean anonymousSender = false;

    /** Null o cac don cu truoc khi co tinh nang nay - coi nhu khong kem thiep. */
    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", length = 20)
    private CardType cardType;

    /** Loi chuc in len thiep. Khac voi note (ghi chu cho nguoi giao hang). */
    @Column(name = "card_message", length = 300)
    private String cardMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", length = 20)
    private DeliverySlot timeSlot;

    /**
     * Gio bat dau cua khung giao 1 tieng khach chon (10 = 10:00 - 11:00). Null = giao luc nao
     * trong buoi / trong ngay cung duoc. Co gio thi timeSlot la buoi chua gio do.
     */
    @Column(name = "delivery_hour")
    private Integer deliveryHour;

    /**
     * Qua kem. FetchMode.SUBSELECT: items da la EAGER, hai tap EAGER cung JOIN mot luc
     * se nhan ban dong (va Hibernate tu choi hai List). Tai rieng bang mot cau phu.
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    private List<OrderAddon> addons = new ArrayList<>();

    // ===================== PHAN MO RONG: tien =====================

    /** Qua kem + phi thiep. Null o don cu. */
    @Column(name = "extras_total")
    private Double extrasTotal;

    /** So tien giam tu ma giam gia. Null o don cu. */
    @Column(name = "discount")
    private Double discount;

    /** Chup lai ma da dung (khong khoa ngoai) - xoa ma sau nay khong mat lich su don. */
    @Column(name = "voucher_code", length = 30)
    private String voucherCode;

    // ===================== PHAN MO RONG: thanh toan =====================

    /** Null o don cu truoc khi co tinh nang - coi nhu COD. */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    /** Null o don cu - xem OrderResponse de biet cach suy ra. */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    private PaymentStatus paymentStatus;

    @Column(name = "paid_at")
    private Instant paidAt;

    /** Ma giao dich cua payment-service da thanh toan don nay (txnRef). */
    @Column(name = "payment_ref", length = 40)
    private String paymentRef;

    // ===================== PHAN MO RONG: giao hang GHN =====================

    /**
     * Ma dia gioi hanh chinh theo danh muc cua GHN. Null o don cu (dia chi go tu do) va khi
     * chua cau hinh GHN - nhung don do khong tao van don GHN duoc.
     */
    @Column(name = "to_province_id")
    private Integer toProvinceId;

    @Column(name = "to_district_id")
    private Integer toDistrictId;

    @Column(name = "to_ward_code", length = 20)
    private String toWardCode;

    /** Ma van don GHN, co sau khi ADMIN bam "Tao van don". */
    @Column(name = "ghn_order_code", length = 30)
    private String ghnOrderCode;

    /** Trang thai goc cua GHN (ready_to_pick, delivering, delivered...). */
    @Column(name = "shipping_status", length = 40)
    private String shippingStatus;

    @Column(name = "expected_delivery_at")
    private Instant expectedDeliveryAt;

    @Column(name = "shipping_updated_at")
    private Instant shippingUpdatedAt;

    /** Phi cua hang tra GHN cho van don (khac phi giao khach tra trong tong don). */
    @Column(name = "ghn_fee")
    private Double ghnFee;

    /** So tien shipper thu ho luc tao van don: tong don voi COD, 0 voi don da tra truc tuyen. */
    @Column(name = "cod_amount")
    private Long codAmount;

    /** Khoi luong gui GHN (gram). */
    @Column(name = "shipping_weight")
    private Integer shippingWeight;

    /**
     * Hanh trinh van don GHN dang JSON [{"status":"picked","at":"2026-..."}], lay tu truong
     * "log" khi hoi GHN. Chi de hien thi; khong truy van theo cot nay nen khong tach bang.
     */
    @Lob
    @Column(name = "shipping_log", columnDefinition = "TEXT")
    private String shippingLog;

    // Thoi diem don buoc vao tung trang thai - de ve thanh tien trinh. Don cu tao truoc khi
    // co cac cot nay thi de null, giao dien chi hien buoc ma khong co gio.

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "preparing_at")
    private Instant preparingAt;

    @Column(name = "shipping_at")
    private Instant shippingAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    // ---------- Anh bo hoa thanh pham ----------
    // Tiem hoa gui anh bo hoa that cho khach truoc khi giao: khach thay dung thu minh da
    // dat, nguoi tang yen tam du khong tu tay trao. Duong dan web "order-media/...".

    @Column(name = "arrangement_photo_url", length = 255)
    private String arrangementPhotoUrl;

    @Column(name = "arrangement_photo_at")
    private Instant arrangementPhotoAt;

    public Order() {
    }

    public String getArrangementPhotoUrl() {
        return arrangementPhotoUrl;
    }

    public void setArrangementPhotoUrl(String arrangementPhotoUrl) {
        this.arrangementPhotoUrl = arrangementPhotoUrl;
    }

    public Instant getArrangementPhotoAt() {
        return arrangementPhotoAt;
    }

    public void setArrangementPhotoAt(Instant arrangementPhotoAt) {
        this.arrangementPhotoAt = arrangementPhotoAt;
    }

    /**
     * Chuyen sang trang thai moi va ghi thoi diem. Nhay coc (vd. Cho xac nhan -> Dang giao)
     * thi chi ghi thoi diem cua buoc dich, cac buoc bi bo qua de trong.
     */
    public void moveTo(OrderStatus next) {
        Instant now = Instant.now();
        status = next;
        switch (next) {
            case CONFIRMED -> confirmedAt = now;
            case PREPARING -> preparingAt = now;
            case SHIPPING -> shippingAt = now;
            case DELIVERED -> deliveredAt = now;
            case CANCELLED -> cancelledAt = now;
            default -> {
            }
        }
    }

    /** Gan hai chieu de JPA luu duoc khoa ngoai order_id. */
    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public Double getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(Double deliveryFee) {
        this.deliveryFee = deliveryFee;
    }

    public Double getTotal() {
        return total;
    }

    public void setTotal(Double total) {
        this.total = total;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public void addAddon(OrderAddon addon) {
        addon.setOrder(this);
        addons.add(addon);
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderPhone() {
        return senderPhone;
    }

    public void setSenderPhone(String senderPhone) {
        this.senderPhone = senderPhone;
    }

    public boolean isAnonymousSender() {
        return anonymousSender;
    }

    public void setAnonymousSender(boolean anonymousSender) {
        this.anonymousSender = anonymousSender;
    }

    public CardType getCardType() {
        return cardType;
    }

    public void setCardType(CardType cardType) {
        this.cardType = cardType;
    }

    public String getCardMessage() {
        return cardMessage;
    }

    public void setCardMessage(String cardMessage) {
        this.cardMessage = cardMessage;
    }

    public Integer getDeliveryHour() {
        return deliveryHour;
    }

    public void setDeliveryHour(Integer deliveryHour) {
        this.deliveryHour = deliveryHour;
    }

    public DeliverySlot getTimeSlot() {
        return timeSlot;
    }

    public void setTimeSlot(DeliverySlot timeSlot) {
        this.timeSlot = timeSlot;
    }

    public List<OrderAddon> getAddons() {
        return addons;
    }

    public void setAddons(List<OrderAddon> addons) {
        this.addons = addons;
    }

    public Double getExtrasTotal() {
        return extrasTotal;
    }

    public void setExtrasTotal(Double extrasTotal) {
        this.extrasTotal = extrasTotal;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public String getVoucherCode() {
        return voucherCode;
    }

    public void setVoucherCode(String voucherCode) {
        this.voucherCode = voucherCode;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public String getPaymentRef() {
        return paymentRef;
    }

    public void setPaymentRef(String paymentRef) {
        this.paymentRef = paymentRef;
    }

    public Integer getToProvinceId() {
        return toProvinceId;
    }

    public void setToProvinceId(Integer toProvinceId) {
        this.toProvinceId = toProvinceId;
    }

    public Integer getToDistrictId() {
        return toDistrictId;
    }

    public void setToDistrictId(Integer toDistrictId) {
        this.toDistrictId = toDistrictId;
    }

    public String getToWardCode() {
        return toWardCode;
    }

    public void setToWardCode(String toWardCode) {
        this.toWardCode = toWardCode;
    }

    public String getGhnOrderCode() {
        return ghnOrderCode;
    }

    public void setGhnOrderCode(String ghnOrderCode) {
        this.ghnOrderCode = ghnOrderCode;
    }

    public String getShippingStatus() {
        return shippingStatus;
    }

    public void setShippingStatus(String shippingStatus) {
        this.shippingStatus = shippingStatus;
    }

    public Instant getExpectedDeliveryAt() {
        return expectedDeliveryAt;
    }

    public void setExpectedDeliveryAt(Instant expectedDeliveryAt) {
        this.expectedDeliveryAt = expectedDeliveryAt;
    }

    public Instant getShippingUpdatedAt() {
        return shippingUpdatedAt;
    }

    public void setShippingUpdatedAt(Instant shippingUpdatedAt) {
        this.shippingUpdatedAt = shippingUpdatedAt;
    }

    public Double getGhnFee() {
        return ghnFee;
    }

    public void setGhnFee(Double ghnFee) {
        this.ghnFee = ghnFee;
    }

    public Long getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(Long codAmount) {
        this.codAmount = codAmount;
    }

    public Integer getShippingWeight() {
        return shippingWeight;
    }

    public void setShippingWeight(Integer shippingWeight) {
        this.shippingWeight = shippingWeight;
    }

    public String getShippingLog() {
        return shippingLog;
    }

    public void setShippingLog(String shippingLog) {
        this.shippingLog = shippingLog;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getPreparingAt() {
        return preparingAt;
    }

    public Instant getShippingAt() {
        return shippingAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    /** Don cu (null) coi nhu COD. */
    public PaymentMethod effectivePaymentMethod() {
        return paymentMethod == null ? PaymentMethod.COD : paymentMethod;
    }

    /**
     * Don cu (null): da giao thi coi nhu da thu tien COD, con lai la chua thanh toan.
     */
    public PaymentStatus effectivePaymentStatus() {
        if (paymentStatus != null) {
            return paymentStatus;
        }
        return status == OrderStatus.DELIVERED ? PaymentStatus.PAID : PaymentStatus.UNPAID;
    }
}
