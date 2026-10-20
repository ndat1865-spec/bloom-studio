package dh13c6.nguyentiendat516.bloom.productservice.controller;

import dh13c6.nguyentiendat516.bloom.productservice.entity.Product;
import dh13c6.nguyentiendat516.bloom.productservice.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Duong GHI cua san pham: body va {id} co thuc su den duoc tang Service khong.
 *
 * Co test rieng vi da tung hong that: khi bo tham so role (role nay lay tu JWT), annotation
 * @RequestParam(required = false) bi bo lai va dinh sang tham so ke tiep. Spring uu tien
 * RequestParam hon RequestBody/PathVariable, "required = false" nen no tra null thay vi
 * bao loi - ket qua la moi lenh them/sua/xoa san pham deu 500 vi NullPointerException.
 * Bien dich van sach, khong test nao do toi.
 */
class ProductWriteBindingTests {

    private ProductService productService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        productService = mock(ProductService.class);
        mvc = MockMvcBuilders.standaloneSetup(new ProductController(productService)).build();
    }

    @Test
    void createBindsRequestBody() throws Exception {
        when(productService.createProduct(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        mvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hoa kiem thu\",\"price\":12.5,\"description\":\"mo ta\",\"stockQuantity\":3}"))
                .andExpect(status().isCreated());

        Product sent = captureCreated();
        assertNotNull(sent, "Body khong duoc bind - tham so den Service la null");
        assertEquals("Hoa kiem thu", sent.getName());
        assertEquals(0, new BigDecimal("12.5").compareTo(new BigDecimal(sent.getPrice().toString())));
        assertEquals(3, sent.getStockQuantity());
    }

    @Test
    void updateBindsBothPathVariableAndBody() throws Exception {
        when(productService.updateProduct(any(), any())).thenAnswer(inv -> Optional.of(inv.getArgument(1)));

        mvc.perform(put("/products/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ten moi\",\"price\":30.0,\"description\":\"mo ta\",\"stockQuantity\":1}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Long> id = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Product> body = ArgumentCaptor.forClass(Product.class);
        verify(productService).updateProduct(id.capture(), body.capture());
        assertEquals(7L, id.getValue(), "{id} tren URL khong den duoc Service");
        assertNotNull(body.getValue(), "Body khong duoc bind");
        assertEquals("Ten moi", body.getValue().getName());
    }

    @Test
    void deleteBindsPathVariable() throws Exception {
        when(productService.deleteProduct(eq(9L))).thenReturn(true);

        mvc.perform(delete("/products/9")).andExpect(status().isNoContent());

        verify(productService).deleteProduct(9L);
    }

    private Product captureCreated() {
        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productService).createProduct(captor.capture());
        return captor.getValue();
    }
}
