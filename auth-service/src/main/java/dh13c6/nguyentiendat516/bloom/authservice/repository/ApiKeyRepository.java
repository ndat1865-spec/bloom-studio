package dh13c6.nguyentiendat516.bloom.authservice.repository;

import dh13c6.nguyentiendat516.bloom.authservice.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repository cho API Key doi tac. Tra cuu bang hash, khong bao gio bang key goc. */
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    Optional<ApiKey> findByKeyHash(String keyHash);

    List<ApiKey> findAllByOrderByIdDesc();
}
