package dh13c6.nguyentiendat516.bloom.chatservice.controller;

import dh13c6.nguyentiendat516.bloom.chatservice.dto.ChatDtos;
import dh13c6.nguyentiendat516.bloom.chatservice.dto.PageResponse;
import dh13c6.nguyentiendat516.bloom.chatservice.entity.ConversationStatus;
import dh13c6.nguyentiendat516.bloom.chatservice.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Hop thu cua studio - chi ADMIN va nhan vien (khai o SecurityConfig). */
@RestController
@RequestMapping("/chat/conversations")
public class StaffChatController {

    private final ChatService chatService;

    public StaffChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /** Danh sach cuoc chat, moi nhat truoc. Bo trong status = moi cuoc chat chua dong. */
    @GetMapping
    public PageResponse<ChatDtos.ConversationResponse> inbox(
            @RequestParam(required = false) ConversationStatus status, Pageable pageable) {
        return PageResponse.from(chatService.inbox(status, pageable), ChatDtos.ConversationResponse::from);
    }

    @GetMapping("/summary")
    public ChatDtos.InboxSummary summary() {
        return chatService.summary();
    }

    @GetMapping("/{id}")
    public ChatDtos.ChatSnapshot view(@PathVariable Long id, @RequestParam(required = false) Long afterId) {
        return chatService.staffView(id, afterId);
    }

    @PostMapping("/{id}/messages")
    public ChatDtos.ChatSnapshot send(Authentication authentication, @PathVariable Long id,
                                      @Valid @RequestBody ChatDtos.SendMessageRequest body) {
        return chatService.staffSend(id, authentication.getName(), body.content());
    }

    @PostMapping("/{id}/close")
    public ChatDtos.ChatSnapshot close(Authentication authentication, @PathVariable Long id) {
        return chatService.close(id, authentication.getName());
    }

    @PostMapping("/{id}/return-to-ai")
    public ChatDtos.ChatSnapshot returnToAi(@PathVariable Long id) {
        return chatService.returnToAi(id);
    }
}
