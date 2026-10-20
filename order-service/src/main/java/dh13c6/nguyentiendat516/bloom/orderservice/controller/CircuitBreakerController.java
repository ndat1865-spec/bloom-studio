package dh13c6.nguyentiendat516.bloom.orderservice.controller;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

/**
 * Trang thai cac circuit breaker - chi ADMIN (khai o SecurityConfig). Dung de trinh dien:
 * tat mot service phia sau, goi vai lan, thay state chuyen CLOSED -> OPEN.
 */
@RestController
public class CircuitBreakerController {

    public record BreakerView(String name, String state, float failureRate, int bufferedCalls,
                              int failedCalls, long notPermittedCalls) {
    }

    private final CircuitBreakerRegistry registry;

    public CircuitBreakerController(CircuitBreakerRegistry registry) {
        this.registry = registry;
    }

    @GetMapping("/orders/circuit-breakers")
    public List<BreakerView> list() {
        return registry.getAllCircuitBreakers().stream()
                .sorted(Comparator.comparing(CircuitBreaker::getName))
                .map(cb -> new BreakerView(cb.getName(), cb.getState().name(), cb.getMetrics().getFailureRate(),
                        cb.getMetrics().getNumberOfBufferedCalls(), cb.getMetrics().getNumberOfFailedCalls(),
                        cb.getMetrics().getNumberOfNotPermittedCalls()))
                .toList();
    }
}
