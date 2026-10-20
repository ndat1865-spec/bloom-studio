package dh13c6.nguyentiendat516.bloom.authservice.controller;

import dh13c6.nguyentiendat516.bloom.authservice.entity.ApiKey;
import dh13c6.nguyentiendat516.bloom.authservice.exception.GlobalExceptionHandler;
import dh13c6.nguyentiendat516.bloom.authservice.repository.ApiKeyRepository;
import dh13c6.nguyentiendat516.bloom.authservice.service.ApiKeyService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Giu dung loi hua cua tinh nang: key goc chi roi khoi he thong DUNG MOT LAN.
 *
 * Tai lieu tham khao hua dieu do nhung getAll() cua no van tra keyValue, nen key that
 * van ve toi trinh duyet. Test "danh sach khong lo key goc" o duoi la de bat dung loi
 * ay neu ai copy sang.
 */
class ApiKeyTests {

    private static final String OWNER = "Cong ty A";

    private ApiKeyRepository keys;
    private MockMvc mvc;

    /** Key goc cua lan cap gan nhat - chi test moi giu duoc, he thong thi khong. */
    private String lastRawKey;

    @BeforeEach
    void setUp() {
        keys = mock(ApiKeyRepository.class);
        when(keys.save(any(ApiKey.class))).thenAnswer(inv -> inv.getArgument(0));
        ApiKeyService service = new ApiKeyService(keys);
        mvc = MockMvcBuilders
                .standaloneSetup(new ApiKeyController(service), new InternalApiKeyController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createReturnsRawKeyOnceAndStoresOnlyItsHash() throws Exception {
        String rawKey = createKey();
        assertTrue(rawKey.startsWith("bloom_pk_"), rawKey);

        ApiKey saved = captureSaved();
        assertEquals(sha256(rawKey), saved.getKeyHash());
        assertFalse(saved.getKeyHash().contains(rawKey), "Dong da luu con chua key goc");
        assertTrue(rawKey.startsWith(saved.getKeyPrefix()));
        assertTrue(saved.getKeyPrefix().length() < rawKey.length() / 2,
                "keyPrefix qua dai, lo gan het key: " + saved.getKeyPrefix());
        assertNotNull(saved.getExpiresAt(), "daysValid = 30 ma khong dat han dung");
    }

    @Test
    void listNeverExposesRawKey() throws Exception {
        String rawKey = createKey();
        ApiKey saved = captureSaved();
        saved.setId(1L);
        when(keys.findAllByOrderByIdDesc()).thenReturn(List.of(saved));

        String body = mvc.perform(get("/api-keys"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ownerName").value(OWNER))
                .andExpect(jsonPath("$[0].keyPrefix").exists())
                .andExpect(jsonPath("$[0].keyValue").doesNotExist())
                .andExpect(jsonPath("$[0].keyHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertFalse(body.contains(rawKey), "Danh sach da lam lo key goc");
    }

    @Test
    void validKeyPassesAndRecordsLastUsed() throws Exception {
        ApiKey saved = registerUsableKey();
        assertNull(saved.getLastUsedAt());

        validate("products:read")
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.ownerName").value(OWNER))
                .andExpect(jsonPath("$.scopes[0]").value("products:read"));

        assertNotNull(saved.getLastUsedAt(), "Khong ghi lastUsedAt thi khong biet key nao da bo khong");
    }

    @Test
    void revokedKeyIsRejected() throws Exception {
        ApiKey saved = registerUsableKey();
        saved.setStatus(ApiKey.Status.REVOKED);

        validate("products:read")
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.reason").value("DA_THU_HOI"));
    }

    @Test
    void expiredKeyIsRejected() throws Exception {
        ApiKey saved = registerUsableKey();
        saved.setExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));

        validate("products:read")
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.reason").value("HET_HAN"));
    }

    @Test
    void keyWithoutRequiredScopeIsRejected() throws Exception {
        registerUsableKey();

        validate("orders:write")
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.reason").value("THIEU_SCOPE"));
    }

    @Test
    void unknownKeyIsRejectedWithoutLeakingOwner() throws Exception {
        when(keys.findByKeyHash(any())).thenReturn(Optional.empty());
        lastRawKey = "bloom_pk_khong-he-ton-tai";

        validate("products:read")
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.reason").value("KHONG_TON_TAI"))
                .andExpect(jsonPath("$.ownerName").doesNotExist());
    }

    // ---------- tien ich ----------

    /** Cap key qua dung duong HTTP ma ADMIN se di. */
    private String createKey() throws Exception {
        MvcResult result = mvc.perform(post("/api-keys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerName\":\"" + OWNER + "\",\"scopes\":[\"products:read\"],\"daysValid\":30}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.keyValue").exists())
                .andReturn();
        lastRawKey = JsonPath.read(result.getResponse().getContentAsString(), "$.keyValue");
        return lastRawKey;
    }

    /** Cap key roi dat no vao "CSDL" gia o trang thai dung duoc. */
    private ApiKey registerUsableKey() throws Exception {
        String rawKey = createKey();
        ApiKey saved = captureSaved();
        saved.setId(1L);
        when(keys.findByKeyHash(sha256(rawKey))).thenReturn(Optional.of(saved));
        return saved;
    }

    /** Mo phong Gateway hoi sang: gui key goc len /internal/api-keys/validate. */
    private ResultActions validate(String requiredScope) throws Exception {
        return mvc.perform(post("/internal/api-keys/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"" + lastRawKey + "\",\"requiredScope\":\"" + requiredScope + "\"}"))
                .andExpect(status().isOk());
    }

    private ApiKey captureSaved() {
        ArgumentCaptor<ApiKey> captor = ArgumentCaptor.forClass(ApiKey.class);
        verify(keys, atLeastOnce()).save(captor.capture());
        return captor.getValue();
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
