package dh13c6.nguyentiendat516.bloom.chatservice.repository;

import dh13c6.nguyentiendat516.bloom.chatservice.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** Tin moi sau mot id - client hoi dinh ky, chi tai phan chua co. */
    List<ChatMessage> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);

    /** N tin gan nhat (moi nhat truoc) - dao lai o tang service. */
    List<ChatMessage> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);
}
