package dh13c6.nguyentiendat516.bloom.notificationservice.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ha tang RabbitMQ phia BEN NHAN:
 *
 *   bloom.events (topic, order-service phat)
 *        |  order.#
 *        v
 *   notification.order-events  --(xu ly hong 3 lan)-->  bloom.events.dlx  -->  notification.order-events.dlq
 *
 * Queue BEN (durable): notification-service tat thi tin van nam cho, bat lai xu ly tiep.
 * Hang doi thu chet (DLQ) giu lai tin khong xu ly duoc de nguoi xem, thay vi vut di hoac
 * lap vo han.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "bloom.events";
    public static final String QUEUE = "notification.order-events";
    public static final String DLX = "bloom.events.dlx";
    public static final String DLQ = "notification.order-events.dlq";

    /** Khai lai exchange cung ten/kieu: ai khoi dong truoc cung duoc, RabbitMQ chi tao mot lan. */
    @Bean
    public TopicExchange bloomEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX, true, false);
    }

    @Bean
    public Queue orderEventsQueue() {
        return QueueBuilder.durable(QUEUE).deadLetterExchange(DLX).build();
    }

    @Bean
    public Queue orderEventsDeadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    public Binding orderEventsBinding() {
        return BindingBuilder.bind(orderEventsQueue()).to(bloomEventsExchange()).with("order.#");
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder.bind(orderEventsDeadLetterQueue()).to(deadLetterExchange()).with("#");
    }
}
