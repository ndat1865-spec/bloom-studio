package dh13c6.nguyentiendat516.bloom.productservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SeedImageTests {
    @LocalServerPort
    private int port;

    @Test
    void servesEveryPackagedSeedImageWithoutAuthentication() throws Exception {
        Resource[] images = new PathMatchingResourcePatternResolver()
                .getResources("classpath:/static/uploads/seed/*.jpg");
        assertEquals(20, images.length);
        HttpClient client = HttpClient.newHttpClient();
        for (Resource image : images) {
            HttpRequest request = HttpRequest.newBuilder(URI.create(
                    "http://localhost:" + port + "/uploads/seed/" + image.getFilename())).build();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            assertEquals(200, response.statusCode(), image.getFilename());
            assertTrue(response.headers().firstValue("content-type").orElse("").startsWith("image/"));
            try (var stream = image.getInputStream()) {
                assertArrayEquals(stream.readAllBytes(), response.body(), image.getFilename());
            }
        }
    }
}
