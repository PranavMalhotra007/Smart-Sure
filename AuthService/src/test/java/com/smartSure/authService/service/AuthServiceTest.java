package com.smartSure.authService.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.smartSure.authService.dto.auth.AuthResponseDto;
import com.smartSure.authService.dto.auth.LoginRequestDto;
import com.smartSure.authService.dto.auth.RegisterRequestDto;
import com.smartSure.authService.entity.Role;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.messaging.EmailPublisher;
import com.smartSure.authService.repository.UserRepository;
import com.smartSure.authService.security.JwtUtil;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository repo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;
    
    @Mock
    private EmailPublisher emailPublisher;
    
    @Mock
    private ModelMapper modelMapper;

    @InjectMocks
    private AuthService authService;
    
    @Test
    void register_success() {

    	 RegisterRequestDto req = new RegisterRequestDto();
         req.setEmail("test@gmail.com");
         req.setPassword("password123");
         req.setRole("CUSTOMER");

         User user = new User();

         when(repo.findByEmail(req.getEmail())).thenReturn(Optional.empty());
         when(modelMapper.map(req, User.class)).thenReturn(user);
         when(passwordEncoder.encode(req.getPassword())).thenReturn("encoded");
         doNothing().when(emailPublisher).sendEmail(any()); 

         String result = authService.register(req);

         assertEquals("User registered successfully", result);
         verify(repo).save(user);
         verify(emailPublisher).sendEmail(any());
    }
    
    @Test
    void register_emailAlreadyExists() {

        RegisterRequestDto req = new RegisterRequestDto();
        req.setEmail("test@gmail.com");
        req.setPassword("password123");
        req.setRole("CUSTOMER");

        User user = new User();
        when(modelMapper.map(req, User.class)).thenReturn(user);
        when(passwordEncoder.encode(req.getPassword())).thenReturn("encoded");
        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(new User()));

        assertThrows(RuntimeException.class, () -> authService.register(req));
    }
    
    @Test
    void login_success() {

    	LoginRequestDto req = new LoginRequestDto();
        req.setEmail("test@gmail.com");
        req.setPassword("password123");

        User user = new User();
        user.setUserId(1L);
        user.setEmail("test@gmail.com");
        user.setPassword("encoded");
        user.setRole(Role.CUSTOMER);

        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(req.getPassword(), user.getPassword())).thenReturn(true);
        when(jwtUtil.generateToken(user.getUserId(), user.getRole().name())).thenReturn("token");
        doNothing().when(emailPublisher).sendEmail(any()); // prevent NPE

        AuthResponseDto response = authService.login(req);

        assertEquals("token", response.getToken());
        verify(emailPublisher).sendEmail(any());
    }
    
    @Test
    void login_invalidPassword() {

        LoginRequestDto req = new LoginRequestDto();
        req.setEmail("test@gmail.com");
        req.setPassword("wrong");

        User user = new User();
        user.setPassword("encoded");

        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(req.getPassword(), user.getPassword())).thenReturn(false);

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }
}