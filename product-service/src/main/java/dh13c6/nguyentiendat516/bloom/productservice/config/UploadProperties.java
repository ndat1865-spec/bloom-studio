package dh13c6.nguyentiendat516.bloom.productservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Cau hinh thu muc va gioi han upload anh (SOS07). */
@ConfigurationProperties(prefix = "app.upload")
public class UploadProperties {

    /** Thu muc luu anh, tinh tu thu muc chay ung dung. */
    private String dir = "uploads";

    /** Dung luong toi da mot file anh (byte). */
    private long maxBytes = 5L * 1024 * 1024;

    /** Duoi file anh duoc chap nhan. */
    private List<String> allowedExtensions = List.of("jpg", "jpeg", "png", "webp", "gif", "avif");

    public String getDir() {
        return dir;
    }

    public void setDir(String dir) {
        this.dir = dir;
    }

    public long getMaxBytes() {
        return maxBytes;
    }

    public void setMaxBytes(long maxBytes) {
        this.maxBytes = maxBytes;
    }

    public List<String> getAllowedExtensions() {
        return allowedExtensions;
    }

    public void setAllowedExtensions(List<String> allowedExtensions) {
        this.allowedExtensions = allowedExtensions;
    }
}
