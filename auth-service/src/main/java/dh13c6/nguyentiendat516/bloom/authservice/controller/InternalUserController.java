package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API noi bo cho notification-service tra dia chi email cua khach.
 *
 * Email la du lieu cua auth-service; notification-service KHONG doc CSDL bloom_auth ma
 * hoi o day. Khong khai route o api-gateway nen ben ngoai khong goi toi duoc - cung gioi
 * han da biet voi cac /internal/** khac: bao mat dua tren viec khong dinh tuyen.
 *
 * Chi tra dung hai truong can de gui thu, khong tra so dien thoai, dia chi, vai tro.
 */
@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    public record Contact(Long id, String username, String email, String displayName) {
    }

    private final UserRepository userRepository;

    public InternalUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/{id}/contact")
    public ResponseEntity<Contact> contact(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(new Contact(u.getId(), u.getUsername(), blankToNull(u.getEmail()),
                        u.getDisplayName())))
                .orElse(ResponseEntity.notFound().build());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
