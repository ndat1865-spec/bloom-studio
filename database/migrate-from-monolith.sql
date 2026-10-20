-- =====================================================================
-- Chuyen du lieu tu CSDL monolith (ptpmhdv) sang 3 CSDL cua he microservices
--
-- CHAY SAU KHI da khoi dong ca 3 service it nhat mot lan, de Hibernate
-- (ddl-auto=update) tao xong cau truc bang o bloom_auth / bloom_product /
-- bloom_order. Script nay CHI chep du lieu, khong tao bang.
--
-- Chay bang MySQL Workbench: mo file, bam bieu tuong tia set.
-- Chay lai nhieu lan duoc: cac lenh deu dung INSERT IGNORE hoac kiem tra truoc.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TAI KHOAN  ptpmhdv.users  ->  bloom_auth.users
-- ---------------------------------------------------------------------
-- LUU Y QUAN TRONG: mat khau o ban monolith luu dang PLAIN TEXT, con
-- auth-service dung BCrypt. Chep nguyen mat khau cu sang se KHONG dang
-- nhap duoc, vi passwordEncoder.matches() se so mot chuoi thuong voi mot
-- chuoi bam va luon tra false.
--
-- Vi vay script dat lai mat khau cho MOI tai khoan chuyen sang thanh
-- "bloom123" (da bam san bang BCrypt o duoi). Nguoi dung doi lai sau.

-- KHONG chep cot id sang: neu auth-service da khoi dong truoc thi DataSeeder
-- da chiem id 1 va 2, INSERT IGNORE se bo qua toan bo tai khoan cu ma chi bao
-- warning, rat de bo sot. De MySQL tu cap id moi, roi chay tiep
-- fix-user-mapping.sql de tro lai user_id cua don hang cho dung chu.
INSERT INTO bloom_auth.users
    (username, password, role, full_name, email, phone, address, city)
SELECT
    u.username,
    -- BCrypt cua chuoi "bloom123" (da kiem chung bang BCryptPasswordEncoder.matches)
    '$2a$10$7o47S2NFVGemcM69CnhO1.30GVXUCoF0jFn7FRFH68OAdvoficyHS',
    u.role,
    u.full_name,
    u.email,
    u.phone,
    u.address,
    u.city
FROM ptpmhdv.users u
WHERE NOT EXISTS (
    SELECT 1 FROM bloom_auth.users b WHERE b.username = u.username
);

-- ---------------------------------------------------------------------
-- 2. DANH MUC  ptpmhdv.categories  ->  bloom_product.categories
-- ---------------------------------------------------------------------
INSERT IGNORE INTO bloom_product.categories (id, name)
SELECT c.id, c.name FROM ptpmhdv.categories c;

-- ---------------------------------------------------------------------
-- 3. SAN PHAM  ptpmhdv.products  ->  bloom_product.products
-- ---------------------------------------------------------------------
-- stock_quantity la truong MOI, ban monolith khong co. Dat mac dinh 50
-- cho moi san pham da ton tai de co hang ma test dat don ngay.
INSERT IGNORE INTO bloom_product.products
    (id, name, price, description, image_url, stock_quantity, category_id)
SELECT
    p.id, p.name, p.price, p.description, p.image_url, 50, p.category_id
FROM ptpmhdv.products p;

-- ---------------------------------------------------------------------
-- 4. DON HANG  ptpmhdv.orders  ->  bloom_order.orders
-- ---------------------------------------------------------------------
-- user_id doi tu khoa ngoai thanh so thuong - khong con rang buoc toan ven
-- giua hai CSDL, dung nhu thiet ke o docs/thiet-ke-bien-gioi-service.md.
-- username duoc ghep tu ptpmhdv.users mot lan duy nhat tai day (chup lai).
INSERT IGNORE INTO bloom_order.orders
    (id, code, customer_name, phone, address, note, delivery_date,
     subtotal, delivery_fee, total, status, created_at, user_id, username)
SELECT
    o.id, o.code, o.customer_name, o.phone, o.address, o.note, o.delivery_date,
    o.subtotal, o.delivery_fee, o.total, o.status, o.created_at,
    o.user_id,
    (SELECT u.username FROM ptpmhdv.users u WHERE u.id = o.user_id)
FROM ptpmhdv.orders o;

-- ---------------------------------------------------------------------
-- 5. DONG DON HANG  ptpmhdv.order_items  ->  bloom_order.order_items
-- ---------------------------------------------------------------------
-- image_url la truong MOI: chup lai anh san pham tai thoi diem chuyen du lieu,
-- de trang "Don hang cua toi" hien duoc thumbnail ma khong phai goi sang
-- product-service cho tung dong.
INSERT IGNORE INTO bloom_order.order_items
    (id, order_id, product_id, product_name, unit_price, quantity, line_total, image_url)
SELECT
    oi.id, oi.order_id, oi.product_id, oi.product_name,
    oi.unit_price, oi.quantity, oi.line_total,
    (SELECT p.image_url FROM ptpmhdv.products p WHERE p.id = oi.product_id)
FROM ptpmhdv.order_items oi;

-- =====================================================================
-- KIEM TRA SAU KHI CHAY
-- =====================================================================
SELECT 'bloom_auth.users'        AS bang, COUNT(*) AS so_dong FROM bloom_auth.users
UNION ALL SELECT 'bloom_product.categories',  COUNT(*) FROM bloom_product.categories
UNION ALL SELECT 'bloom_product.products',    COUNT(*) FROM bloom_product.products
UNION ALL SELECT 'bloom_order.orders',        COUNT(*) FROM bloom_order.orders
UNION ALL SELECT 'bloom_order.order_items',   COUNT(*) FROM bloom_order.order_items;
