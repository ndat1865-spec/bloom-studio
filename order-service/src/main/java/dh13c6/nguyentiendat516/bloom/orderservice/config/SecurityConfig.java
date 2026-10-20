package dh13c6.nguyentiendat516.bloom.orderservice.config;

import dh13c6.nguyentiendat516.bloom.orderservice.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
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
                    // API noi bo: chi product-service goi qua mang noi bo, khong lo qua Gateway
                    .requestMatchers("/internal/**").permitAll()
                    // Tuy chon thanh toan va ma dang co: xem truoc khi dang nhap cung duoc
                    .requestMatchers(HttpMethod.GET, "/orders/options", "/vouchers/public", "/vouchers/hunt").permitAll()
                    // Danh muc tinh / quan / phuong cua GHN: du lieu cong khai
                    .requestMatchers(HttpMethod.GET, "/shipping/provinces", "/shipping/districts",
                            "/shipping/wards").permitAll()
                    // GHN goi vao khong co JWT; controller khong tin noi dung, tu hoi lai GHN
                    .requestMatchers(HttpMethod.POST, "/shipping/ghn/webhook").permitAll()
                    // Anh don hang (anh hoa thanh pham, anh mau): the <img> khong gui duoc JWT.
                    // Ten file la UUID nen khong doan duoc anh cua don khac.
                    .requestMatchers(HttpMethod.GET, "/order-media/**").permitAll()
                    // Tao van don GHN, tai anh hoa thanh pham: ADMIN va nhan vien
                    .requestMatchers(HttpMethod.POST, "/orders/*/shipment", "/orders/*/shipment/cancel",
                            "/orders/*/shipment/simulate",
                            "/orders/*/arrangement-photo")
                            .hasAnyRole("ADMIN", "STAFF")
                    // Dat hoa theo yeu cau: studio xem tat ca, bao gia, tu choi. Khach gui / xem /
                    // huy yeu cau cua minh - quyen tren tung yeu cau do controller kiem tra.
                    .requestMatchers(HttpMethod.GET, "/custom-requests").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(HttpMethod.PUT, "/custom-requests/*/quote", "/custom-requests/*/reject")
                            .hasAnyRole("ADMIN", "STAFF")
                    // Thu ma: can dang nhap. Khai TRUOC quy tac /vouchers/** ben duoi
                    .requestMatchers(HttpMethod.POST, "/vouchers/check").authenticated()
                    // Vi ma cua chinh khach (ma chung + ma rieng) - chi can dang nhap
                    .requestMatchers(HttpMethod.GET, "/vouchers/mine").authenticated()
                    // San voucher: luu ma vao vi cua chinh minh - chi can dang nhap
                    .requestMatchers(HttpMethod.POST, "/vouchers/*/claim").authenticated()
                    // Ma giam gia: nhan vien chi XEM danh sach; tao / sua / xoa la viec cua ADMIN
                    // vi dung truc tiep toi tien cua cua hang
                    .requestMatchers(HttpMethod.GET, "/vouchers").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers("/vouchers", "/vouchers/**").hasRole("ADMIN")
                    // Doi trang thai don va xem toan bo don: ADMIN va nhan vien
                    .requestMatchers(HttpMethod.PUT, "/orders/*/status").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(HttpMethod.GET, "/orders", "/orders/overview", "/orders/circuit-breakers",
                            "/orders/status-counts")
                            .hasAnyRole("ADMIN", "STAFF")
                    // Con lai chi can dang nhap; quyen tren tung don do OrderController
                    // kiem tra (chu don hoac ADMIN) vi no phu thuoc du lieu, khong the
                    // khai bang duong dan duoc.
                    .anyRequest().authenticated())
            // BAT BUOC: mac dinh Spring Security tra 403 cho ca truong hop THIEU token,
            // sai quy uoc ma frontend dua vao de tu dang xuat khi het phien.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
