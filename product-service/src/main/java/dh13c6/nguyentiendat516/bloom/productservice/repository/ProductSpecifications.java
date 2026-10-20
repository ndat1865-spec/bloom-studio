package dh13c6.nguyentiendat516.bloom.productservice.repository;

import dh13c6.nguyentiendat516.bloom.productservice.entity.BouquetSize;
import dh13c6.nguyentiendat516.bloom.productservice.entity.FlowerColor;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Occasion;
import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

/**
 * Ghep dieu kien loc san pham thanh MOT cau truy van duy nhat.
 *
 * Truoc day moi to hop (ten, danh muc, ten + danh muc) la mot phuong thuc repository
 * rieng. Them dip, mau, khoang gia ma van lam kieu do thi so phuong thuc tang theo cap
 * so nhan, nen chuyen sang Specification: dieu kien nao co gia tri thi moi them vao WHERE.
 * Loc, sap xep va phan trang van chay duoi CSDL.
 */
public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> matching(String name, Long categoryId, Occasion occasion,
                                                  FlowerColor color, Double minPrice, Double maxPrice) {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();

            if (name != null && !name.isBlank()) {
                String keyword = name.trim().toLowerCase();
                Expression<String> column = cb.lower(root.get("name"));
                // Cot name dung utf8mb4_0900_ai_ci (khong phan biet dau) -> go "bó" ra ca "Bộ".
                // Khach go CO dau thi so phan biet dau; go khong dau ("bo") thi van khop moi kieu dau.
                if (hasVietnameseMarks(keyword)) {
                    column = ((HibernateCriteriaBuilder) cb).collate(column, ACCENT_SENSITIVE);
                }
                where.add(cb.like(column, "%" + keyword + "%"));
            }
            if (categoryId != null) {
                where.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (occasion != null) {
                // Dip nam o bang phu product_occasions -> can JOIN. Moi san pham chi co
                // mot dong khop voi mot dip cu the nen khong bi nhan ban ket qua.
                where.add(cb.equal(root.join("occasions"), occasion));
            }
            if (color != null) {
                where.add(cb.equal(root.get("color"), color));
            }
            // Loc theo gia "Tu ..." khach thay tren the, khong phai gia co Tieu chuan:
            // bo 520k co co Nho 390k phai hien khi khach loc "duoi 500k".
            if (minPrice != null || maxPrice != null) {
                Expression<Number> fromPrice = fromPrice(root, cb);
                if (minPrice != null) {
                    where.add(cb.ge(fromPrice, minPrice));
                }
                if (maxPrice != null) {
                    where.add(cb.le(fromPrice, maxPrice));
                }
            }
            return cb.and(where.toArray(new Predicate[0]));
        };
    }

    /**
     * Sap xep theo Sort cua client, rieng "price" la gia "Tu ..." (fromPrice) chu khong phai cot
     * price. Them id lam tieu chi cuoi de cac trang khong lap / sot bo cung gia.
     */
    public static Specification<Product> orderedBy(Sort sort) {
        return (root, query, cb) -> {
            // Truy van dem (count) cua Page khong can ORDER BY
            if (!Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                List<Order> orders = new ArrayList<>();
                for (Sort.Order o : sort) {
                    Expression<?> by = "price".equals(o.getProperty())
                            ? fromPrice(root, cb)
                            : path(root, o.getProperty());
                    orders.add(o.isAscending() ? cb.asc(by) : cb.desc(by));
                }
                if (sort.getOrderFor("id") == null) {
                    orders.add(cb.asc(root.get("id")));
                }
                query.orderBy(orders);
            }
            return cb.conjunction();
        };
    }

    /** "category.name" -> root.get("category").get("name"). */
    private static Path<?> path(Root<Product> root, String property) {
        Path<?> p = root;
        for (String part : property.split("\\.")) {
            p = p.get(part);
        }
        return p;
    }

    /**
     * Gia thap nhat cua san pham, tinh trong SQL y het BouquetSize.priceOf: co nhieu co thi lay
     * co re nhat (price x he so, lam tron toi 10.000d), chi mot co thi la price.
     * Math.round(x) = floor(x + 0.5) - viet bang FLOOR vi ROUND cua MySQL voi so thuc co the
     * lam tron .5 khac Java.
     */
    private static Expression<Number> fromPrice(Root<Product> root, CriteriaBuilder cb) {
        Expression<Double> price = root.get("price");
        double factor = BouquetSize.cheapest().getPriceFactor();
        Expression<Number> rounded = cb.prod(
                cb.floor(cb.sum(cb.quot(cb.prod(price, factor), 10_000.0), 0.5)), 10_000.0);
        return cb.<Number>selectCase()
                .when(cb.isTrue(root.get("sized")), rounded)
                .otherwise(price);
    }

    /** Phan biet dau, khong phan biet hoa thuong. */
    private static final String ACCENT_SENSITIVE = "utf8mb4_0900_as_ci";

    /** Co dau tieng Viet (sac, huyen, mu, moc...) hoac chu "đ". */
    static boolean hasVietnameseMarks(String text) {
        if (text.indexOf('đ') >= 0 || text.indexOf('Đ') >= 0) {
            return true;
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD).chars()
                .anyMatch(c -> Character.getType(c) == Character.NON_SPACING_MARK);
    }
}
