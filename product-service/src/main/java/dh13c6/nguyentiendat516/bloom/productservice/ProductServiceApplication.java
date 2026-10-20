package dh13c6.nguyentiendat516.bloom.productservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
// Bat quet cac lop @ConfigurationProperties (UploadProperties) - giong ban monolith
@ConfigurationPropertiesScan
public class ProductServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProductServiceApplication.class, args);
	}

}
