-- =====================================================================
-- Doi gia san pham tu GBP sang VND (x 10.000): 68 -> 680.000d
--
-- Chi can cho CSDL da co du lieu tu truoc. CSDL moi (vi du sau
-- docker compose down -v) thi DataSeeder nap san gia VND, KHONG chay file nay.
--
-- Chay lai nhieu lan van an toan: lan dau ghi vao bang migration_log,
-- cac lan sau thay da co dong 'gbp-to-vnd' thi khong nhan them nua.
-- Docker: docker compose exec -T product-db mysql -uroot -p"$DB_PASSWORD" < database/gbp-sang-vnd-product.sql
-- =====================================================================
USE bloom_product;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS migration_log (
    name   VARCHAR(50) PRIMARY KEY,
    ran_at DATETIME    NOT NULL
);

-- "id > 0": MySQL Workbench bat safe update mode, UPDATE phai co dieu kien tren khoa chinh
UPDATE products
SET price = ROUND(price * 10000)
WHERE id > 0
  AND NOT EXISTS (SELECT 1 FROM migration_log WHERE name = 'gbp-to-vnd');

INSERT IGNORE INTO migration_log (name, ran_at) VALUES ('gbp-to-vnd', NOW());

-- Mo ta cu con nhac toi nuoc Anh - cua hang nay o Ha Noi. Khop theo ten, chay lai van an toan.
UPDATE products
SET description = 'Deep red hydrangea with silvered foliage, bound tight in a lush garden style.'
WHERE id > 0 AND name = 'Crimson Cluster';

UPDATE products
SET description = 'A low centrepiece in the countryside manner — field flowers and fresh herbs.'
WHERE id > 0 AND name = 'Country Table Centrepiece';

SELECT id, name, price FROM products ORDER BY id;
