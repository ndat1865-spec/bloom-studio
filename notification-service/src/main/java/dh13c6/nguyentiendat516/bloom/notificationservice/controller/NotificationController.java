package dh13c6.nguyentiendat516.bloom.notificationservice.controller;

import dh13c6.nguyentiendat516.bloom.notificationservice.dto.NotificationResponse;
import dh13c6.nguyentiendat516.bloom.notificationservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.notificationservice.repository.NotificationRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Nhat ky thong bao - chi ADMIN (khai o SecurityConfig). */
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public PageResponse<NotificationResponse> list(Pageable pageable) {
        return PageResponse.from(repository.findAllByOrderByCreatedAtDesc(pageable), NotificationResponse::from);
    }

    @GetMapping("/order/{orderId}")
    public List<NotificationResponse> byOrder(@PathVariable Long orderId) {
        return repository.findByOrderIdOrderByCreatedAtDesc(orderId).stream().map(NotificationResponse::from).toList();
    }
}
