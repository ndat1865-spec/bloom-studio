package dh13c6.nguyentiendat516.bloom.authservice.config;

import dh13c6.nguyentiendat516.bloom.authservice.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // BAT BUOC. authenticationEntryPoint goi sendError(), servlet container
                    // chuyen tiep sang /error. Neu khong mo lan chuyen tiep nay thi no lai
                    // roi vao anyRequest().authenticated() - o che do STATELESS lan chuyen
                    // tiep khong mang theo authentication nen bi chan, goi lai entry point,
                    // ra 401 rong. Hau qua: MOI loi deu hien thanh 401, ke ca 404 va 500,
                    // che mat loi that va rat kho tim.
                    .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                    // Cong khai: day la noi CAP token, chua co token de ma kiem tra
                    .requestMatchers("/auth/login", "/auth/register").permitAll()
                    // Dang nhap bang Google: ID token Google thay cho mat khau
                    .requestMatchers("/auth/google", "/auth/google/config").permitAll()
                    // API noi bo cho api-gateway hoi ve API Key
                    .requestMatchers("/internal/**").permitAll()
                    // Quan tri tai khoan va API Key doi tac: chi ADMIN
                    .requestMatchers("/users/**").hasRole("ADMIN")
                    .requestMatchers("/api-keys/**").hasRole("ADMIN")
                    // /auth/me, /auth/me/profile: chi can dang nhap
                    .anyRequest().authenticated())
            // BAT BUOC: mac dinh Spring Security dung Http403ForbiddenEntryPoint nen tra 403
            // cho ca truong hop THIEU token, sai quy uoc ma frontend dua vao de tu dang xuat.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
