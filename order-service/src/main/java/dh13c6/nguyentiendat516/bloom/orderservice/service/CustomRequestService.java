package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.dto.CustomRequestDtos;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequest;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.CustomRequestStatus;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import dh13c6.nguyentiendat516.bloom.orderservice.entity.OrderItem;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.orderservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.orderservice.repository.CustomRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.EnumSet;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Dat hoa theo yeu cau: khach mo ta -> studio bao gia -> khach dong y bang cach dat hang.
 *
 * Buoc "dong y" khong co API rieng: khach cho yeu cau da bao gia vao gio va dat hang nhu
 * mot bo hoa binh thuong (OrderLineRequest.customRequestId). OrderService goi claim() de
 * giu yeu cau va lay gia da bao - gia KHONG bao gio lay tu client.
 */
@Service
public class CustomRequestService {

    private static final Logger log = LoggerFactory.getLogger(CustomRequestService.class);

    private static final EnumSet<CustomRequestStatus> OPEN =
            EnumSet.of(CustomRequestStatus.NEW, CustomRequestStatus.QUOTED);

    private final CustomRequestRepository repository;
    private final MediaStorageService mediaStorageService;
    private final DeliveryPolicy deliveryPolicy;

    public CustomRequestService(CustomRequestRepository repository, MediaStorageService mediaStorageService,
                                DeliveryPolicy deliveryPolicy) {
        this.repository = repository;
        this.mediaStorageService = mediaStorageService;
        this.deliveryPolicy = deliveryPolicy;
    }

    public CustomRequest create(Long userId, String username, CustomRequestDtos.CreateRequest body) {
        if (body.desiredDate() != null && body.desiredDate().isBefore(deliveryPolicy.today().plusDays(1))) {
            throw new BadRequestException("Hoa làm theo yêu cầu cần ít nhất 1 ngày để studio chọn hoa, "
                    + "hãy chọn ngày từ ngày mai");
        }
        CustomRequest request = new CustomRequest();
        request.setCode("YC" + System.currentTimeMillis() + ThreadLocalRandom.current().nextInt(10, 100));
        request.setUserId(userId);
        request.setUsername(username);
        request.setOccasion(blankToNull(body.occasion()));
        request.setBudget((double) Math.round(body.budget()));
        request.setColors(blankToNull(body.colors()));
        request.setArrangement(body.arrangement().trim());
        request.setSizeOption(blankToNull(body.sizeOption()));
        request.setFlowers(blankToNull(body.flowers()));
        request.setStyle(blankToNull(body.style()));
        request.setWrapping(blankToNull(body.wrapping()));
        request.setAvoid(blankToNull(body.avoid()));
        request.setDescription(body.description() == null ? "" : body.description().trim());
        request.setDesiredDate(body.desiredDate());
        request.setContactPhone(blankToNull(body.contactPhone()));
        request.setStatus(CustomRequestStatus.NEW);
        request.setCreatedAt(Instant.now());
        CustomRequest saved = repository.save(request);
        log.info("Khách {} gửi yêu cầu đặt hoa {}", username, saved.getCode());
        return saved;
    }

    /** Anh mau tham khao - chi chu yeu cau, khi studio chua bao gia. */
    public CustomRequest attachReference(Long id, Long userId, MultipartFile file) {
        CustomRequest request = getOwned(id, userId);
        if (request.getStatus() != CustomRequestStatus.NEW) {
            throw new ConflictException("Studio đã xử lý yêu cầu này, không đổi ảnh mẫu được nữa");
        }
        request.setReferenceImageUrl(mediaStorageService.store(file, "requests"));
        return repository.save(request);
    }

    public CustomRequest get(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu id = " + id));
    }

    /** 404 chu khong 403 khi khong phai chu - giong don hang, khong xac nhan yeu cau co that. */
    public CustomRequest getOwned(Long id, Long userId) {
        CustomRequest request = get(id);
        if (!request.getUserId().equals(userId)) {
            throw new NotFoundException("Không tìm thấy yêu cầu id = " + id);
        }
        return request;
    }

    public Page<CustomRequest> mine(Long userId, Pageable pageable) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Page<CustomRequest> all(CustomRequestStatus status, Pageable pageable) {
        return status == null
                ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    /** Studio bao gia (hoac sua bao gia khi khach chua dat). */
    public CustomRequest quote(Long id, CustomRequestDtos.QuoteRequest body, String staff) {
        CustomRequest request = get(id);
        if (!OPEN.contains(request.getStatus())) {
            throw new ConflictException("Yêu cầu đang ở trạng thái \"" + request.getStatus().getLabel()
                    + "\", không báo giá được");
        }
        request.setQuotedPrice((double) Math.round(body.price()));
        request.setShopNote(blankToNull(body.note()));
        request.setQuotedAt(Instant.now());
        request.setHandledBy(staff);
        request.setStatus(CustomRequestStatus.QUOTED);
        return repository.save(request);
    }

    public CustomRequest reject(Long id, CustomRequestDtos.RejectRequest body, String staff) {
        CustomRequest request = get(id);
        if (!OPEN.contains(request.getStatus())) {
            throw new ConflictException("Yêu cầu đang ở trạng thái \"" + request.getStatus().getLabel()
                    + "\", không từ chối được");
        }
        request.setShopNote(body.note().trim());
        request.setHandledBy(staff);
        request.setStatus(CustomRequestStatus.REJECTED);
        return repository.save(request);
    }

    /** Khach huy yeu cau chua dat hang. */
    public CustomRequest cancel(Long id, Long userId) {
        CustomRequest request = getOwned(id, userId);
        if (!OPEN.contains(request.getStatus())) {
            throw new ConflictException("Yêu cầu đang ở trạng thái \"" + request.getStatus().getLabel()
                    + "\", không huỷ được");
        }
        request.setStatus(CustomRequestStatus.CANCELLED);
        return repository.save(request);
    }

    // ===================== OrderService goi =====================

    /**
     * Giu yeu cau cho don dang dat va tra ve yeu cau (co gia da bao). Nem loi neu yeu cau
     * khong thuoc nguoi dat, chua bao gia hoac da nam trong don khac.
     */
    public CustomRequest claim(Long id, Long userId) {
        CustomRequest request = getOwned(id, userId);
        if (repository.claim(id, userId, CustomRequestStatus.QUOTED, CustomRequestStatus.ORDERED) == 0) {
            throw new ConflictException(request.getStatus() == CustomRequestStatus.NEW
                    ? "Yêu cầu " + request.getCode() + " chưa được studio báo giá"
                    : "Yêu cầu " + request.getCode() + " đang ở trạng thái \"" + request.getStatus().getLabel()
                    + "\", không đặt được");
        }
        return get(id);
    }

    /** Dat hang that bai sau khi da claim: tra yeu cau ve "da bao gia". */
    public void release(Long id) {
        repository.release(id, CustomRequestStatus.ORDERED, CustomRequestStatus.QUOTED);
    }

    /** Don da luu: ghi lai don nao dung yeu cau. */
    public void attachOrder(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getCustomRequestId() != null) {
                repository.findById(item.getCustomRequestId()).ifPresent(r -> {
                    r.setOrderId(order.getId());
                    r.setOrderCode(order.getCode());
                    repository.save(r);
                });
            }
        }
    }

    /** Don bi huy: yeu cau quay ve "da bao gia" de khach dat lai khi can. */
    public void releaseFor(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getCustomRequestId() != null) {
                release(item.getCustomRequestId());
            }
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
