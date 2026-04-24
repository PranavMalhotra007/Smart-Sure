package com.smartSure.authService.service;

import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.smartSure.authService.dto.auth.ChangePasswordRequestDto;
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
	private final PasswordEncoder passwordEncoder;
	
	public UserResponseDto add(Long userId, UserRequestDto reqDto) {
		
		return update(reqDto, userId);
	}
	
	@CacheEvict(value = "users", key = "#userId")
	public UserResponseDto update(UserRequestDto reqDto, Long userId) {
		
		User user = repo.findById(userId).orElseThrow(() -> new UserNotFoundException("This user is not present"));
		
		// Safe partial update — never overwrite email / password / role
		if (reqDto.getFirstName() != null && !reqDto.getFirstName().isBlank()) {
			user.setFirstName(reqDto.getFirstName());
		}
		if (reqDto.getLastName() != null && !reqDto.getLastName().isBlank()) {
			user.setLastName(reqDto.getLastName());
		}
		if (reqDto.getPhone() != null) {
			user.setPhone(reqDto.getPhone());
		}
		if (reqDto.getDateOfBirth() != null && !reqDto.getDateOfBirth().isBlank()) {
			user.setDateOfBirth(reqDto.getDateOfBirth());
		}
		if (reqDto.getGender() != null && !reqDto.getGender().isBlank()) {
			user.setGender(reqDto.getGender());
		}

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

	@CacheEvict(value = "users", key = "#userId")
	public String changePassword(Long userId, ChangePasswordRequestDto reqDto) {

		User user = repo.findById(userId)
				.orElseThrow(() -> new UserNotFoundException("User not found"));

		if (!passwordEncoder.matches(reqDto.getCurrentPassword(), user.getPassword())) {
			throw new RuntimeException("Current password is incorrect");
		}

		if (!reqDto.getNewPassword().equals(reqDto.getConfirmPassword())) {
			throw new RuntimeException("New passwords do not match");
		}

		user.setPassword(passwordEncoder.encode(reqDto.getNewPassword()));
		repo.save(user);

		return "Password changed successfully";
	}
}
