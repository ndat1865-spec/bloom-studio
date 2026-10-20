package dh13c6.nguyentiendat516.bloom.orderservice.events;

import dh13c6.nguyentiendat516.bloom.orderservice.entity.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

/**
 * Phat su kien don hang len RabbitMQ - giao tiep BAT DONG BO duy nhat cua he thong.
 *
 * order-service chi "ke lai chuyen vua xay ra" roi di tiep, khong biet ai nghe va nghe de
 * lam gi. Hom nay notification-service nghe de gui email; mai them service thong ke hay
 * tich diem thi chi can tao queue moi buoc vao exchange, order-service khong phai sua.
 *
 * Nguyen tac: phat su kien SAU khi da luu don, va phat HONG thi chi ghi log - khong bao
 * gio lam hong viec dat hang / thanh toan chi vi khong gui duoc thong bao.
 *
 * GIOI HAN DA BIET: neu tien trinh chet dung giua "luu don" va "phat su kien" thi su kien
 * mat (at-most-once o phia phat). Cach lam dung la Transactional Outbox: ghi su kien vao
 * bang cung transaction voi don, mot tien trinh khac doc bang do roi phat.
 */
@Component
public class OrderEventPublisher {

    public static final String EXCHANGE = "bloom.events";

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public OrderEventPublisher(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(OrderEvent.Type type, Order order) {
        OrderEvent event = OrderEvent.of(type, order);
        try {
            Message message = MessageBuilder
                    .withBody(objectMapper.writeValueAsString(event).getBytes(StandardCharsets.UTF_8))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                    .setContentEncoding("UTF-8")
                    .setMessageId(event.eventId())
                    .setType(event.type())
                    .build();
            rabbitTemplate.send(EXCHANGE, type.routingKey(), message);
            log.info("Đã phát sự kiện {} cho đơn {}", type.routingKey(), order.getCode());
        } catch (RuntimeException e) {
            log.warn("Không phát được sự kiện {} cho đơn {}: {}", type.routingKey(), order.getCode(), e.getMessage());
        }
    }

    /**
     * Exchange kieu topic, ben BEN PHAT khai. Ben nhan tu khai queue cua minh va buoc vao
     * voi mau routing key minh quan tam (vi du "order.#" = moi su kien don hang).
     */
    @Configuration
    public static class ExchangeConfig {

        @Bean
        public TopicExchange bloomEventsExchange() {
            return new TopicExchange(EXCHANGE, true, false);
        }
    }
}
