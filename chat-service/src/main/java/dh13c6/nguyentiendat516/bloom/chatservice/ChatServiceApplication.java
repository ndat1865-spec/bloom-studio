package dh13c6.nguyentiendat516.bloom.chatservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * chat-service: chat giua khach va studio.
 *
 * Tin nhan dau tien do tro ly AI (Claude API) tra loi - tu van hoa theo du lieu that cua
 * product-service va order-service. Khach can nguoi that, hoac AI khong chac, thi cuoc chat
 * chuyen sang hang cho cua nhan vien. Thieu ANTHROPIC_API_KEY thi moi cuoc chat vao thang
 * hang cho nhan vien - service van chay binh thuong.
 */
@SpringBootApplication
public class ChatServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChatServiceApplication.class, args);
	}

}
