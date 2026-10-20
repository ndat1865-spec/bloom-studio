package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.HuntVoucher;
import dh13c6.nguyentiendat516.bloom.orderservice.dto.VoucherDtos.VoucherRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Voucher;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.VoucherClaim;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.VoucherRedemption;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.OrderRepository;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.VoucherClaimRepository;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.VoucherRedemptionRepository;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Nghiep vu ma giam gia.
 *
 * Cac quy tac (kiem tra theo thu tu, bao dung ly do cho khach):
 *  1. Ma ton tai            2. Dang bat
 *  3. Da toi ngay bat dau   4. Chua qua ngay het han
 *  5. Con luot dung         6. Da luu ma (neu la ma san)
 *  7. Tai khoan nay chua dung (neu ma gioi han moi nguoi mot lan)
 *  8. Don dat gia tri toi thieu
 */
@Service
public class VoucherService {

    /** Ket qua ap ma: ma nao, giam bao nhieu. */
    public record Quote(Voucher voucher, double discount) {
    }

    /** Danh gia mot ma cho mot don - khong nem loi, de hien trong vi / popup chon ma. */
    public record Assessment(Voucher voucher, String status, String reason, double discount) {
        public boolean usable() {
            return "USABLE".equals(status);
        }
    }

    private final VoucherRepository voucherRepository;
    private final VoucherRedemptionRepository redemptionRepository;
    private final VoucherClaimRepository claimRepository;
    private final OrderRepository orderRepository;

    public VoucherService(VoucherRepository voucherRepository,
                          VoucherRedemptionRepository redemptionRepository,
                          VoucherClaimRepository claimRepository,
                          OrderRepository orderRepository) {
        this.voucherRepository = voucherRepository;
        this.redemptionRepository = redemptionRepository;
        this.claimRepository = claimRepository;
        this.orderRepository = orderRepository;
    }

    // ===================== AP MA =====================

    /**
     * Kiem tra ma va tinh so tien giam tren gia tri don amount.
     * Nem BadRequestException kem ly do cu the khi ma khong dung duoc.
     */
    public Quote evaluate(String rawCode, double amount, Long userId) {
        Voucher v = voucherRepository.findByCode(normalize(rawCode))
                // Ma rieng cua nguoi khac: bao "khong ton tai" - khong xac nhan ma do co that
                .filter(found -> !found.isPersonal() || found.getOwnerUserId().equals(userId))
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không tồn tại"));
        Assessment a = assess(v, amount, userId);
        if (!a.usable()) {
            throw new BadRequestException(a.reason());
        }
        return new Quote(v, a.discount());
    }

    /**
     * Danh gia ma v cho don `amount` cua userId, theo dung thu tu quy tac o dau lop.
     * amount null = chi xet ma con dung duoc khong, bo qua dieu kien don toi thieu.
     * "Hom nay" theo gio Viet Nam: container chay UTC, 0h - 7h sang se lech mot ngay.
     */
    public Assessment assess(Voucher v, Double amount, Long userId) {
        LocalDate today = LocalDate.now(DeliveryPolicy.SHOP_ZONE);
        if (!v.isActive()) {
            return new Assessment(v, "INACTIVE", "Mã " + v.getCode() + " đã ngừng áp dụng", 0);
        }
        if (v.getStartDate() != null && today.isBefore(v.getStartDate())) {
            return new Assessment(v, "NOT_STARTED", "Mã " + v.getCode() + " chưa đến ngày áp dụng", 0);
        }
        if (v.getEndDate() != null && today.isAfter(v.getEndDate())) {
            return new Assessment(v, "EXPIRED", "Mã " + v.getCode() + " đã hết hạn", 0);
        }
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) {
            return new Assessment(v, "USED_UP", "Mã " + v.getCode() + " đã hết lượt sử dụng", 0);
        }
        // Ma san chua luu: go tay dung ma cung khong qua, phai vao trang Voucher bam Luu
        if (v.isClaimRequired()
                && (userId == null || !claimRepository.existsByVoucherIdAndUserId(v.getId(), userId))) {
            return new Assessment(v, "NOT_CLAIMED",
                    "Mã " + v.getCode() + " cần được lưu ở trang Voucher trước khi dùng", 0);
        }
        if (v.isOnePerCustomer() && userId != null
                && redemptionRepository.existsByVoucherIdAndUserId(v.getId(), userId)) {
            return new Assessment(v, "ALREADY_USED",
                    "Bạn đã dùng mã " + v.getCode() + " rồi, mỗi tài khoản chỉ dùng một lần", 0);
        }
        double min = v.getMinOrderValue() == null ? 0 : v.getMinOrderValue();
        if (amount != null && amount < min) {
            // Tien VND, tach hang nghin bang dau cham: 800.000d
            return new Assessment(v, "BELOW_MIN", String.format(Locale.forLanguageTag("vi-VN"),
                    "Mã %s áp dụng cho đơn từ %,.0fđ (đơn hiện tại %,.0fđ)", v.getCode(), min, amount), 0);
        }
        return new Assessment(v, "USABLE", null, amount == null ? 0 : discountFor(v, amount));
    }

    /**
     * Vi ma cua khach: ma chung dang chay + ma san da luu + moi ma rieng cua khach (ca da dung /
     * het han, de khach thay lich su). Ma dung duoc len truoc, giam nhieu nhat truoc.
     */
    public List<Assessment> wallet(Long userId, Double amount) {
        List<Assessment> out = new java.util.ArrayList<>();
        for (Voucher v : voucherRepository.findByOwnerUserIdOrderByCreatedAtDesc(userId)) {
            out.add(assess(v, amount, userId));
        }
        Set<Long> claimed = claimRepository.findVoucherIdsByUserId(userId);
        for (Voucher v : voucherRepository.findByActiveTrueAndOwnerUserIdIsNullOrderByCreatedAtDesc()) {
            if (v.isClaimRequired()) {
                // Ma san: chi vao vi khi da luu; da luu thi giu ca khi het han - nhu ma rieng
                if (claimed.contains(v.getId())) {
                    out.add(assess(v, amount, userId));
                }
                continue;
            }
            Assessment a = assess(v, amount, userId);
            // Ma chung da het han / het luot / chua mo thi khong nhoi vao vi
            if (a.usable() || "BELOW_MIN".equals(a.status()) || "ALREADY_USED".equals(a.status())) {
                out.add(a);
            }
        }
        out.sort(java.util.Comparator
                .comparing((Assessment a) -> !a.usable())
                .thenComparing(a -> -a.discount())
                .thenComparing(a -> !a.voucher().isPersonal()));
        return out;
    }

    /**
     * Luu don VA ghi nhan luot dung ma trong CUNG mot transaction.
     *
     * Tang luot dung bang UPDATE co dieu kien (xem VoucherRepository): neu giua luc
     * evaluate() va luc nay co nguoi khac lay mat luot cuoi, cau lenh tra ve 0 -> 409,
     * transaction rollback, don khong duoc luu. OrderService bat loi nay va hoan ton kho.
     */
    @Transactional
    public Order saveWithVoucher(Order order, Quote quote, Long userId) {
        if (quote == null) {
            return orderRepository.save(order);
        }
        if (voucherRepository.tryIncrementUsage(quote.voucher().getId()) == 0) {
            throw new ConflictException("Mã " + quote.voucher().getCode() + " vừa hết lượt sử dụng");
        }
        Order saved = orderRepository.save(order);
        redemptionRepository.save(new VoucherRedemption(quote.voucher().getId(), userId, saved.getId()));
        return saved;
    }

    /** Huy don -> tra lai luot dung ma, de khach dat lai don khac van dung duoc ma. */
    @Transactional
    public void releaseFor(Order order) {
        redemptionRepository.findByOrderId(order.getId()).ifPresent(redemption -> {
            voucherRepository.decrementUsage(redemption.getVoucherId());
            redemptionRepository.delete(redemption);
        });
    }

    /** Ma dang dung duoc - hien goi y o trang thanh toan. */
    public List<Voucher> listUsableNow() {
        LocalDate today = LocalDate.now(DeliveryPolicy.SHOP_ZONE);
        // Chi ma chung - ma rieng cua ai thi chi nguoi do thay trong vi.
        // Ma san cung bo ra: chua luu thi khong dung duoc, goi y ra chi lam khach bi tu choi.
        return voucherRepository.findByActiveTrueAndOwnerUserIdIsNullOrderByCreatedAtDesc().stream()
                .filter(v -> !v.isClaimRequired())
                .filter(v -> v.getStartDate() == null || !today.isBefore(v.getStartDate()))
                .filter(v -> v.getEndDate() == null || !today.isAfter(v.getEndDate()))
                .filter(v -> v.getUsageLimit() == null || v.getUsedCount() < v.getUsageLimit())
                .toList();
    }

    // ===================== SAN VOUCHER =====================

    /** Ket qua bam Luu: ma nao, da luu tu truoc chua, ti le luot luu sau lan nay. */
    public record ClaimResult(Voucher voucher, boolean alreadyClaimed, Integer claimedPercent) {
    }

    /** Thu tu tren trang San voucher: luu duoc len dau, het luot xuong cuoi. */
    private static final List<String> HUNT_ORDER =
            List.of("CLAIMABLE", "CLAIMED", "READY", "UPCOMING", "USED", "SOLD_OUT");

    /**
     * Trang "San voucher": moi ma chung dang bat, chua het han (ke ca ma sap mo va ma da het
     * luot - de khach thay "da het" nhu Shopee). userId null = khach chua dang nhap: khong
     * biet da luu chua nen ma san deu hien CLAIMABLE.
     */
    public List<HuntVoucher> hunt(Long userId) {
        LocalDate today = LocalDate.now(DeliveryPolicy.SHOP_ZONE);
        Set<Long> claimed = userId == null ? Set.of() : claimRepository.findVoucherIdsByUserId(userId);
        return voucherRepository.findByActiveTrueAndOwnerUserIdIsNullOrderByCreatedAtDesc().stream()
                .filter(v -> v.getEndDate() == null || !today.isAfter(v.getEndDate()))
                .map(v -> new HuntVoucher(v.getCode(), v.getDescription(), v.getType().name(), v.getValue(),
                        v.getMaxDiscount(), v.getMinOrderValue(), v.getStartDate(), v.getEndDate(),
                        v.isClaimRequired(), huntState(v, today, userId, claimed), percentTaken(v, 0)))
                // sort on dinh: cung nhom thi giu thu tu moi tao truoc
                .sorted(Comparator.comparingInt(h -> HUNT_ORDER.indexOf(h.state())))
                .toList();
    }

    private String huntState(Voucher v, LocalDate today, Long userId, Set<Long> claimed) {
        if (v.getStartDate() != null && today.isBefore(v.getStartDate())) {
            return "UPCOMING";
        }
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) {
            return "SOLD_OUT";
        }
        boolean used = v.isOnePerCustomer() && userId != null
                && redemptionRepository.existsByVoucherIdAndUserId(v.getId(), userId);
        if (!v.isClaimRequired()) {
            return used ? "USED" : "READY";
        }
        if (claimed.contains(v.getId())) {
            return used ? "USED" : "CLAIMED";
        }
        if (v.getClaimLimit() != null && v.getClaimedCount() >= v.getClaimLimit()) {
            return "SOLD_OUT";
        }
        return "CLAIMABLE";
    }

    /**
     * Phan tram luot da het: luot luu voi ma san co gioi han luu, luot dung voi ma co gioi han
     * dung. extraClaims = luot luu vua cong bang UPDATE ma entity trong bo nho chua thay.
     */
    private static Integer percentTaken(Voucher v, int extraClaims) {
        if (v.isClaimRequired() && v.getClaimLimit() != null) {
            return Math.min(100, (v.getClaimedCount() + extraClaims) * 100 / v.getClaimLimit());
        }
        if (v.getUsageLimit() != null) {
            return Math.min(100, v.getUsedCount() * 100 / v.getUsageLimit());
        }
        return null;
    }

    /**
     * Khach bam Luu mot ma san. Bam lai ma da luu thi khong bao loi (alreadyClaimed = true) -
     * hai tab cung mo trang van thay ket qua dung.
     *
     * Tang luot luu bang UPDATE co dieu kien nhu luot dung: hai khach tranh nhau luot luu cuoi
     * thi chi mot nguoi duoc, nguoi kia nhan 409.
     */
    @Transactional
    public ClaimResult claim(String rawCode, Long userId) {
        Voucher v = voucherRepository.findByCode(normalize(rawCode))
                // Ma rieng cua ai thi nguoi do da co trong vi, khong "san" duoc
                .filter(found -> !found.isPersonal() && found.isActive())
                .orElseThrow(() -> new NotFoundException("Mã giảm giá không tồn tại"));
        if (!v.isClaimRequired()) {
            throw new BadRequestException("Mã " + v.getCode() + " không cần lưu, đã có sẵn trong ví của bạn");
        }
        if (claimRepository.existsByVoucherIdAndUserId(v.getId(), userId)) {
            return new ClaimResult(v, true, percentTaken(v, 0));
        }
        LocalDate today = LocalDate.now(DeliveryPolicy.SHOP_ZONE);
        if (v.getStartDate() != null && today.isBefore(v.getStartDate())) {
            throw new BadRequestException("Mã " + v.getCode() + " mở lưu từ ngày "
                    + v.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM")));
        }
        if (v.getEndDate() != null && today.isAfter(v.getEndDate())) {
            throw new BadRequestException("Mã " + v.getCode() + " đã hết hạn");
        }
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) {
            throw new ConflictException("Mã " + v.getCode() + " đã hết lượt sử dụng");
        }
        if (voucherRepository.tryIncrementClaim(v.getId()) == 0) {
            throw new ConflictException("Mã " + v.getCode() + " vừa hết lượt lưu");
        }
        // saveAndFlush: trung khoa (bam Luu hai lan cung luc) lo ngay tai day de controller bat
        claimRepository.saveAndFlush(new VoucherClaim(v.getId(), userId));
        return new ClaimResult(v, false, percentTaken(v, 1));
    }

    // ===================== QUAN TRI =====================

    public List<Voucher> listAll() {
        return voucherRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Voucher create(VoucherRequest request) {
        String code = normalize(request.code());
        if (voucherRepository.existsByCode(code)) {
            throw new ConflictException("Mã " + code + " đã tồn tại");
        }
        Voucher v = new Voucher();
        v.setCode(code);
        apply(v, request);
        return voucherRepository.save(v);
    }

    @Transactional
    public Voucher update(Long id, VoucherRequest request) {
        Voucher v = voucherRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy mã giảm giá id = " + id));
        String code = normalize(request.code());
        if (!code.equals(v.getCode())) {
            // Doi ma cua mot ma da co nguoi dung se lam lich su don kho doi chieu
            if (v.getUsedCount() > 0) {
                throw new ConflictException("Mã đã có người dùng, không đổi tên mã được nữa");
            }
            if (voucherRepository.existsByCode(code)) {
                throw new ConflictException("Mã " + code + " đã tồn tại");
            }
            v.setCode(code);
        }
        apply(v, request);
        return voucherRepository.save(v);
    }

    /** Ma da co nguoi dung thi khong xoa - chi tat (active = false) de giu lich su. */
    @Transactional
    public void delete(Long id) {
        Voucher v = voucherRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy mã giảm giá id = " + id));
        if (v.getUsedCount() > 0) {
            throw new ConflictException("Mã đã được dùng " + v.getUsedCount()
                    + " lần, không xoá được. Hãy tắt mã thay vì xoá");
        }
        claimRepository.deleteByVoucherId(v.getId());
        voucherRepository.delete(v);
    }

    // ===================== HO TRO =====================

    private void apply(Voucher v, VoucherRequest r) {
        if (r.type() == Voucher.Type.PERCENT && r.value() > 100) {
            throw new BadRequestException("Giảm theo phần trăm tối đa 100%");
        }
        if (r.startDate() != null && r.endDate() != null && r.endDate().isBefore(r.startDate())) {
            throw new BadRequestException("Ngày hết hạn phải sau ngày bắt đầu");
        }
        if (r.usageLimit() != null && r.usageLimit() < v.getUsedCount()) {
            throw new BadRequestException("Số lượt tối đa không được nhỏ hơn số lượt đã dùng ("
                    + v.getUsedCount() + ")");
        }
        v.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().trim());
        v.setType(r.type());
        v.setValue(round2(r.value()));
        // Tran giam chi co nghia voi kieu phan tram
        v.setMaxDiscount(r.type() == Voucher.Type.PERCENT && r.maxDiscount() != null && r.maxDiscount() > 0
                ? round2(r.maxDiscount()) : null);
        v.setMinOrderValue(r.minOrderValue() == null ? 0.0 : round2(r.minOrderValue()));
        v.setStartDate(r.startDate());
        v.setEndDate(r.endDate());
        v.setUsageLimit(r.usageLimit());
        v.setOnePerCustomer(Boolean.TRUE.equals(r.onePerCustomer()));
        v.setActive(r.active() == null || r.active());
        // Ma san: chi ma chung moi san duoc - ma rieng da nam san trong vi cua mot khach
        boolean claimRequired = Boolean.TRUE.equals(r.claimRequired());
        if (claimRequired && r.ownerUserId() != null) {
            throw new BadRequestException("Mã tặng riêng một khách không cần săn, bỏ chọn \"Mã săn\"");
        }
        if (claimRequired && r.claimLimit() != null && r.claimLimit() < v.getClaimedCount()) {
            throw new BadRequestException("Số lượt lưu tối đa không được nhỏ hơn số lượt đã lưu ("
                    + v.getClaimedCount() + ")");
        }
        v.setClaimRequired(claimRequired);
        v.setClaimLimit(claimRequired ? r.claimLimit() : null);
        // Ma rieng: ADMIN chon khach tu danh sach tai khoan (chi ADMIN goi duoc API nay)
        if (r.ownerUserId() != null) {
            if (r.ownerUsername() == null || r.ownerUsername().isBlank()) {
                throw new BadRequestException("Thiếu tên đăng nhập của khách được tặng mã");
            }
            if (v.getUsedCount() > 0 && !r.ownerUserId().equals(v.getOwnerUserId())) {
                throw new ConflictException("Mã đã có người dùng, không đổi người sở hữu được");
            }
            v.setOwnerUserId(r.ownerUserId());
            v.setOwnerUsername(r.ownerUsername().trim());
        } else {
            v.setOwnerUserId(null);
            v.setOwnerUsername(null);
        }
    }

    private double discountFor(Voucher v, double amount) {
        double discount = v.getType() == Voucher.Type.PERCENT
                ? amount * v.getValue() / 100.0
                : v.getValue();
        if (v.getType() == Voucher.Type.PERCENT && v.getMaxDiscount() != null) {
            discount = Math.min(discount, v.getMaxDiscount());
        }
        // Khong bao gio giam qua gia tri don
        return round2(Math.min(discount, amount));
    }

    private static String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
