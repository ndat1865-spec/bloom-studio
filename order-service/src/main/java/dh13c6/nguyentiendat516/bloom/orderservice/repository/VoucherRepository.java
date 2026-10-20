package dh13c6.nguyentiendat516.bloom.orderservice.repository;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCode(String code);

    boolean existsByCode(String code);

    List<Voucher> findAllByOrderByCreatedAtDesc();

    List<Voucher> findByActiveTrueOrderByCreatedAtDesc();

    /** Ma chung dang bat. */
    List<Voucher> findByActiveTrueAndOwnerUserIdIsNullOrderByCreatedAtDesc();

    /** Ma rieng cua mot tai khoan (ca da tat / het han - hien lich su trong vi). */
    List<Voucher> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);

    /**
     * Tang luot dung CO DIEU KIEN trong mot cau UPDATE duy nhat.
     *
     * Khong doc usedCount roi +1 o Java: hai khach dat cung luc se cung doc thay "con 1
     * luot" va ca hai deu qua. De MySQL tu so sanh va cong trong mot lenh thi chi mot
     * trong hai lenh cap nhat duoc dong (tra ve 1), lenh con lai tra ve 0.
     */
    @Modifying
    @Query("update Voucher v set v.usedCount = v.usedCount + 1 "
            + "where v.id = :id and v.active = true "
            + "and (v.usageLimit is null or v.usedCount < v.usageLimit)")
    int tryIncrementUsage(@Param("id") Long id);

    /** Tang luot luu cua ma san, cung kieu UPDATE co dieu kien nhu tryIncrementUsage. */
    @Modifying
    @Query("update Voucher v set v.claimedCount = v.claimedCount + 1 "
            + "where v.id = :id and v.active = true and v.claimRequired = true "
            + "and (v.claimLimit is null or v.claimedCount < v.claimLimit)")
    int tryIncrementClaim(@Param("id") Long id);

    @Modifying
    @Query("update Voucher v set v.usedCount = v.usedCount - 1 where v.id = :id and v.usedCount > 0")
    int decrementUsage(@Param("id") Long id);
}
