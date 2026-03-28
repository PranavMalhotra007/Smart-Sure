package com.smartSure.authService.service;

import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.smartSure.authService.dto.pagination.PageResponse;
import com.smartSure.authService.dto.user.UserRequestDto;
import com.smartSure.authService.dto.user.UserResponseDto;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.exception.UserNotFoundException;
import com.smartSure.authService.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
	
	private final UserRepository repo;
	private final ModelMapper modelMapper;
	
	public UserResponseDto add(UserRequestDto reqDto) {
		
		User user = repo.findByEmail(reqDto.getEmail()).orElseThrow(() -> new UserNotFoundException("This email is not registered"));
		modelMapper.map(reqDto, user);
		repo.save(user);
		
		return modelMapper.map(user, UserResponseDto.class);
	}
	
	@CacheEvict(value = "users", key = "#userId")
	public UserResponseDto update(UserRequestDto reqDto, Long userId) {
		
		User user = repo.findById(userId).orElseThrow(() -> new UserNotFoundException("This user is not present"));
		modelMapper.map(reqDto, user);
		repo.save(user);
		
		return modelMapper.map(user, UserResponseDto.class);
	}
	
	@Cacheable(value = "users", key = "#userId")
	public UserResponseDto get(Long userId) {
		
		User user = repo.findById(userId).orElseThrow(() -> new UserNotFoundException("This user is not present"));
		
		return modelMapper.map(user, UserResponseDto.class);
	}
	
	@CacheEvict(value = "users", key = "#userId")
	public UserResponseDto delete(Long userId) {
		
		User user = repo.findById(userId).orElseThrow(() -> new UserNotFoundException("This user is not present"));
		repo.deleteById(userId);
		
		return modelMapper.map(user, UserResponseDto.class);
	}

	@Cacheable(value="users", key = "#page + '_' + #size + '_' + #sortBy + '_' + #direction")
    public PageResponse<UserResponseDto> getUsers(int page, int size, String sortBy, String direction) {
		
		Sort sort = direction.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
		
		Pageable pageable = PageRequest.of(page, size, sort);
		
		Page<User> userPage = repo.findAll(pageable);
		
		List<UserResponseDto> dtoList = userPage.getContent().stream().map(book -> modelMapper.map(book,  UserResponseDto.class)).toList();
		
		return new PageResponse<>(
				dtoList,
				userPage.getNumber(),
				userPage.getSize(),
				userPage.getTotalElements(),
				userPage.getTotalPages()
			);
	}
}
