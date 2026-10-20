package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Yeu cau dat hoa theo y khach: khach mo ta dip, ngan sach, mau, gui anh mau; studio bao
 * gia; khach dong y thi yeu cau thanh mot dong trong don hang (OrderItem.customRequestId)
 * va di qua dung luong thanh toan / giao hang cua don thuong.
 *
 * Nam o order-service vi gia bao ra la tien cua don hang, va viec "dong y bao gia" chinh
 * la dat hang. Khong dung CSDL cua product-service.
 */
@Entity
@Table(name = "custom_requests")
public class CustomRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    /** Chu yeu cau - lay tu JWT, khong nhan tu body. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "username", length = 50)
    private String username;

    /** Nhan dip tang (Sinh nhat, Khai truong...). */
    @Column(name = "occasion", length = 40)
    private String occasion;

    @Column(name = "budget", nullable = false)
    private Double budget;

    @Column(name = "colors", length = 100)
    private String colors;

    // ---- Lua chon co san tren trang dat hoa (luu nhan tieng Viet, studio doc thang) ----
    /** Kieu hoa: bo tay, gio, hop, binh, ke.... */
    @Column(name = "arrangement", length = 40)
    private String arrangement;

    /** Kich co mong muon, kem so canh uoc luong. */
    @Column(name = "size_option", length = 60)
    private String sizeOption;

    /** Cac loai hoa chinh khach chon, cach nhau dau phay. */
    @Column(name = "flowers", length = 200)
    private String flowers;

    /** Phong cach: lang man, sang trong, toi gian.... */
    @Column(name = "style", length = 40)
    private String style;

    /** Giay goi (chi voi bo tay / hoa cuoi). */
    @Column(name = "wrapping", length = 40)
    private String wrapping;

    /** Nhung thu can tranh: mui nong, phan hoa, hoa ly.... */
    @Column(name = "avoid_notes", length = 200)
    private String avoid;

    /** Ghi chu them cua khach. Cot cu NOT NULL nen khong ghi chu thi luu chuoi rong. */
    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @Column(name = "reference_image_url", length = 255)
    private String referenceImageUrl;

    @Column(name = "desired_date")
    private LocalDate desiredDate;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    /** VARCHAR chu khong de Hibernate tao ENUM cua MySQL - them trang thai moi khong phai sua CSDL. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "varchar(20) not null")
    private CustomRequestStatus status = CustomRequestStatus.NEW;

    @Column(name = "quoted_price")
    private Double quotedPrice;

    /** Loi nhan cua studio kem bao gia / ly do tu choi. */
    @Column(name = "shop_note", length = 500)
    private String shopNote;

    @Column(name = "quoted_at")
    private Instant quotedAt;

    /** Nhan vien da bao gia / tu choi. */
    @Column(name = "handled_by", length = 50)
    private String handledBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "order_code", length = 30)
    private String orderCode;

    public CustomRequest() {
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

    public String getArrangement() {
        return arrangement;
    }

    public void setArrangement(String arrangement) {
        this.arrangement = arrangement;
    }

    public String getSizeOption() {
        return sizeOption;
    }

    public void setSizeOption(String sizeOption) {
        this.sizeOption = sizeOption;
    }

    public String getFlowers() {
        return flowers;
    }

    public void setFlowers(String flowers) {
        this.flowers = flowers;
    }

    public String getStyle() {
        return style;
    }

    public void setStyle(String style) {
        this.style = style;
    }

    public String getWrapping() {
        return wrapping;
    }

    public void setWrapping(String wrapping) {
        this.wrapping = wrapping;
    }

    public String getAvoid() {
        return avoid;
    }

    public void setAvoid(String avoid) {
        this.avoid = avoid;
    }

    public String getOccasion() {
        return occasion;
    }

    public void setOccasion(String occasion) {
        this.occasion = occasion;
    }

    public Double getBudget() {
        return budget;
    }

    public void setBudget(Double budget) {
        this.budget = budget;
    }

    public String getColors() {
        return colors;
    }

    public void setColors(String colors) {
        this.colors = colors;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReferenceImageUrl() {
        return referenceImageUrl;
    }

    public void setReferenceImageUrl(String referenceImageUrl) {
        this.referenceImageUrl = referenceImageUrl;
    }

    public LocalDate getDesiredDate() {
        return desiredDate;
    }

    public void setDesiredDate(LocalDate desiredDate) {
        this.desiredDate = desiredDate;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public CustomRequestStatus getStatus() {
        return status;
    }

    public void setStatus(CustomRequestStatus status) {
        this.status = status;
    }

    public Double getQuotedPrice() {
        return quotedPrice;
    }

    public void setQuotedPrice(Double quotedPrice) {
        this.quotedPrice = quotedPrice;
    }

    public String getShopNote() {
        return shopNote;
    }

    public void setShopNote(String shopNote) {
        this.shopNote = shopNote;
    }

    public Instant getQuotedAt() {
        return quotedAt;
    }

    public void setQuotedAt(Instant quotedAt) {
        this.quotedAt = quotedAt;
    }

    public String getHandledBy() {
        return handledBy;
    }

    public void setHandledBy(String handledBy) {
        this.handledBy = handledBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }
}
