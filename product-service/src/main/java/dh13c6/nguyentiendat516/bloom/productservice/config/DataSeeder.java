package dh13c6.nguyentiendat516.bloom.productservice.config;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Category;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.repository.CategoryRepository;
import dh13c6.nguyentiendat516.bloom.productservice.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Nap danh muc hoa mac dinh khi bang products con RONG.
 *
 * Vi sao can: 20 san pham tren may lam do an den tu script chuyen du lieu
 * (database/migrate-from-monolith.sql), ma script do doc tu CSDL monolith ptpmhdv.
 * Ai clone repo ve chay tren MySQL moi - hay chay bang Docker Compose - se khong co
 * ptpmhdv nen mo cua hang ra thay rong khong. Lop nay lap chinh cho trong do, cung
 * kieu voi DataSeeder cua auth-service.
 *
 * Chi chay khi bang rong, nen may da co du lieu that thi khong bi dung toi.
 */
@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    /** Moi dong: ten | gia | ton kho | duong dan anh | danh muc | mo ta */
    private static final String SEED_FILE = "seed/danh-muc-hoa.txt";

    private static final int SO_COT = 6;

    private static final String NGAN_CACH = "|";

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public DataSeeder(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) throws IOException {
        if (productRepository.count() > 0) {
            return;
        }

        // Danh muc da co thi dung lai, khong tao trung ten.
        Map<String, Category> danhMuc = new LinkedHashMap<>();
        for (Category c : categoryRepository.findAll()) {
            danhMuc.put(c.getName(), c);
        }

        int dem = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(SEED_FILE).getInputStream(), StandardCharsets.UTF_8))) {
            String dong;
            while ((dong = reader.readLine()) != null) {
                if (dong.isBlank() || dong.startsWith("#")) {
                    continue;
                }
                // Pattern.quote de khoi phai escape dau | trong chuoi regex.
                // Gioi han SO_COT: cot mo ta duoc giu nguyen ke ca khi co dau | ben trong.
                String[] cot = dong.split(Pattern.quote(NGAN_CACH), SO_COT);
                if (cot.length < SO_COT) {
                    log.warn("Bo qua dong seed thieu cot: {}", dong);
                    continue;
                }

                Category category = danhMuc.computeIfAbsent(cot[4].trim(), ten -> {
                    Category moi = new Category();
                    moi.setName(ten);
                    return categoryRepository.save(moi);
                });

                Product product = new Product();
                product.setName(cot[0].trim());
                product.setPrice(Double.valueOf(cot[1].trim()));
                product.setStockQuantity(Integer.valueOf(cot[2].trim()));
                product.setImageUrl(cot[3].trim());
                product.setCategory(category);
                product.setDescription(cot[5].trim());
                productRepository.save(product);
                dem++;
            }
        }

        log.info("DataSeeder: da nap {} san pham vao {} danh muc", dem, danhMuc.size());
    }
}
