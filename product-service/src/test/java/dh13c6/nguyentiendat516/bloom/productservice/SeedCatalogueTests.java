package dh13c6.nguyentiendat516.bloom.productservice;

import dh13c6.nguyentiendat516.bloom.productservice.config.FlowerDetailSeeder;
import dh13c6.nguyentiendat516.bloom.productservice.entity.BouquetSize;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * File du lieu seed va thu muc anh phai luon khop nhau.
 *
 * Khong co test nay thi doi ten mot file anh, hoac them mot dong seed tro toi anh khong
 * ton tai, se khong ai biet cho toi luc mo cua hang tren trinh duyet va thay o trong.
 */
class SeedCatalogueTests {

    private static final int SO_COT = 6;

    @Test
    void seedFileIsWellFormedAndEveryImageExists() throws Exception {
        List<String[]> dong = docFileSeed();

        assertEquals(20, dong.size(), "So san pham seed thay doi ngoai y muon");

        Set<String> ten = new LinkedHashSet<>();
        Set<String> danhMuc = new LinkedHashSet<>();
        for (String[] cot : dong) {
            String tenSanPham = cot[0].trim();
            assertFalse(tenSanPham.isEmpty(), "Ten san pham rong");
            assertTrue(ten.add(tenSanPham), "Ten san pham bi trung: " + tenSanPham);

            assertTrue(Double.parseDouble(cot[1].trim()) > 0, "Gia khong hop le: " + tenSanPham);
            assertTrue(Integer.parseInt(cot[2].trim()) >= 0, "Ton kho am: " + tenSanPham);

            String anh = cot[3].trim();
            assertTrue(anh.startsWith("uploads/seed/"),
                    "Anh seed phai nam trong classpath, khong phu thuoc thu muc lam viec: " + anh);
            assertTrue(new ClassPathResource("static/" + anh).exists(),
                    "Thieu file anh cho san pham " + tenSanPham + ": " + anh);

            danhMuc.add(cot[4].trim());
            assertFalse(cot[5].trim().isEmpty(), "Mo ta rong: " + tenSanPham);
        }

        assertEquals(Set.of("Bespoke Arrangements", "Event Florals", "Wedding Flowers"), danhMuc);
    }

    /** Moi san pham seed deu co ten tieng Viet + thanh phan, va khong co dong nao tro toi ten la. */
    @Test
    void flowerDetailFileCoversEverySeedProduct() throws Exception {
        Set<String> tenGoc = new LinkedHashSet<>();
        for (String[] cot : docFileSeed()) {
            tenGoc.add(cot[0].trim());
        }

        Set<String> daCo = new LinkedHashSet<>();
        Set<String> tenMoi = new LinkedHashSet<>();
        for (String[] cot : docFile(FlowerDetailSeeder.SEED_FILE, FlowerDetailSeeder.SO_COT)) {
            String ten = cot[0].trim();
            assertTrue(tenGoc.contains(ten), "Dong chi tiet tro toi san pham khong co trong seed: " + ten);
            assertTrue(daCo.add(ten), "Trung dong chi tiet: " + ten);
            assertTrue(tenMoi.add(cot[1].trim()), "Ten tieng Viet bi trung: " + cot[1]);
            String soBong = cot[2].trim();
            assertTrue("-".equals(soBong) || Integer.parseInt(soBong) > 0, "So bong sai: " + ten);
            assertTrue(Set.of("0", "1").contains(cot[3].trim()), "Cot co bo phai la 0/1: " + ten);
            int datTruoc = Integer.parseInt(cot[4].trim());
            assertTrue(datTruoc >= 0 && datTruoc <= 30, "So ngay dat truoc sai: " + ten);
            assertFalse(cot[5].trim().isEmpty(), "Thanh phan rong: " + ten);
            assertFalse(cot[6].trim().isEmpty(), "Mo ta rong: " + ten);
        }
        assertEquals(tenGoc, daCo, "Con san pham seed chua co ten tieng Viet / thanh phan");
    }

    @Test
    void bouquetSizePricesRoundToTenThousand() {
        assertEquals(510_000, BouquetSize.SMALL.priceOf(680_000.0));
        assertEquals(680_000, BouquetSize.STANDARD.priceOf(680_000.0));
        assertEquals(950_000, BouquetSize.LARGE.priceOf(680_000.0));
        assertEquals(340_000, BouquetSize.SMALL.priceOf(450_000.0));
        assertEquals(11, BouquetSize.SMALL.stemsOf(15));
        assertEquals(23, BouquetSize.LARGE.stemsOf(15));
        assertEquals(1, BouquetSize.SMALL.stemsOf(1));
        assertEquals(null, BouquetSize.LARGE.stemsOf(null));
    }

    private List<String[]> docFileSeed() throws Exception {
        return docFile("seed/danh-muc-hoa.txt", SO_COT);
    }

    private List<String[]> docFile(String file, int soCot) throws Exception {
        List<String[]> ketQua = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(file).getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }
                String[] cot = line.split(Pattern.quote("|"), soCot);
                assertEquals(soCot, cot.length, "Dong seed thieu cot: " + line);
                ketQua.add(cot);
            }
        }
        return ketQua;
    }
}
