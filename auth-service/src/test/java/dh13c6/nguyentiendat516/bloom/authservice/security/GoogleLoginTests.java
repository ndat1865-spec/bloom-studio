package dh13c6.nguyentiendat516.bloom.authservice.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import dh13c6.nguyentiendat516.bloom.authservice.dto.LoginResponse;
import dh13c6.nguyentiendat516.bloom.authservice.entity.User;
import dh13c6.nguyentiendat516.bloom.authservice.exception.BadRequestException;
import dh13c6.nguyentiendat516.bloom.authservice.exception.ConflictException;
import dh13c6.nguyentiendat516.bloom.authservice.repository.UserRepository;
import dh13c6.nguyentiendat516.bloom.authservice.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Dang nhap bang Google - khong goi Google that: tu sinh cap khoa RSA, ky ID token gia
 * lap dung dinh dang Google, decoder tin khoa cong khai do thay cho JWKS cua Google.
 */
class GoogleLoginTests {

    private static final String CLIENT_ID = "bloom-test.apps.googleusercontent.com";

    private KeyPair googleKeys;
    private GoogleTokenVerifier verifier;
    private UserRepository users;
    private AuthService auth;

    @BeforeEach
    void setUp() throws Exception {
        googleKeys = rsa();
        verifier = new GoogleTokenVerifier(CLIENT_ID,
                NimbusJwtDecoder.withPublicKey((RSAPublicKey) googleKeys.getPublic()).build());
        users = mock(UserRepository.class);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(99L);
            return u;
        });
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.generateToken(any())).thenReturn("bloom-jwt");
        auth = new AuthService(users, new BCryptPasswordEncoder(), jwt, verifier);
    }

    // ---------- Xac minh token ----------

    @Test
    void validTokenGivesIdentity() throws Exception {
        GoogleTokenVerifier.GoogleIdentity id = verifier.verify(token(googleKeys, CLIENT_ID,
                "https://accounts.google.com", Instant.now().plusSeconds(600), true));
        assertEquals("google-sub-1", id.sub());
        assertEquals("lan.nguyen@gmail.com", id.email());
        assertTrue(id.emailVerified());
        assertEquals("Nguyễn Lan", id.name());
        assertEquals("https://lh3.googleusercontent.com/a/anh-lan=s96-c", id.picture());
    }

    @Test
    void tokenForAnotherAppIsRejected() throws Exception {
        String other = token(googleKeys, "app-khac.apps.googleusercontent.com",
                "accounts.google.com", Instant.now().plusSeconds(600), true);
        assertThrows(BadRequestException.class, () -> verifier.verify(other));
    }

    @Test
    void tokenFromOtherIssuerIsRejected() throws Exception {
        String fake = token(googleKeys, CLIENT_ID, "https://evil.example.com",
                Instant.now().plusSeconds(600), true);
        assertThrows(BadRequestException.class, () -> verifier.verify(fake));
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        String old = token(googleKeys, CLIENT_ID, "accounts.google.com",
                Instant.now().minusSeconds(3600), true);
        assertThrows(BadRequestException.class, () -> verifier.verify(old));
    }

    @Test
    void tokenSignedByOtherKeyIsRejected() throws Exception {
        String forged = token(rsa(), CLIENT_ID, "accounts.google.com",
                Instant.now().plusSeconds(600), true);
        assertThrows(BadRequestException.class, () -> verifier.verify(forged));
    }

    @Test
    void disabledWithoutClientId() {
        GoogleTokenVerifier off = new GoogleTokenVerifier("");
        assertFalse(off.enabled());
        assertThrows(BadRequestException.class, () -> off.verify("abc"));
    }

    // ---------- Dang nhap / tao tai khoan ----------

    @Test
    void knownGoogleAccountLogsIntoLinkedUser() throws Exception {
        User john = user(2L, "john", User.Role.CUSTOMER);
        john.setGoogleSub("google-sub-1");
        when(users.findByGoogleSub("google-sub-1")).thenReturn(Optional.of(john));

        LoginResponse res = auth.googleLogin(validToken());

        assertEquals(2L, res.userId());
        assertEquals("john", res.username());
        // Anh Google moi -> cap nhat anh dai dien
        assertEquals("https://lh3.googleusercontent.com/a/anh-lan=s96-c", john.getAvatarUrl());
    }

    @Test
    void newGoogleAccountCreatesCustomerWithFreeUsername() throws Exception {
        when(users.findByGoogleSub("google-sub-1")).thenReturn(Optional.empty());
        when(users.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
        when(users.existsByUsernameIgnoreCase("lan.nguyen")).thenReturn(true);

        LoginResponse res = auth.googleLogin(validToken());

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        User u = saved.getValue();
        assertEquals("lan.nguyen2", u.getUsername());
        assertEquals(User.Role.CUSTOMER, u.getRole());
        assertEquals("google-sub-1", u.getGoogleSub());
        assertEquals("lan.nguyen@gmail.com", u.getEmail());
        assertEquals("Nguyễn Lan", u.getFullName());
        assertEquals("https://lh3.googleusercontent.com/a/anh-lan=s96-c", u.getAvatarUrl());
        assertEquals("CUSTOMER", res.role());
    }

    @Test
    void unverifiedEmailDoesNotCreateAccount() throws Exception {
        when(users.findByGoogleSub("google-sub-1")).thenReturn(Optional.empty());
        String unverified = token(googleKeys, CLIENT_ID, "accounts.google.com",
                Instant.now().plusSeconds(600), false);
        assertThrows(BadRequestException.class, () -> auth.googleLogin(unverified));
        verify(users, never()).save(any());
    }

    // ---------- Lien ket tu trang Tai khoan ----------

    @Test
    void linkSetsGoogleSubOnCurrentUser() throws Exception {
        User john = user(2L, "john", User.Role.CUSTOMER);
        when(users.findById(2L)).thenReturn(Optional.of(john));
        when(users.findByGoogleSub("google-sub-1")).thenReturn(Optional.empty());

        assertTrue(auth.linkGoogle(2L, validToken()).googleLinked());
        assertEquals("google-sub-1", john.getGoogleSub());
    }

    @Test
    void cannotLinkGoogleAccountOwnedByAnotherUser() throws Exception {
        User john = user(2L, "john", User.Role.CUSTOMER);
        User other = user(7L, "lan", User.Role.CUSTOMER);
        other.setGoogleSub("google-sub-1");
        when(users.findById(2L)).thenReturn(Optional.of(john));
        when(users.findByGoogleSub("google-sub-1")).thenReturn(Optional.of(other));

        String token = validToken();
        assertThrows(ConflictException.class, () -> auth.linkGoogle(2L, token));
        assertNull(john.getGoogleSub());
    }

    @Test
    void staffCannotLinkGoogle() throws Exception {
        when(users.findById(3L)).thenReturn(Optional.of(user(3L, "staff", User.Role.STAFF)));
        String token = validToken();
        assertThrows(BadRequestException.class, () -> auth.linkGoogle(3L, token));
    }

    // ---------- tien ich ----------

    private String validToken() throws Exception {
        return token(googleKeys, CLIENT_ID, "accounts.google.com", Instant.now().plusSeconds(600), true);
    }

    private static String token(KeyPair keys, String aud, String iss, Instant exp, boolean verified)
            throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(iss)
                .audience(aud)
                .subject("google-sub-1")
                .claim("email", "lan.nguyen@gmail.com")
                .claim("email_verified", verified)
                .claim("name", "Nguyễn Lan")
                .claim("picture", "https://lh3.googleusercontent.com/a/anh-lan=s96-c")
                .issueTime(Date.from(exp.minusSeconds(3600)))
                .expirationTime(Date.from(exp))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner((RSAPrivateKey) keys.getPrivate()));
        return jwt.serialize();
    }

    private static KeyPair rsa() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        return gen.generateKeyPair();
    }

    private static User user(Long id, String username, User.Role role) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setPassword("x");
        u.setRole(role);
        return u;
    }
}
