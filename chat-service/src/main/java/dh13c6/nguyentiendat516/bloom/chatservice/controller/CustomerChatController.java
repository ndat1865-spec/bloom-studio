package dh13c6.nguyentiendat516.bloom.chatservice.controller;

import dh13c6.nguyentiendat516.bloom.chatservice.dto.ChatDtos;
import dh13c6.nguyentiendat516.bloom.chatservice.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Khung chat cua khach. Chu cuoc chat LUON lay tu JWT - khong co id cuoc chat tren URL nen
 * khach khong the doi so de doc chat cua nguoi khac.
 */
@RestController
@RequestMapping("/chat/me")
public class CustomerChatController {

    private final ChatService chatService;

    public CustomerChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /** Cuoc chat moi nhat + tin moi sau afterId (bo trong = tai lan dau). Giao dien hoi dinh ky. */
    @GetMapping
    public ChatDtos.ChatSnapshot mine(Authentication authentication,
                                      @RequestParam(required = false) Long afterId) {
        return chatService.mine(currentUserId(authentication), afterId);
    }

    /**
     * Gui tin. JWT cua khach duoc chuyen cho tro ly AI de hoi order-service "don cua toi" -
     * order-service tu xac thuc, chat-service khong tu cap quyen.
     */
    @PostMapping("/messages")
    public ChatDtos.ChatSnapshot send(Authentication authentication,
                                      @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                      @Valid @RequestBody ChatDtos.SendMessageRequest body) {
        return chatService.send(currentUserId(authentication), authentication.getName(), authorization,
                body.content(), body.action() == null || body.action().isBlank() ? null : body.action());
    }

    /** Khach bam "Gap nhan vien". */
    @PostMapping("/handoff")
    public ChatDtos.ChatSnapshot handoff(Authentication authentication) {
        return chatService.requestStaff(currentUserId(authentication));
    }

    /** JwtAuthFilter dat userId vao o credentials cua Authentication. */
    private Long currentUserId(Authentication authentication) {
        return (Long) authentication.getCredentials();
    }
}
