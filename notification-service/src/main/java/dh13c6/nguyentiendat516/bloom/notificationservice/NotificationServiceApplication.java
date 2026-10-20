package dh13c6.nguyentiendat516.bloom.notificationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * notification-service: nghe su kien don hang tren RabbitMQ va gui email.
 *
 * Service DUY NHAT khong duoc ai goi dong bo de lam nghiep vu: no chi nghe. order-service
 * khong biet no ton tai - tat notification-service thi dat hang van binh thuong, tin nhan
 * nam cho trong hang doi, bat lai thi gui bu.
 */
@SpringBootApplication
public class NotificationServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(NotificationServiceApplication.class, args);
	}

}
