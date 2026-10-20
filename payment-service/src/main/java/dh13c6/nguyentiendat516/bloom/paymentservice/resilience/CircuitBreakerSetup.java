package dh13c6.nguyentiendat516.bloom.paymentservice.resilience;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.Duration;

/**
 * Nguong cua circuit breaker (doi bang bien moi truong khi can trinh dien):
 *  - xet 10 loi goi gan nhat, can it nhat 5 loi goi moi bat dau danh gia
 *  - tu 50% that bai tro len -> MO mach
 *  - mo trong CB_OPEN_SECONDS giay (mac dinh 30) roi cho 2 loi goi thu
 */
@Configuration
public class CircuitBreakerSetup {

    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry(
            @Value("${circuit-breaker.open-seconds:30}") long openSeconds) {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(10)
                .minimumNumberOfCalls(5)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(openSeconds))
                .permittedNumberOfCallsInHalfOpenState(2)
                .recordExceptions(IOException.class)
                .build();
        return CircuitBreakerRegistry.of(config);
    }
}
