package dh13c6.nguyentiendat516.bloom.orderservice.repository;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentMethod;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Phan mo rong ngoai SOS01-SOS10: repository cho don hang. */
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByCode(String code);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Tim don cho trang quan tri. anyStatus = true thi bo qua loc trang thai (Hibernate khong
     * so sanh duoc "danh sach IN rong"); q da viet thuong va boc %...% (null = khong tim);
     * delivery null = moi ngay giao. Tim theo ma don, nguoi nhan, SDT, tai khoan, nguoi tang.
     */
    @Query("select o from Order o where (:anyStatus = true or o.status in :statuses) "
            + "and (:delivery is null or o.deliveryDate = :delivery) "
            + "and (:q is null or lower(o.code) like :q or lower(o.customerName) like :q "
            + "     or o.phone like :q or lower(o.username) like :q or lower(o.senderName) like :q) "
            + "order by o.createdAt desc")
    Page<Order> search(@Param("anyStatus") boolean anyStatus,
                       @Param("statuses") Collection<OrderStatus> statuses,
                       @Param("delivery") java.time.LocalDate delivery,
                       @Param("q") String q,
                       Pageable pageable);

    /** So don moi trang thai - cho the loc cua trang quan tri. */
    @Query("select o.status, count(o) from Order o group by o.status")
    List<Object[]> countGroupByStatus();

    /** Don con phai giao vao mot ngay (chua giao, chua huy). */
    @Query("select count(o) from Order o where o.deliveryDate = :day and o.status not in :closed")
    long countOpenForDelivery(@Param("day") java.time.LocalDate day,
                              @Param("closed") Collection<OrderStatus> closed);

    /** PHAN MO RONG: don cua rieng mot tai khoan, moi nhat truoc. */
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserId(Long userId);

    /** PHAN MO RONG: don trong mot khoang thoi gian, phuc vu trang Tong quan cua ADMIN. */
    List<Order> findByCreatedAtBetween(Instant start, Instant end);

    boolean existsByCode(String code);

    /** Co don o trang thai status (DELIVERED) cua userId chua san pham productId khong. */
    @Query("select count(o) > 0 from Order o join o.items i "
            + "where o.userId = :userId and o.status = :status and i.productId = :productId")
    boolean existsDeliveredPurchase(@Param("userId") Long userId,
                                    @Param("productId") Long productId,
                                    @Param("status") OrderStatus status);

    Optional<Order> findByGhnOrderCode(String ghnOrderCode);

    /** Don thanh toan truc tuyen con cho, tao truoc moc thoi gian - ung vien tu huy. */
    List<Order> findByStatusAndPaymentMethodInAndCreatedAtBefore(OrderStatus status,
                                                                  Collection<PaymentMethod> methods,
                                                                  Instant before);

    // ===================== CAP NHAT CO DIEU KIEN =====================
    //
    // Thanh toan (payment-service goi vao) va huy don (khach, ADMIN, bo tu huy) co the xay ra
    // CUNG LUC. Doc -> kiem tra -> ghi bang entity thi ca hai deu thay don "con mo" va ca hai
    // deu ghi: don vua bi huy vua da thanh toan. Moi cau duoi day kiem tra va ghi trong MOT
    // lenh UPDATE; tra ve 0 nghia la ben kia da nhanh tay hon.

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Order o set o.paymentStatus = :paid, o.paymentMethod = :method, o.paymentRef = :ref, "
            + "o.paidAt = :now where o.id = :id and o.status <> :cancelled "
            + "and (o.paymentStatus is null or o.paymentStatus = :unpaid)")
    int markPaidIfOpen(@Param("id") Long id, @Param("method") PaymentMethod method, @Param("ref") String ref,
                       @Param("now") Instant now, @Param("paid") PaymentStatus paid,
                       @Param("unpaid") PaymentStatus unpaid, @Param("cancelled") OrderStatus cancelled);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Order o set o.status = :cancelled, o.cancelledAt = :now where o.id = :id and o.status in :from")
    int claimCancel(@Param("id") Long id, @Param("from") Collection<OrderStatus> from,
                    @Param("cancelled") OrderStatus cancelled, @Param("now") Instant now);

    /** Bo tu huy: chi huy khi VAN chua thanh toan tai dung thoi diem ghi. */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Order o set o.status = :cancelled, o.cancelledAt = :now where o.id = :id and o.status = :pending "
            + "and (o.paymentStatus is null or o.paymentStatus = :unpaid)")
    int claimCancelUnpaid(@Param("id") Long id, @Param("pending") OrderStatus pending,
                          @Param("unpaid") PaymentStatus unpaid, @Param("cancelled") OrderStatus cancelled,
                          @Param("now") Instant now);

    /** Chi doi khi txnRef dung la giao dich da tra don nay va don dang cho hoan. */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Order o set o.paymentStatus = :refunded where o.id = :id and o.paymentRef = :ref "
            + "and o.paymentStatus = :pending")
    int markRefunded(@Param("id") Long id, @Param("ref") String ref, @Param("pending") PaymentStatus pending,
                     @Param("refunded") PaymentStatus refunded);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Order o set o.paymentStatus = :refund where o.id = :id and o.paymentStatus = :paid")
    int markRefundPending(@Param("id") Long id, @Param("paid") PaymentStatus paid,
                          @Param("refund") PaymentStatus refund);
}
