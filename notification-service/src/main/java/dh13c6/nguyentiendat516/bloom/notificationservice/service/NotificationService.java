package dh13c6.nguyentiendat516.bloom.notificationservice.service;

import dh13c6.nguyentiendat516.bloom.notificationservice.client.AuthClient;
import dh13c6.nguyentiendat516.bloom.notificationservice.entity.Notification;
import dh13c6.nguyentiendat516.bloom.notificationservice.messaging.OrderEvent;
import dh13c6.nguyentiendat516.bloom.notificationservice.repository.NotificationRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Bien mot su kien don hang thanh toi da hai email: cho khach va cho cua hang.
 *
 * Moi nguoi nhan xu ly doc lap va ghi nhat ky rieng: gui cho khach loi thi thu cho cua hang
 * van di. Loi SMTP / khong tra duoc email chi ghi FAILED, KHONG nem ra ngoai - nem ra thi
 * RabbitMQ thu lai ca su kien va gui trung thu cho nguoi da nhan roi.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository repository;
    private final AuthClient authClient;
    private final JavaMailSender mailSender;
    private final String from;
    private final String shopEmail;
    private final String storeUrl;
    private final String mediaBaseUrl;

    public NotificationService(NotificationRepository repository, AuthClient authClient, JavaMailSender mailSender,
                               @Value("${notification.from}") String from,
                               @Value("${notification.shop-email}") String shopEmail,
                               @Value("${notification.store-url}") String storeUrl,
                               @Value("${notification.media-base-url}") String mediaBaseUrl) {
        this.repository = repository;
        this.authClient = authClient;
        this.mailSender = mailSender;
        this.from = from;
        this.shopEmail = shopEmail;
        this.storeUrl = storeUrl;
        this.mediaBaseUrl = mediaBaseUrl;
    }

    public void handle(OrderEvent event) {
        notifyCustomer(event);
        notifyShop(event);
    }

    private void notifyCustomer(OrderEvent event) {
        if (repository.existsByEventIdAndAudience(event.eventId(), Notification.Audience.CUSTOMER)) {
            log.info("Bỏ qua sự kiện lặp {} ({})", event.eventId(), event.type());
            return;
        }
        Notification record = base(event, Notification.Audience.CUSTOMER);
        if (event.userId() == null) {
            skip(record, "Khách vãng lai, không có tài khoản");
            return;
        }
        Optional<AuthClient.Contact> contact;
        try {
            contact = authClient.contact(event.userId());
        } catch (RuntimeException e) {
            fail(record, "Không tra được email từ auth-service: " + e.getMessage());
            return;
        }
        if (contact.isEmpty() || contact.get().email() == null) {
            skip(record, "Tài khoản chưa khai báo email");
            return;
        }
        EmailTemplates.Email email = EmailTemplates.forCustomer(event, contact.get().displayName(), storeUrl, mediaBaseUrl);
        if (email == null) {
            skip(record, "Loại sự kiện không gửi khách");
            return;
        }
        send(record, contact.get().email(), email);
    }

    private void notifyShop(OrderEvent event) {
        EmailTemplates.Email email = EmailTemplates.forShop(event);
        if (email == null || repository.existsByEventIdAndAudience(event.eventId(), Notification.Audience.SHOP)) {
            return;
        }
        send(base(event, Notification.Audience.SHOP), shopEmail, email);
    }

    private void send(Notification record, String to, EmailTemplates.Email email) {
        record.setRecipient(to);
        record.setSubject(email.subject());
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(email.subject());
            helper.setText(email.html(), true);
            mailSender.send(message);
            record.setStatus(Notification.Status.SENT);
            log.info("Đã gửi \"{}\" tới {}", email.subject(), to);
        } catch (Exception e) {
            record.setStatus(Notification.Status.FAILED);
            record.setDetail(truncate("Gửi email lỗi: " + e.getMessage()));
            log.warn("Gửi email tới {} lỗi: {}", to, e.getMessage());
        }
        save(record);
    }

    private Notification base(OrderEvent event, Notification.Audience audience) {
        Notification n = new Notification();
        n.setEventId(event.eventId());
        n.setEventType(event.type());
        n.setOrderId(event.orderId());
        n.setOrderCode(event.orderCode());
        n.setAudience(audience);
        return n;
    }

    private void skip(Notification record, String reason) {
        record.setStatus(Notification.Status.SKIPPED);
        record.setDetail(reason);
        save(record);
    }

    private void fail(Notification record, String reason) {
        record.setStatus(Notification.Status.FAILED);
        record.setDetail(truncate(reason));
        save(record);
    }

    /** Hai tin lap toi cung luc: ben ghi sau vap rang buoc duy nhat - coi nhu da xu ly. */
    private void save(Notification record) {
        try {
            repository.save(record);
        } catch (DataIntegrityViolationException e) {
            log.info("Sự kiện {} đã được xử lý bởi luồng khác", record.getEventId());
        }
    }

    private static String truncate(String value) {
        return value == null || value.length() <= 500 ? value : value.substring(0, 500);
    }
}
