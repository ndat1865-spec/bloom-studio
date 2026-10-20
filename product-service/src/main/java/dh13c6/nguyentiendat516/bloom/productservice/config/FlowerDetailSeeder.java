package dh13c6.nguyentiendat516.bloom.productservice.config;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.repository.CategoryRepository;
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
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Viet hoa danh muc hoa mac dinh va gan thanh phan / so bong / co bo / so ngay dat truoc.
 *
 * Chay SAU AttributeSeeder (Order 3) vi AttributeSeeder so khop theo ten goc tieng Anh.
 * Chay ca tren CSDL da co du lieu: chi dong vao san pham CHUA co thanh phan, nen ADMIN
 * da sua tay roi thi khong bi ghi de o lan khoi dong sau.
 */
@Component
@Order(3)
public class FlowerDetailSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(FlowerDetailSeeder.class);

    public static final String SEED_FILE = "seed/chi-tiet-hoa.txt";

    public static final int SO_COT = 7;

    /** Ten danh muc goc -> ten tieng Viet. Chi doi khi ten van con dung nhu goc. */
    public static final Map<String, String> TEN_DANH_MUC = Map.of(
            "Bespoke Arrangements", "Bó hoa & bình hoa",
            "Event Florals", "Hoa sự kiện",
            "Wedding Flowers", "Hoa cưới");

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public FlowerDetailSeeder(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(String... args) throws IOException {
        doiTenDanhMuc();

        List<Product> chuaCo = productRepository.findAll().stream()
                .filter(p -> p.getComposition() == null)
                .toList();
        if (chuaCo.isEmpty()) {
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
                String[] cot = dong.split(Pattern.quote("|"), SO_COT);
                if (cot.length < SO_COT) {
                    log.warn("Bo qua dong chi tiet hoa thieu cot: {}", dong);
                    continue;
                }
                String tenGoc = cot[0].trim();
                String tenMoi = cot[1].trim();
                for (Product p : chuaCo) {
                    // Khop ca ten goc lan ten da Viet hoa (ADMIN doi ten truoc khi co cot thanh phan)
                    if (p.getName().equalsIgnoreCase(tenGoc) || p.getName().equalsIgnoreCase(tenMoi)) {
                        p.setName(tenMoi);
                        p.setStemCount("-".equals(cot[2].trim()) ? null : Integer.valueOf(cot[2].trim()));
                        p.setSized("1".equals(cot[3].trim()));
                        p.setLeadDays(Integer.valueOf(cot[4].trim()));
                        p.setComposition(cot[5].trim());
                        p.setDescription(cot[6].trim());
                        productRepository.save(p);
                        dem++;
                    }
                }
            }
        }
        if (dem > 0) {
            log.info("Da Viet hoa va gan thanh phan cho {} san pham", dem);
        }
    }

    private void doiTenDanhMuc() {
        for (Category c : categoryRepository.findAll()) {
            String tenMoi = TEN_DANH_MUC.get(c.getName());
            if (tenMoi != null && categoryRepository.findAll().stream().noneMatch(k -> tenMoi.equals(k.getName()))) {
                c.setName(tenMoi);
                categoryRepository.save(c);
                log.info("Doi ten danh muc thanh {}", tenMoi);
            }
        }
    }
}
