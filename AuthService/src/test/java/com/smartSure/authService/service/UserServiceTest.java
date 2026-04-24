package com.smartSure.authService.service;

import com.smartSure.authService.dto.auth.ChangePasswordRequestDto;
import com.smartSure.authService.dto.pagination.PageResponse;
import com.smartSure.authService.dto.user.UserRequestDto;
import com.smartSure.authService.dto.user.UserResponseDto;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.exception.UserNotFoundException;
import com.smartSure.authService.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ModelMapper modelMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user;
    private UserRequestDto requestDto;
    private UserResponseDto responseDto;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUserId(1L);
        user.setFirstName("Test");
        user.setEmail("test@test.com");

        requestDto = new UserRequestDto();
        requestDto.setFirstName("Updated");
        requestDto.setLastName("User");

        responseDto = new UserResponseDto();
        responseDto.setUserId(1L);
        responseDto.setEmail("test@test.com");
        responseDto.setFirstName("Updated");
    }

    // ── add() ────────────────────────────────────────────────────────────────

    @Test
    void add_NormalCase_DelegatesToUpdate() {
        // add() now delegates to update() internally
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(modelMapper.map(user, UserResponseDto.class)).thenReturn(responseDto);

        UserResponseDto result = userService.add(userId, requestDto);

        assertNotNull(result);
        assertEquals("Updated", result.getFirstName());
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void add_ExceptionCase_UserNotFound() {
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.add(userId, requestDto));
        verify(userRepository, never()).save(any());
    }

    // ── update() ─────────────────────────────────────────────────────────────

    @Test
    void update_NormalCase_Success() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(modelMapper.map(user, UserResponseDto.class)).thenReturn(responseDto);

        UserResponseDto result = userService.update(requestDto, userId);

        assertNotNull(result);
        // Verify firstName was set directly on the entity (no ModelMapper)
        assertEquals("Updated", user.getFirstName());
        verify(userRepository).save(user);
    }

    @Test
    void update_ExceptionCase_UserNotFound() {
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.update(requestDto, userId));
        verify(userRepository, never()).save(any());
    }

    // ── get() ─────────────────────────────────────────────────────────────────

    @Test
    void get_NormalCase_Success() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(modelMapper.map(user, UserResponseDto.class)).thenReturn(responseDto);

        UserResponseDto result = userService.get(userId);

        assertNotNull(result);
        assertEquals(1L, result.getUserId());
    }

    @Test
    void get_ExceptionCase_NotFound() {
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.get(userId));
    }

    // ── delete() ─────────────────────────────────────────────────────────────

    @Test
    void delete_NormalCase_Success() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(modelMapper.map(user, UserResponseDto.class)).thenReturn(responseDto);

        UserResponseDto result = userService.delete(userId);

        assertNotNull(result);
        verify(userRepository).deleteById(userId);
    }

    @Test
    void delete_ExceptionCase_NotFound() {
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.delete(userId));
    }

    // ── getUsers() ────────────────────────────────────────────────────────────

    @Test
    void getUsers_NormalCase_PagedResult() {
        Page<User> userPage = new PageImpl<>(List.of(user));
        when(userRepository.findAll(any(Pageable.class))).thenReturn(userPage);
        when(modelMapper.map(user, UserResponseDto.class)).thenReturn(responseDto);

        PageResponse<UserResponseDto> result = userService.getUsers(0, 10, "userId", "asc");

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(0, result.getPage());
    }

    // ── changePassword() ──────────────────────────────────────────────────────

    @Test
    void changePassword_NormalCase_Success() {
        Long userId = 1L;
        user.setPassword("encoded_old_password");

        ChangePasswordRequestDto pwdDto = new ChangePasswordRequestDto();
        pwdDto.setCurrentPassword("oldPassword1");
        pwdDto.setNewPassword("newPassword1");
        pwdDto.setConfirmPassword("newPassword1");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword1", "encoded_old_password")).thenReturn(true);
        when(passwordEncoder.encode("newPassword1")).thenReturn("encoded_new_password");
        when(userRepository.save(user)).thenReturn(user);

        String result = userService.changePassword(userId, pwdDto);

        assertEquals("Password changed successfully", result);
        assertEquals("encoded_new_password", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_ExceptionCase_WrongCurrentPassword() {
        Long userId = 1L;
        user.setPassword("encoded_old_password");

        ChangePasswordRequestDto pwdDto = new ChangePasswordRequestDto();
        pwdDto.setCurrentPassword("wrongPassword");
        pwdDto.setNewPassword("newPassword1");
        pwdDto.setConfirmPassword("newPassword1");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPassword", "encoded_old_password")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.changePassword(userId, pwdDto));
        assertEquals("Current password is incorrect", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_ExceptionCase_PasswordMismatch() {
        Long userId = 1L;
        user.setPassword("encoded_old_password");

        ChangePasswordRequestDto pwdDto = new ChangePasswordRequestDto();
        pwdDto.setCurrentPassword("oldPassword1");
        pwdDto.setNewPassword("newPassword1");
        pwdDto.setConfirmPassword("differentPassword");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword1", "encoded_old_password")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.changePassword(userId, pwdDto));
        assertEquals("New passwords do not match", ex.getMessage());
        verify(userRepository, never()).save(any());
    }
}
