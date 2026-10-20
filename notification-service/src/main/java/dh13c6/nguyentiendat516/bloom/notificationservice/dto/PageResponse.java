package dh13c6.nguyentiendat516.bloom.notificationservice.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** Trang du lieu - cung dang voi cac service khac de frontend dung chung mot kieu. */
public record PageResponse<T>(
        List<T> content,
        int number,
        int size,
        long totalElements,
        int totalPages,
        int numberOfElements,
        boolean first,
        boolean last,
        boolean empty
) {
    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(),
                page.getSize(), page.getTotalElements(), page.getTotalPages(), page.getNumberOfElements(),
                page.isFirst(), page.isLast(), page.isEmpty());
    }
}
