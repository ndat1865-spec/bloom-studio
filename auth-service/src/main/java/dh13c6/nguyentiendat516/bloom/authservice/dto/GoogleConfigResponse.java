package dh13c6.nguyentiendat516.bloom.authservice.dto;

/**
 * Frontend hoi truoc khi ve nut "Dang nhap bang Google". Client ID la thong tin cong khai
 * (nam san trong trang web cua moi site dung Google), dat mot cho o .env cua backend.
 */
public record GoogleConfigResponse(boolean enabled, String clientId) {
}
