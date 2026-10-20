package dh13c6.nguyentiendat516.bloom.notificationservice.messaging;

import dh13c6.nguyentiendat516.bloom.notificationservice.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

/**
 * Nhan tung su kien don hang tu queue.
 *
 * Doc body bang tay (JSON -> OrderEvent) thay vi de Spring tu chuyen: tin hong (JSON sai)
 * nem loi ro rang, bi thu lai 3 lan roi sang DLQ - xem RabbitConfig.
 */
@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    public OrderEventListener(ObjectMapper objectMapper, NotificationService notificationService) {
        this.objectMapper = objectMapper.rebuild()
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onMessage(Message message) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        OrderEvent event = objectMapper.readValue(body, OrderEvent.class);
        if (event.eventId() == null || event.type() == null) {
            throw new IllegalArgumentException("Su kien thieu eventId/type: " + body);
        }
        log.info("Nhận sự kiện {} của đơn {}", event.type(), event.orderCode());
        notificationService.handle(event);
    }
}
