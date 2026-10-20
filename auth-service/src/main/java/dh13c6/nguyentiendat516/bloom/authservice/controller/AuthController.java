package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.dto.*;
import dh13c6.nguyentiendat516.bloom.authservice.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Dang nhap, dang ky va ho so ca nhan.
 *
 * /auth/me va /auth/me/profile lay id tu TOKEN chu khong tu URL. Ban monolith dung
 * PUT /users/{id}/profile - khach chi viec doi so tren URL la sua duoc ho so nguoi khac
 * (lo hong IDOR).
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /** Nut "Dang nhap bang Google" co hien khong, dung Client ID nao. */
    @GetMapping("/google/config")
    public GoogleConfigResponse googleConfig() {
        return authService.googleConfig();
    }

    /** Dang nhap (hoac tao tai khoan khach) bang ID token Google - tra JWT cua Bloom. */
    @PostMapping("/google")
    public LoginResponse googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.googleLogin(request.credential());
    }

    /** Gan tai khoan Google vao tai khoan dang dang nhap, de lan sau dang nhap bang Google. */
    @PostMapping("/me/google")
    public UserResponse linkGoogle(Authentication authentication,
                                   @Valid @RequestBody GoogleLoginRequest request) {
        return authService.linkGoogle(currentUserId(authentication), request.credential());
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return authService.getById(currentUserId(authentication));
    }

    @PutMapping("/me/profile")
    public UserResponse updateMyProfile(Authentication authentication,
                                        @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(currentUserId(authentication), request);
    }

    /** JwtAuthFilter dat userId vao o credentials cua Authentication. */
    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }
}
