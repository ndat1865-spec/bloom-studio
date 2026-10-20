package dh13c6.nguyentiendat516.bloom.orderservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Doi cot orders.status tu ENUM cua MySQL sang VARCHAR.
 *
 * Hibernate tao cot @Enumerated(STRING) thanh enum('PENDING','CONFIRMED',...) va
 * ddl-auto=update KHONG mo rong danh sach khi them PREPARING / SHIPPING - chuyen don sang
 * hai trang thai do se bao "Data truncated". VARCHAR thi them trang thai moi khong phai
 * sua CSDL nua.
 *
 * Idempotent: cot da la varchar thi bo qua, chay tay hay Docker deu dung duoc.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SchemaUpgrade implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaUpgrade.class);

    private final JdbcTemplate jdbc;

    public SchemaUpgrade(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        String type = jdbc.query(
                "select data_type from information_schema.columns "
                        + "where table_schema = database() and table_name = 'orders' and column_name = 'status'",
                rs -> rs.next() ? rs.getString(1) : null);
        if ("enum".equalsIgnoreCase(type)) {
            jdbc.execute("alter table orders modify column status varchar(20) not null");
            log.info("Đã đổi cột orders.status từ ENUM sang VARCHAR(20) để thêm PREPARING, SHIPPING");
        }
    }
}
