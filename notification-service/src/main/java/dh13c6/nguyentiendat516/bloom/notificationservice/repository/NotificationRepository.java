package dh13c6.nguyentiendat516.bloom.notificationservice.repository;

import dh13c6.nguyentiendat516.bloom.notificationservice.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    boolean existsByEventIdAndAudience(String eventId, Notification.Audience audience);

    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Notification> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
