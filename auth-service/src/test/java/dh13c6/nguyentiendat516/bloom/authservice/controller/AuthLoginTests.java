package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import dh13c6.nguyentiendat516.bloom.authservice.exception.GlobalExceptionHandler;
import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import dh13c6.nguyentiendat516.bloom.authservice.security.GoogleTokenVerifier;
import dh13c6.nguyentiendat516.bloom.authservice.security.JwtUtil;
import dh13c6.nguyentiendat516.bloom.authservice.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthLoginTests {
    private UserRepository users;
    private BCryptPasswordEncoder passwords;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        passwords = new BCryptPasswordEncoder();
        AuthService service = new AuthService(users, passwords, mock(JwtUtil.class),
                new GoogleTokenVerifier(""));
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void wrongPasswordReturnsUnauthorizedWithReadableMessage() throws Exception {
        User user = new User();
        user.setUsername("customer");
        user.setPassword(passwords.encode("correct-test-password"));
        when(users.findByUsername("customer")).thenReturn(Optional.of(user));
        assertInvalidLogin("customer");
    }

    @Test
    void unknownUsernameReturnsSameUnauthorizedMessage() throws Exception {
        when(users.findByUsername("unknown")).thenReturn(Optional.empty());
        assertInvalidLogin("unknown");
    }

    private void assertInvalidLogin(String username) throws Exception {
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"wrong-test-password"}
                                """.formatted(username)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sai tên đăng nhập hoặc mật khẩu"));
    }
}
