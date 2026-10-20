package dh13c6.nguyentiendat516.bloom.authservice.service;

import dh13c6.nguyentiendat516.bloom.authservice.dto.CreateStaffRequest;
import dh13c6.nguyentiendat516.bloom.authservice.dto.UserResponse;
import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import dh13c6.nguyentiendat516.bloom.authservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.NotFoundException;
import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Quan tri tai khoan - chi ADMIN goi duoc (khai o SecurityConfig, khong kiem tra tay).
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserResponse> getAll() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    public UserResponse getById(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    /** ADMIN tao tai khoan nhan vien (hoac ADMIN khac). Mat khau ma hoa BCrypt. */
    public UserResponse createStaff(CreateStaffRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.valueOf(request.role()));
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Doi role va/hoac dat lai mat khau. Mat khau moi luon duoc ma hoa truoc khi luu.
     *
     * actorId la ADMIN dang thao tac (lay tu JWT): khong tu ha quyen cua chinh minh, va khong
     * ha quyen ADMIN cuoi cung - lam vay la khong con ai vao duoc trang quan tri nua.
     * Quyen moi co hieu luc tu lan dang nhap sau, vi role nam trong JWT da cap.
     */
    public UserResponse update(Long actorId, Long id, String newRole, String newPassword) {
        User user = findOrThrow(id);
        if (newRole != null && !newRole.isBlank()) {
            User.Role role;
            try {
                role = User.Role.valueOf(newRole.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Quyền phải là ADMIN, STAFF hoặc CUSTOMER");
            }
            if (role != user.getRole()) {
                if (id.equals(actorId)) {
                    throw new ConflictException("Không tự đổi quyền của chính mình");
                }
                requireAnotherAdmin(user);
                user.setRole(role);
            }
        }
        if (newPassword != null && !newPassword.isBlank()) {
            if (newPassword.length() < 6) {
                throw new BadRequestException("Mật khẩu cần ít nhất 6 ký tự");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }
        return UserResponse.from(userRepository.save(user));
    }

    public void delete(Long actorId, Long id) {
        User user = findOrThrow(id);
        if (id.equals(actorId)) {
            throw new ConflictException("Không tự xoá tài khoản của chính mình");
        }
        requireAnotherAdmin(user);
        userRepository.delete(user);
    }

    /** Ha quyen / xoa mot ADMIN thi phai con it nhat mot ADMIN khac. */
    private void requireAnotherAdmin(User user) {
        if (user.getRole() == User.Role.ADMIN && userRepository.countByRole(User.Role.ADMIN) <= 1) {
            throw new ConflictException("Đây là tài khoản ADMIN cuối cùng, không hạ quyền hay xoá được");
        }
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản id = " + id));
    }
}
