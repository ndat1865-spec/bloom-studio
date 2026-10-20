-- =====================================================================
-- Sua anh xa tai khoan sau khi chay migrate-from-monolith.sql
--
-- VAN DE: auth-service khoi dong truoc da chay DataSeeder tao san
-- admin (id 1) va john (id 2). Khi script chuyen du lieu chay toi,
-- hai id do da bi chiem nen INSERT IGNORE bo qua toan bo tai khoan cu.
--
-- Hau qua cu the tren du lieu that:
--   ptpmhdv.users     id 2 = 'customer' (Dat Nguyen, Phu Tho)
--   bloom_auth.users  id 2 = 'john'     (rong)
--   bloom_order.orders  user_id = 2, username = 'customer'
-- => hai don hang cua 'customer' dang tro vao tai khoan 'john'.
--
-- Script nay khop theo USERNAME chu khong theo ID, nen chay lai nhieu
-- lan van an toan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Them nhung tai khoan cu chua co trong bloom_auth
-- ---------------------------------------------------------------------
-- KHONG chi dinh id: de MySQL tu cap id moi, tranh dung vao id ma
-- DataSeeder da dung.
INSERT INTO bloom_auth.users
    (username, password, role, full_name, email, phone, address, city)
SELECT
    o.username,
    -- BCrypt cua "bloom123" (da kiem chung bang BCryptPasswordEncoder.matches)
    '$2a$10$7o47S2NFVGemcM69CnhO1.30GVXUCoF0jFn7FRFH68OAdvoficyHS',
    o.role, o.full_name, o.email, o.phone, o.address, o.city
FROM ptpmhdv.users o
WHERE NOT EXISTS (
    SELECT 1 FROM bloom_auth.users b WHERE b.username = o.username
);

-- ---------------------------------------------------------------------
-- 2. Chep ho so cho tai khoan da ton tai san (vi du 'admin')
-- ---------------------------------------------------------------------
-- KHONG dung toi cot password: giu nguyen chuoi BCrypt ma DataSeeder da
-- tao, de mat khau dang dung duoc khong bi doi.
-- COALESCE: chi ghi de khi ban cu that su co du lieu.
UPDATE bloom_auth.users b
JOIN ptpmhdv.users o ON o.username = b.username
SET b.full_name = COALESCE(o.full_name, b.full_name),
    b.email     = COALESCE(o.email,     b.email),
    b.phone     = COALESCE(o.phone,     b.phone),
    b.address   = COALESCE(o.address,   b.address),
    b.city      = COALESCE(o.city,      b.city);

-- ---------------------------------------------------------------------
-- 3. Tro lai user_id cua don hang cho dung chu
-- ---------------------------------------------------------------------
-- Khop theo cot username da duoc CHUP LAI trong chinh bang orders, khong
-- khop theo id cu - nho vay chay lai lan hai khong lam hong du lieu.
-- WHERE ord.id > 0 la BAT BUOC, khong phai thua: MySQL Workbench bat san
-- safe update mode, no tu choi moi UPDATE khong co dieu kien tren cot khoa.
-- Cau UPDATE o muc 2 lot qua vi join tren username von la UNIQUE, con
-- orders.username chi la varchar thuong nen phai them dieu kien tren khoa
-- chinh. Cach nay an toan hon la tat safe mode di.
UPDATE bloom_order.orders ord
JOIN bloom_auth.users b ON b.username = ord.username
SET ord.user_id = b.id
WHERE ord.id > 0;

-- =====================================================================
-- KIEM TRA SAU KHI CHAY
-- =====================================================================
SELECT b.id, b.username, b.role, b.full_name, b.city,
       (SELECT COUNT(*) FROM bloom_order.orders o WHERE o.user_id = b.id) AS so_don
FROM bloom_auth.users b
ORDER BY b.id;

-- Phai KHONG con dong nao: don hang tro vao tai khoan khong ton tai
SELECT o.id, o.code, o.user_id, o.username
FROM bloom_order.orders o
LEFT JOIN bloom_auth.users b ON b.id = o.user_id
WHERE o.user_id IS NOT NULL AND b.id IS NULL;
