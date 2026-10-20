package dh13c6.nguyentiendat516.bloom.authservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Doi cot users.role tu ENUM cua MySQL sang VARCHAR.
 *
 * Hibernate tao cot @Enumerated(STRING) thanh enum('ADMIN','CUSTOMER') va ddl-auto=update
 * KHONG mo rong danh sach do khi them STAFF - insert "STAFF" bao "Data truncated" va
 * DataSeeder lam sap ca service. VARCHAR thi them role moi khong phai sua CSDL nua.
 *
 * Chay TRUOC DataSeeder (HIGHEST_PRECEDENCE). Idempotent: cot da la varchar thi bo qua,
 * nen chay tay hay Docker, CSDL cu hay moi deu dung duoc.
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
                        + "where table_schema = database() and table_name = 'users' and column_name = 'role'",
                rs -> rs.next() ? rs.getString(1) : null);
        if ("enum".equalsIgnoreCase(type)) {
            jdbc.execute("alter table users modify column role varchar(20) not null");
            log.info("Đã đổi cột users.role từ ENUM sang VARCHAR(20) để thêm quyền STAFF");
        }
    }
}
