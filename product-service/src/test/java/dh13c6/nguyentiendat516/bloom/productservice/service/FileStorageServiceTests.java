package dh13c6.nguyentiendat516.bloom.productservice.service;

import dh13c6.nguyentiendat516.bloom.productservice.config.UploadProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * imageUrl tra ve phai la duong dan WEB, khong phai duong dan tren dia.
 *
 * Da tung sai: ham ghep imageUrl tu app.upload.dir. Khi gia tri do la tuong doi
 * ("uploads") thi duong dan dia va duong dan web tinh co giong nhau nen khong ai thay.
 * Chay bang Docker, UPLOAD_DIR la "/var/bloom/uploads" tuyet doi, imageUrl thanh
 * "/var/bloom/uploads/..." va trinh duyet tra 404. Test nay dung THU MUC TUYET DOI
 * de tach han hai khai niem do ra.
 */
class FileStorageServiceTests {

    @Test
    void savedImageUrlIsWebPathEvenWhenUploadDirIsAbsolute(@TempDir Path tempDir) throws Exception {
        Path uploadDir = tempDir.resolve("var").resolve("bloom").resolve("uploads");

        UploadProperties properties = new UploadProperties();
        properties.setDir(uploadDir.toAbsolutePath().toString());
        FileStorageService service = new FileStorageService(properties);

        MockMultipartFile file = new MockMultipartFile(
                "file", "hoa-hong.jpg", "image/jpeg", new byte[] {1, 2, 3});

        String imageUrl = service.saveFile(file);

        assertTrue(imageUrl.startsWith("uploads/"), "imageUrl phai bat dau bang uploads/: " + imageUrl);
        assertTrue(imageUrl.endsWith("_hoa-hong.jpg"), imageUrl);
        assertFalse(imageUrl.contains(uploadDir.toAbsolutePath().toString()),
                "imageUrl lo duong dan tren dia: " + imageUrl);
        assertFalse(imageUrl.startsWith("/"), "imageUrl khong duoc co dau / dau: " + imageUrl);

        // File van phai nam dung cho tren dia.
        String tenFile = imageUrl.substring("uploads/".length());
        assertTrue(Files.exists(uploadDir.resolve(tenFile)), "Khong tim thay file da luu tren dia");
        assertEquals(3, Files.size(uploadDir.resolve(tenFile)));
    }
}
