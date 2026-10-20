package dh13c6.nguyentiendat516.bloom.productservice.config;

import dh13c6.nguyentiendat516.bloom.productservice.service.FileStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Phuc vu anh seed tu classpath va anh upload tu thu muc tren dia.
 *
 * KHONG cau hinh CORS o day. Sau khi tach service, CORS chi duoc khai bao DUY NHAT mot
 * noi la api-gateway - neu moi service tu khai se rat kho tim khi co loi, va sua mot
 * origin phai sua bon cho.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageService fileStorageService;

    public WebConfig(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Anh seed dong goi cung ung dung, khong phu thuoc thu muc lam viec.
        registry.addResourceHandler("/uploads/seed/**")
                .addResourceLocations("classpath:/static/uploads/seed/");

        // "file:/.../uploads/" - dau '/' cuoi la bat buoc, toUri() bo qua neu thu muc chua ton tai
        String location = fileStorageService.uploadRoot().toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
