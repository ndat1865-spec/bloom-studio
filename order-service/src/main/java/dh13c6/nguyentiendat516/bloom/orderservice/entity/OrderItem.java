package dh13c6.nguyentiendat516.bloom.orderservice.entity;

import jakarta.persistence.*;

/**
 * Mot dong trong don hang.
 *
 * product_name va unit_price duoc CHUP LAI tai thoi diem dat hang:
 * san pham doi gia hay bi xoa sau do thi don cu van giu dung con so luc khach dat.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * San pham duoc mua. KHONG con @ManyToOne Product: du lieu san pham nam o DB cua
     * product-service. Chi luu id dang so.
     *
     * Ten, gia va anh deu duoc CHUP LAI vao ba truong ben duoi tai thoi diem dat hang.
     * Nho vay admin doi gia hay xoa san pham khoi catalogue cung khong lam sai hoa don cu.
     */
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "unit_price", nullable = false)
    private Double unitPrice;

    /** Chup lai duong dan anh de trang "Don hang cua toi" hien duoc thumbnail. */
    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false)
    private Double lineTotal;

    /** Ma co bo (SMALL / STANDARD / LARGE). Null o don cu va dong hoa theo yeu cau. */
    @Column(name = "size", length = 10)
    private String size;

    /** Nhan co bo chup luc dat, kem so bong - vd. "Lớn · 23 bông". */
    @Column(name = "size_label", length = 60)
    private String sizeLabel;

    /** Dong hoa dat theo yeu cau: id yeu cau (khi do productId = null). */
    @Column(name = "custom_request_id")
    private Long customRequestId;

    public OrderItem() {
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getSizeLabel() {
        return sizeLabel;
    }

    public void setSizeLabel(String sizeLabel) {
        this.sizeLabel = sizeLabel;
    }

    public Long getCustomRequestId() {
        return customRequestId;
    }

    public void setCustomRequestId(Long customRequestId) {
        this.customRequestId = customRequestId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getLineTotal() {
        return lineTotal;
    }

    public void setLineTotal(Double lineTotal) {
        this.lineTotal = lineTotal;
    }
}
