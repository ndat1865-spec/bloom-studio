package dh13c6.nguyentiendat516.bloom.authservice.service;

import dh13c6.nguyentiendat516.bloom.authservice.dto.*;
import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import dh13c6.nguyentiendat516.bloom.authservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.InvalidCredentialsException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import dh13c6.nguyentiendat516.bloom.authservice.security.GoogleTokenVerifier;
import dh13c6.nguyentiendat516.bloom.authservice.security.GoogleTokenVerifier.GoogleIdentity;
import dh13c6.nguyentiendat516.bloom.authservice.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

/**
 * Xac thuc tai khoan va cap JWT.
 *
 * Khac ban monolith o hai diem:
 * - Mat khau luu bang BCrypt, khong con plain text. Ban monolith so sanh bang
 *   password.equals(...) va tra ca entity User (ke ca truong password) ve cho client.
 * - Dang nhap thanh cong tra ve JWT da ky, khong tra ve doi tuong User de client
 *   tu luu role vao localStorage roi tu khai lai qua ?role=ADMIN.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final GoogleTokenVerifier googleVerifier;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       GoogleTokenVerifier googleVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.googleVerifier = googleVerifier;
    }

    public GoogleConfigResponse googleConfig() {
        return new GoogleConfigResponse(googleVerifier.enabled(),
                googleVerifier.enabled() ? googleVerifier.clientId() : null);
    }

    /**
     * Dang nhap bang Google. Tim tai khoan theo google_sub; chua co thi tao tai khoan
     * CUSTOMER moi (khong bao gio tao ADMIN / STAFF tu Google).
     *
     * KHONG tu gop vao tai khoan cu co cung email: email trong ho so do khach tu go, chua
     * xac minh. Neu gop theo email, ke xau chi can dien email cua nan nhan vao ho so minh -
     * nan nhan bam "Dang nhap bang Google" se vao nham tai khoan cua ke xau (dia chi, don
     * hang nan nhan dat sau do ke xau deu thay). Muon dung chung thi khach dang nhap tai
     * khoan cu roi bam "Lien ket Google" o trang Tai khoan (POST /auth/me/google).
     */
    @Transactional
    public LoginResponse googleLogin(String credential) {
        GoogleIdentity google = googleVerifier.verify(credential);
        User user = userRepository.findByGoogleSub(google.sub())
                .map(existing -> refreshAvatar(existing, google))
                .orElseGet(() -> createFromGoogle(google));
        return new LoginResponse(user.getId(), jwtUtil.generateToken(user),
                user.getUsername(), user.getRole().name());
    }

    /** Gan tai khoan Google vao tai khoan dang dang nhap (id tu JWT). Chi tai khoan khach. */
    @Transactional
    public UserResponse linkGoogle(Long userId, String credential) {
        User user = findOrThrow(userId);
        if (user.getRole() != User.Role.CUSTOMER) {
            // Tai khoan quan tri chi dang nhap bang mat khau o trang quan tri
            throw new BadRequestException("Chỉ tài khoản khách hàng mới liên kết được Google");
        }
        GoogleIdentity google = googleVerifier.verify(credential);
        userRepository.findByGoogleSub(google.sub())
                .filter(other -> !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new ConflictException("Tài khoản Google này đã gắn với một tài khoản Bloom khác");
                });
        if (user.getGoogleSub() != null && !user.getGoogleSub().equals(google.sub())) {
            throw new ConflictException("Tài khoản đã liên kết với một tài khoản Google khác");
        }
        user.setGoogleSub(google.sub());
        if (google.picture() != null) {
            user.setAvatarUrl(google.picture());
        }
        if ((user.getEmail() == null || user.getEmail().isBlank()) && google.emailVerified()) {
            user.setEmail(google.email());
        }
        if ((user.getFullName() == null || user.getFullName().isBlank()) && google.name() != null) {
            user.setFullName(truncate(google.name(), 100));
        }
        return UserResponse.from(userRepository.save(user));
    }

    private User createFromGoogle(GoogleIdentity google) {
        if (!google.emailVerified() || google.email() == null) {
            throw new BadRequestException("Email Google chưa được xác minh, không tạo được tài khoản");
        }
        User user = new User();
        user.setUsername(uniqueUsername(google.email()));
        // Mat khau ngau nhien khong ai biet: tai khoan nay chi vao bang Google
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(User.Role.CUSTOMER);
        user.setEmail(truncate(google.email(), 150));
        if (google.name() != null && !google.name().isBlank()) {
            user.setFullName(truncate(google.name(), 100));
        }
        user.setGoogleSub(google.sub());
        user.setAvatarUrl(google.picture());
        return userRepository.save(user);
    }

    /** Nguoi dung doi anh tren Google thi lan dang nhap sau Bloom doi theo. */
    private User refreshAvatar(User user, GoogleIdentity google) {
        if (google.picture() != null && !google.picture().equals(user.getAvatarUrl())) {
            user.setAvatarUrl(google.picture());
            return userRepository.save(user);
        }
        return user;
    }

    /** "Nguyen.Van-A+hoa@gmail.com" -> "nguyen.van-a", trung thi them 2, 3... */
    String uniqueUsername(String email) {
        String local = email.substring(0, Math.max(0, email.indexOf('@')));
        String base = Normalizer.normalize(local, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        if (base.length() < 3) {
            base = "khach" + base;
        }
        base = truncate(base, 40);
        String candidate = base;
        for (int i = 2; userRepository.existsByUsernameIgnoreCase(candidate); i++) {
            candidate = base + i;
        }
        return candidate;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new InvalidCredentialsException("Sai tên đăng nhập hoặc mật khẩu"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            // Cung mot thong bao voi truong hop khong tim thay username, de khong lo ra
            // tai khoan nao co that
            throw new InvalidCredentialsException("Sai tên đăng nhập hoặc mật khẩu");
        }

        return new LoginResponse(user.getId(), jwtUtil.generateToken(user),
                user.getUsername(), user.getRole().name());
    }

    /** Dang ky luon tao tai khoan CUSTOMER - client khong duoc tu chon role. */
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }
        User user = new User();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.CUSTOMER);
        return UserResponse.from(userRepository.save(user));
    }

    public UserResponse getById(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    /** Sua ho so cua chinh minh. id luon lay tu token, khong nhan tu URL. */
    public UserResponse updateProfile(Long id, UpdateProfileRequest request) {
        User user = findOrThrow(id);
        if (request.fullName() != null) user.setFullName(request.fullName());
        if (request.email() != null) user.setEmail(request.email());
        if (request.phone() != null) user.setPhone(request.phone());
        if (request.address() != null) user.setAddress(request.address());
        if (request.city() != null) user.setCity(request.city());
        applyGhnAddress(user, request);
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Ba ma GHN luon di cung nhau, khong de xay ra "co phuong ma khong co quan".
     * Khong hoi GHN o day: dia chi mac dinh chi de dien san form. Luc dat hang
     * order-service moi hoi GHN va tu choi neu ma khong con dung.
     */
    private void applyGhnAddress(User user, UpdateProfileRequest request) {
        String wardCode = request.wardCode();
        if (wardCode == null) return;

        if (wardCode.isBlank()) {
            user.setProvinceId(null);
            user.setDistrictId(null);
            user.setWardCode(null);
            user.setAreaLabel(null);
            return;
        }
        if (request.provinceId() == null || request.districtId() == null) {
            throw new BadRequestException("Chọn đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã");
        }
        user.setProvinceId(request.provinceId());
        user.setDistrictId(request.districtId());
        user.setWardCode(wardCode.trim());
        String label = request.areaLabel();
        user.setAreaLabel(label == null || label.isBlank() ? null : label.trim());
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản id = " + id));
    }
}
