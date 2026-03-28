package com.smartSure.authService.dto.pagination;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@Schema(name="Page Response Structure")
@AllArgsConstructor
public class PageResponse<T> {
	
	private List<T> content;
	private int page;
	private int size;
	private long totalElements;
	private int totalPages;
}
