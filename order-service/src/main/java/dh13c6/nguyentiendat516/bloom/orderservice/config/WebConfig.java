package dh13c6.nguyentiendat516.bloom.orderservice.config;

import dh13c6.nguyentiendat516.bloom.orderservice.service.MediaStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Phuc vu anh don hang tu thu muc tren dia qua "/order-media/**".
 * KHONG khai CORS o day - CORS chi khai o api-gateway.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final MediaStorageService mediaStorageService;

    public WebConfig(MediaStorageService mediaStorageService) {
        this.mediaStorageService = mediaStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // "file:/.../order-media/" - dau '/' cuoi la bat buoc
        String location = mediaStorageService.root().toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/" + MediaStorageService.WEB_PREFIX + "/**").addResourceLocations(location);
    }
}
