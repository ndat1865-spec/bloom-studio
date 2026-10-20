package dh13c6.nguyentiendat516.bloom.productservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * SOS02 -> SOS05 - Entity Product.
 * price giu kieu Double dung theo mo hinh trong tai lieu.
 */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 100, message = "Tên sản phẩm tối đa 100 ký tự")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @NotNull(message = "Giá không được để trống")
    @PositiveOrZero(message = "Giá không được âm")
    @Column(name = "price", nullable = false)
    private Double price;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    /**
     * Ton kho. Truong nay KHONG co o ban monolith - them khi tach service.
     * Hoa tuoi moi ngay chi co so luong nhat dinh, va day cung la cho duy nhat
     * order-service phai goi sang product-service (reserve-stock / release-stock).
     * Chi duoc thay doi qua hai API noi bo do, khong sua truc tiep qua PUT /products/{id}.
     */
    @NotNull(message = "Tồn kho không được để trống")
    @PositiveOrZero(message = "Tồn kho không được âm")
    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    /**
     * SOS05 - phia "con" cua quan he 1-N.
     * Khong dung @JsonBackReference: response duoc build bang DTO (ProductResponse)
     * de van tra ve category {id, name} cho form sua o frontend.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    /**
     * Cac dip hop voi bo hoa - bang phu product_occasions (product_id, occasion).
     * EAGER vi tap nay rat nho va luon can khi tra ve san pham.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_occasions", joinColumns = @JoinColumn(name = "product_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "occasion", length = 20, nullable = false)
    private Set<Occasion> occasions = new LinkedHashSet<>();

    /** Tong mau chu dao. Null = chua phan loai, van ban binh thuong. */
    @Enumerated(EnumType.STRING)
    @Column(name = "color", length = 20)
    private FlowerColor color;

    /**
     * Diem danh gia trung binh va so danh gia DANG HIEN.
     *
     * Luu san tren bang products (denormalize) thay vi tinh AVG moi lan: trang danh sach
     * tra 6-20 san pham mot luc, tinh rieng tung cai la 20 cau truy van. Hai cot nay chi
     * do ReviewService cap nhat, khong nhan tu body cua client (xem ProductService).
     */
    @Column(name = "rating_average")
    private Double ratingAverage;

    @Column(name = "rating_count", nullable = false, columnDefinition = "INT NOT NULL DEFAULT 0")
    private Integer ratingCount = 0;

    /**
     * Thanh phan bo hoa: loai hoa, la phu, giay goi... hien o trang chi tiet.
     * Khach dat hoa can biet minh nhan duoc gi, khong chi mot tam anh.
     */
    @Size(max = 500, message = "Thành phần tối đa 500 ký tự")
    @Column(name = "composition", length = 500)
    private String composition;

    /** So bong cua co Tieu chuan. Null = san pham khong tinh theo bong (tron goi, trang tri). */
    @Min(value = 1, message = "Số bông tối thiểu là 1")
    @Max(value = 999, message = "Số bông tối đa là 999")
    @Column(name = "stem_count")
    private Integer stemCount;

    /** true = co ba co Nho / Tieu chuan / Lon (xem BouquetSize); false = chi mot co. */
    @Column(name = "sized", nullable = false, columnDefinition = "BOOLEAN NOT NULL DEFAULT FALSE")
    private boolean sized;

    /**
     * Phai dat truoc toi thieu bao nhieu ngay. 0 = giao trong ngay duoc (bo hoa tuoi);
     * hoa cuoi, hoa su kien can dat hoa va dung khung truoc nhieu ngay.
     * order-service chan ngay giao som hon muc nay.
     */
    @NotNull(message = "Số ngày đặt trước không được để trống")
    @Min(value = 0, message = "Số ngày đặt trước không được âm")
    @Max(value = 30, message = "Số ngày đặt trước tối đa là 30")
    @Column(name = "lead_days", nullable = false, columnDefinition = "INT NOT NULL DEFAULT 0")
    private Integer leadDays = 0;

    public Product() {
    }

    public String getComposition() {
        return composition;
    }

    public void setComposition(String composition) {
        this.composition = composition;
    }

    public Integer getStemCount() {
        return stemCount;
    }

    public void setStemCount(Integer stemCount) {
        this.stemCount = stemCount;
    }

    public boolean isSized() {
        return sized;
    }

    public void setSized(boolean sized) {
        this.sized = sized;
    }

    public Integer getLeadDays() {
        return leadDays;
    }

    public void setLeadDays(Integer leadDays) {
        this.leadDays = leadDays;
    }

    public Product(Long id, String name, Double price, String description, String imageUrl,
                   Integer stockQuantity, Category category) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this.stockQuantity = stockQuantity;
        this.category = category;
    }

    public Set<Occasion> getOccasions() {
        return occasions;
    }

    public void setOccasions(Set<Occasion> occasions) {
        this.occasions = occasions == null ? new LinkedHashSet<>() : occasions;
    }

    public FlowerColor getColor() {
        return color;
    }

    public void setColor(FlowerColor color) {
        this.color = color;
    }

    public Double getRatingAverage() {
        return ratingAverage;
    }

    public void setRatingAverage(Double ratingAverage) {
        this.ratingAverage = ratingAverage;
    }

    public Integer getRatingCount() {
        return ratingCount;
    }

    public void setRatingCount(Integer ratingCount) {
        this.ratingCount = ratingCount;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }
}
