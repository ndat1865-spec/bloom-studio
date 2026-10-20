package dh13c6.nguyentiendat516.bloom.chatservice.repository;

import dh13c6.nguyentiendat516.bloom.chatservice.entity.Conversation;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ConversationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Cuoc chat chua dong moi nhat cua khach. */
    Optional<Conversation> findFirstByUserIdAndStatusNotOrderByIdDesc(Long userId, ConversationStatus status);

    /** Cuoc chat moi nhat (ke ca da dong) - de khach xem lai sau khi studio ket thuc. */
    Optional<Conversation> findFirstByUserIdOrderByIdDesc(Long userId);

    Page<Conversation> findByStatusInOrderByLastMessageAtDesc(Collection<ConversationStatus> statuses,
                                                              Pageable pageable);

    long countByStatus(ConversationStatus status);
}
