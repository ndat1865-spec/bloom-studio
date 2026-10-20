package dh13c6.nguyentiendat516.bloom.productservice.config;

import dh13c6.nguyentiendat516.bloom.productservice.entity.FlowerColor;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Occasion;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Gan dip va mau cho danh muc hoa mac dinh.
 *
 * Chay SAU DataSeeder (Order 2) va chay ca tren CSDL da co du lieu tu truoc: 20 san pham
 * chuyen tu monolith sang deu chua co hai thuoc tinh nay, khong gan thi bo loc theo dip
 * se ra rong. Chi dong vao san pham chua co dip VA chua co mau, nen ADMIN da sua tay
 * roi thi khong bi ghi de o lan khoi dong sau.
 */
@Component
@Order(2)
public class AttributeSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AttributeSeeder.class);

    /** Moi dong: ten san pham | DIP1,DIP2 | MAU */
    private static final String SEED_FILE = "seed/thuoc-tinh-hoa.txt";

    private final ProductRepository productRepository;

    public AttributeSeeder(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) throws IOException {
        List<Product> chuaGan = productRepository.findAll().stream()
                .filter(p -> p.getOccasions().isEmpty() && p.getColor() == null)
                .toList();
        if (chuaGan.isEmpty()) {
            return;
        }

        int dem = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(SEED_FILE).getInputStream(), StandardCharsets.UTF_8))) {
            String dong;
            while ((dong = reader.readLine()) != null) {
                if (dong.isBlank() || dong.startsWith("#")) {
                    continue;
                }
                String[] cot = dong.split(Pattern.quote("|"), 3);
                if (cot.length < 3) {
                    log.warn("Bo qua dong thuoc tinh thieu cot: {}", dong);
                    continue;
                }
                String ten = cot[0].trim();
                Set<Occasion> dip = Arrays.stream(cot[1].split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(Occasion::valueOf)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
                FlowerColor mau = FlowerColor.valueOf(cot[2].trim());

                for (Product p : chuaGan) {
                    if (p.getName().equalsIgnoreCase(ten)) {
                        p.setOccasions(dip);
                        p.setColor(mau);
                        productRepository.save(p);
                        dem++;
                    }
                }
            }
        }
        if (dem > 0) {
            log.info("Da gan dip va mau cho {} san pham", dem);
        }
    }
}
