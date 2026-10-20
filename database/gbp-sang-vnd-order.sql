-- =====================================================================
-- Doi tien trong don hang va ma giam gia tu GBP sang VND (x 10.000)
--
-- Chi can cho CSDL da co du lieu tu truoc (xem gbp-sang-vnd-product.sql).
-- Chay lai nhieu lan van an toan nho bang migration_log.
-- Docker: docker compose exec -T order-db mysql -uroot -p"$DB_PASSWORD" < database/gbp-sang-vnd-order.sql
-- =====================================================================
USE bloom_order;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS migration_log (
    name   VARCHAR(50) PRIMARY KEY,
    ran_at DATETIME    NOT NULL
);

UPDATE order_items
SET unit_price = ROUND(unit_price * 10000),
    line_total = ROUND(line_total * 10000)
WHERE id > 0
  AND NOT EXISTS (SELECT 1 FROM migration_log WHERE name = 'gbp-to-vnd');

UPDATE order_addons
SET unit_price = ROUND(unit_price * 10000),
    line_total = ROUND(line_total * 10000)
WHERE id > 0
  AND NOT EXISTS (SELECT 1 FROM migration_log WHERE name = 'gbp-to-vnd');

UPDATE orders
SET subtotal     = ROUND(subtotal * 10000),
    delivery_fee = ROUND(delivery_fee * 10000),
    total        = ROUND(total * 10000),
    extras_total = ROUND(extras_total * 10000),
    discount     = ROUND(discount * 10000)
WHERE id > 0
  AND NOT EXISTS (SELECT 1 FROM migration_log WHERE name = 'gbp-to-vnd');

-- Ma giam gia: chi doi so tien, KHONG doi muc giam theo phan tram
UPDATE vouchers
SET discount_value  = IF(type = 'FIXED', ROUND(discount_value * 10000), discount_value),
    max_discount    = ROUND(max_discount * 10000),
    min_order_value = ROUND(min_order_value * 10000)
WHERE id > 0
  AND NOT EXISTS (SELECT 1 FROM migration_log WHERE name = 'gbp-to-vnd');

INSERT IGNORE INTO migration_log (name, ran_at) VALUES ('gbp-to-vnd', NOW());

SELECT id, code, subtotal, delivery_fee, total FROM orders ORDER BY id;
SELECT code, type, discount_value, max_discount, min_order_value FROM vouchers;
