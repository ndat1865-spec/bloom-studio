package dh13c6.nguyentiendat516.bloom.paymentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * payment-service: tao link thanh toan VNPay / MoMo / ZaloPay, kiem tra chu ky ket qua
 * tra ve va bao cho order-service biet don da duoc thanh toan.
 *
 * EnableScheduling: doi soat dinh ky cac giao dich con treo (xem PaymentReconciler).
 */
@SpringBootApplication
@EnableScheduling
public class PaymentServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(PaymentServiceApplication.class, args);
	}

}
