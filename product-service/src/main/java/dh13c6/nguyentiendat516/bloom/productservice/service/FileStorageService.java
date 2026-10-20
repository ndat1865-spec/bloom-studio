package dh13c6.nguyentiendat516.bloom.productservice.service;

import dh13c6.nguyentiendat516.bloom.productservice.config.UploadProperties;
import dh13c6.nguyentiendat516.bloom.productservice.exception.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

/**
 * SOS07 - Tap trung viec luu file anh.
 * Tra ve duong dan tuong doi dang "uploads/<uuid>_<tenfile>" (khong co dau '/' dau)
 * de frontend ghep "http://localhost:8080/" + imageUrl ma khong bi lap dau '/' hoac 'uploads/'.
 */
@Service
public class FileStorageService {

    /**
     * Tien to cua duong dan WEB, co dinh va khong lien quan toi thu muc tren dia.
     * WebConfig anh xa "/uploads/**" vao uploadRoot(), nen anh luon doc duoc qua
     * "/uploads/<ten file>" du tren dia no nam o dau.
     */
    private static final String WEB_PREFIX = "uploads";

    private final UploadProperties properties;

    public FileStorageService(UploadProperties properties) {
        this.properties = properties;
    }

    public String saveFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Chưa chọn file hoặc file rỗng");
        }
        if (file.getSize() > properties.getMaxBytes()) {
            throw new BadRequestException("File vượt quá " + (properties.getMaxBytes() / 1024 / 1024) + "MB");
        }

        String cleanName = sanitize(file.getOriginalFilename());
        String extension = extensionOf(cleanName);
        if (!properties.getAllowedExtensions().contains(extension)) {
            throw new BadRequestException("Chỉ chấp nhận ảnh có đuôi: "
                    + String.join(", ", properties.getAllowedExtensions()));
        }

        Path uploadRoot = uploadRoot();
        Files.createDirectories(uploadRoot);

        String uniqueName = UUID.randomUUID() + "_" + cleanName;
        Path target = uploadRoot.resolve(uniqueName).normalize();

        // Chan truong hop duong dan thoat ra ngoai thu muc uploads
        if (!target.startsWith(uploadRoot)) {
            throw new BadRequestException("Tên file không hợp lệ");
        }

        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        // KHONG ghep tu properties.getDir(): do la duong dan tren DIA, khong phai duong
        // dan web. Khi app.upload.dir la tuong doi ("uploads") thi hai thu tinh co giong
        // nhau nen loi bi che; dat UPLOAD_DIR tuyet doi - nhu khi chay Docker - imageUrl
        // se thanh "/var/bloom/uploads/..." va trinh duyet tra 404.
        return WEB_PREFIX + "/" + uniqueName;
    }

    public Path uploadRoot() {
        return Paths.get(properties.getDir()).toAbsolutePath().normalize();
    }

    /** Loai bo ky tu co the gay loi duong dan. */
    private String sanitize(String original) {
        if (original == null || original.isBlank()) {
            return "file";
        }
        String base = Paths.get(original).getFileName().toString();
        String cleaned = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.isBlank() ? "file" : cleaned;
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
