package dh13c6.nguyentiendat516.bloom.productservice.service;

import dh13c6.nguyentiendat516.bloom.productservice.client.OrderClient;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewEligibility;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewRequest;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewResponse;
import dh13c6.nguyentiendat516.bloom.productservice.dto.ReviewDtos.ReviewSummary;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Review;
import dh13c6.nguyentiendat516.bloom.productservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.productservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductRepository;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ReviewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Nghiep vu danh gia san pham.
 *
 * Quy tac chinh: CHI ai da nhan hang moi duoc danh gia - tuc la co it nhat mot don
 * trang thai DELIVERED chua san pham do. Du lieu don hang thuoc order-service, nen
 * service nay phai hoi qua OrderClient chu khong tu doc duoc.
 */
@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderClient orderClient;

    public ReviewService(ReviewRepository reviewRepository,
                         ProductRepository productRepository,
                         OrderClient orderClient) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.orderClient = orderClient;
    }

    // ===================== CONG KHAI =====================

    public Page<Review> listVisible(Long productId, Pageable pageable) {
        requireProduct(productId);
        return reviewRepository.findByProductIdAndHiddenFalse(productId, pageable);
    }

    public ReviewSummary summary(Long productId) {
        Product product = requireProduct(productId);
        Map<Integer, Long> counts = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            counts.put(star, 0L);
        }
        for (Object[] row : reviewRepository.countVisibleByRating(productId)) {
            counts.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }
        return new ReviewSummary(product.getRatingAverage(),
                product.getRatingCount() == null ? 0 : product.getRatingCount(), counts);
    }

    // ===================== KHACH DA DANG NHAP =====================

    /** Cho giao dien biet nen hien form danh gia hay hien ly do khong duoc danh gia. */
    public ReviewEligibility eligibility(Long productId, Long userId) {
        requireProduct(productId);
        Optional<Review> mine = reviewRepository.findByProductIdAndUserId(productId, userId);
        if (mine.isPresent()) {
            // Da danh gia roi thi luon duoc sua, khong can hoi lai order-service
            return new ReviewEligibility(true, null, ReviewResponse.full(mine.get()));
        }
        if (!orderClient.hasDeliveredPurchase(userId, productId)) {
            return new ReviewEligibility(false,
                    "Bạn cần mua và nhận được sản phẩm này (đơn ở trạng thái Đã giao) mới đánh giá được.",
                    null);
        }
        return new ReviewEligibility(true, null, null);
    }

    /**
     * Tao moi hoac sua danh gia cua chinh minh.
     *
     * Danh gia moi: bat buoc da nhan hang, neu khong -> 409. Sua danh gia cu: khong hoi
     * lai (lan dau da xac minh roi). Danh gia bi ADMIN an van bi an sau khi sua - khach
     * khong tu go an duoc bang cach sua noi dung.
     */
    @Transactional
    public Review upsert(Long productId, Long userId, String username, ReviewRequest request) {
        Product product = requireProduct(productId);

        Review review = reviewRepository.findByProductIdAndUserId(productId, userId).orElse(null);
        if (review == null) {
            if (!orderClient.hasDeliveredPurchase(userId, productId)) {
                throw new ConflictException(
                        "Chỉ khách đã nhận được sản phẩm này mới đánh giá được");
            }
            review = new Review();
            review.setProduct(product);
            review.setUserId(userId);
            review.setUsername(username);
            review.setCreatedAt(Instant.now());
        }
        review.setRating(request.rating());
        String comment = request.comment() == null ? null : request.comment().trim();
        review.setComment(comment == null || comment.isEmpty() ? null : comment);
        review.setUpdatedAt(Instant.now());

        Review saved = reviewRepository.save(review);
        recalculate(product);
        return saved;
    }

    // ===================== ADMIN =====================

    public Page<Review> listForAdmin(Boolean hidden, Pageable pageable) {
        return hidden == null
                ? reviewRepository.findAll(pageable)
                : reviewRepository.findByHidden(hidden, pageable);
    }

    @Transactional
    public Review setHidden(Long reviewId, boolean hidden) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đánh giá id = " + reviewId));
        review.setHidden(hidden);
        Review saved = reviewRepository.save(review);
        recalculate(review.getProduct());
        return saved;
    }

    @Transactional
    public void delete(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đánh giá id = " + reviewId));
        Product product = review.getProduct();
        reviewRepository.delete(review);
        reviewRepository.flush();
        recalculate(product);
    }

    // ===================== HO TRO =====================

    private Product requireProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sản phẩm id = " + productId));
    }

    /** Tinh lai diem trung binh (1 chu so thap phan) va so danh gia dang hien. */
    private void recalculate(Product product) {
        long count = reviewRepository.countByProductIdAndHiddenFalse(product.getId());
        Double average = reviewRepository.averageVisibleRating(product.getId());
        product.setRatingCount((int) count);
        product.setRatingAverage(average == null ? null : Math.round(average * 10) / 10.0);
        productRepository.save(product);
    }
}
