package dh13c6.nguyentiendat516.bloom.orderservice.service;

import dh13c6.nguyentiendat516.bloom.orderservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Luu anh cua don hang: anh bo hoa thanh pham truoc khi giao, anh mau khach gui kem yeu
 * cau dat hoa.
 *
 * Tra ve duong dan WEB "order-media/<nhom>/<uuid>.<duoi>" - hang so, KHONG ghep tu thu
 * muc tren dia (cung loi voi imageUrl cua product-service: Docker dat thu muc tuyet doi thi
 * duong dan web thanh "/var/bloom/..." va trinh duyet tra 404). WebConfig anh xa
 * "/order-media/**" vao root(). Ten file la UUID: khong doan duoc anh don cua nguoi khac.
 */
@Service
public class MediaStorageService {

    public static final String WEB_PREFIX = "order-media";

    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp");

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final String dir;

    public MediaStorageService(@Value("${order.media.dir:order-media}") String dir) {
        this.dir = dir;
    }

    public Path root() {
        return Paths.get(dir).toAbsolutePath().normalize();
    }

    /** group: "arrangements" (anh thanh pham) hoac "requests" (anh mau cua khach). */
    public String store(MultipartFile file, String group) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Chưa chọn ảnh hoặc ảnh rỗng");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Ảnh vượt quá 5MB");
        }
        String extension = extensionOf(file.getOriginalFilename());
        if (!ALLOWED.contains(extension)) {
            throw new BadRequestException("Chỉ nhận ảnh JPG, PNG hoặc WEBP");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File tải lên không phải ảnh");
        }

        Path folder = root().resolve(group).normalize();
        String name = UUID.randomUUID() + "." + extension;
        Path target = folder.resolve(name).normalize();
        if (!target.startsWith(root())) {
            throw new BadRequestException("Tên file không hợp lệ");
        }
        try {
            Files.createDirectories(folder);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Không lưu được ảnh", e);
        }
        return WEB_PREFIX + "/" + group + "/" + name;
    }

    private static String extensionOf(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
