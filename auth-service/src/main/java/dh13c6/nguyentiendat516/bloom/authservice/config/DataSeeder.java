package dh13c6.nguyentiendat516.bloom.authservice.config;

import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import dh13c6.nguyentiendat516.bloom.authservice.service.ApiKeyService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tao san hai tai khoan mau khi khoi dong lan dau, de ca nhom cung test duoc ngay.
 *
 * LUU Y khi chuyen du lieu tu CSDL cu (ptpmhdv): mat khau o do luu dang plain text nen
 * KHONG dang nhap duoc sau khi chuyen sang BCrypt. Phai dat lai mat khau cho cac tai
 * khoan cu - xem script chuyen du lieu trong docs/.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    /**
     * Key demo cu, von la chuoi tinh trong api-gateway/application.yml. Nap lai duoi
     * dang key dong de tai lieu, Postman va cac anh chup da co van chay duoc.
     * Key that cap cho doi tac phai tao qua POST /api-keys va khong bao gio nam trong
     * ma nguon nhu the nay.
     */
    private static final String LEGACY_DEMO_KEY = "bloom-partner-key-2026";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiKeyService apiKeyService;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder,
                      ApiKeyService apiKeyService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.apiKeyService = apiKeyService;
    }

    @Override
    public void run(String... args) {
        seed("admin", "admin123", User.Role.ADMIN);
        seed("john", "john123", User.Role.CUSTOMER);
        // Nhan vien demo: xu ly don, hoa; khong tao ma giam gia, khong vao Khoa API
        seed("staff", "staff123", User.Role.STAFF);
        apiKeyService.seedIfAbsent(LEGACY_DEMO_KEY, "Doi tac demo", List.of("products:read"));
    }

    private void seed(String username, String rawPassword, User.Role role) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        userRepository.save(user);
    }
}
