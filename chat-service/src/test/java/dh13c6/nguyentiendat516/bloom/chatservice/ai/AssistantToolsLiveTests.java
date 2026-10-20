package dh13c6.nguyentiendat516.bloom.chatservice.ai;

import dh13c6.nguyentiendat516.bloom.chatservice.client.ShopDataClient;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Chay cac cong cu cua tro ly AI voi du lieu THAT qua Gateway - khong can khoa Claude API.
 * Chi chay khi dat BLOOM_GATEWAY_URL (vd. http://localhost:8080) va he thong dang chay:
 *   BLOOM_GATEWAY_URL=http://localhost:8080 ./mvnw test -Dtest=AssistantToolsLiveTests
 * Gateway doi /api/products -> /products nen base-url cua ShopDataClient la <gateway>/api.
 */
@EnabledIfEnvironmentVariable(named = "BLOOM_GATEWAY_URL", matches = ".+")
class AssistantToolsLiveTests {

    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static AssistantTools tools;
    private static AssistantTools.Context john;

    @BeforeAll
    static void setUp() throws Exception {
        String gateway = System.getenv("BLOOM_GATEWAY_URL");
        ShopDataClient shop = new ShopDataClient(gateway + "/api", gateway + "/api");
        tools = new AssistantTools(shop, JSON);

        HttpResponse<String> login = HttpClient.newHttpClient().send(HttpRequest.newBuilder()
                .uri(URI.create(gateway + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"john\",\"password\":\"john123\"}"))
                .build(), HttpResponse.BodyHandlers.ofString());
        String token = JSON.readTree(login.body()).get("token").asString();
        john = new AssistantTools.Context(null, "john", "Bearer " + token);
    }

    @Test
    void searchBouquetsByOccasionAndBudget() {
        JsonNode result = JSON.readTree(tools.execute(AssistantTools.SEARCH_BOUQUETS,
                Map.of("occasion", "BIRTHDAY", "max_price", 700000), john));
        assertTrue(result.get("count").asInt() > 0, result.toString());
        JsonNode first = result.get("bouquets").get(0);
        assertTrue(first.get("link").asString().startsWith("/products/"));
        assertTrue(first.get("sizes").size() >= 1);
        System.out.println("search_bouquets -> " + result);
    }

    @Test
    void getBouquetHasCompositionAndSizes() {
        JsonNode result = JSON.readTree(tools.execute(AssistantTools.GET_BOUQUET, Map.of("product_id", 1), john));
        assertEquals(3, result.get("sizes").size(), result.toString());
        assertTrue(result.hasNonNull("composition"));
        System.out.println("get_bouquet -> " + result);
    }

    @Test
    void deliveryRulesComeFromOrderService() {
        JsonNode result = JSON.readTree(tools.execute(AssistantTools.GET_DELIVERY_RULES, Map.of(), john));
        assertEquals("Hà Nội", result.get("delivery_area").asString());
        assertTrue(result.hasNonNull("today"));
        System.out.println("get_delivery_rules -> " + result);
    }

    @Test
    void myOrdersUseCustomersOwnToken() {
        JsonNode result = JSON.readTree(tools.execute(AssistantTools.GET_MY_ORDERS, Map.of(), john));
        assertTrue(result.get("count").asInt() > 0, result.toString());
        assertTrue(result.get("orders").get(0).get("link").asString().startsWith("/orders/"));
        System.out.println("get_my_orders -> " + result.get("orders").get(0));
    }
}
