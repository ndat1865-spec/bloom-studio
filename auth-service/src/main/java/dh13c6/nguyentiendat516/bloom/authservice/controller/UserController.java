package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.dto.CreateStaffRequest;
import dh13c6.nguyentiendat516.bloom.authservice.dto.UserResponse;
import dh13c6.nguyentiendat516.bloom.authservice.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Quan tri tai khoan va nhan vien. Toan bo /users/** da duoc SecurityConfig gioi han cho ROLE_ADMIN. */
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> getAll() {
        return userService.getAll();
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable Long id) {
        return userService.getById(id);
    }

    /** Tao tai khoan nhan vien / ADMIN. Khach hang tu dang ky o /auth/register. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateStaffRequest request) {
        return userService.createStaff(request);
    }

    @PutMapping("/{id}")
    public UserResponse update(Authentication authentication, @PathVariable Long id,
                               @RequestBody Map<String, String> body) {
        return userService.update(actorId(authentication), id, body.get("role"), body.get("password"));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        userService.delete(actorId(authentication), id);
    }

    /** JwtAuthFilter dat userId vao o credentials - luon lay tu token, khong tu body. */
    private Long actorId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }
}
