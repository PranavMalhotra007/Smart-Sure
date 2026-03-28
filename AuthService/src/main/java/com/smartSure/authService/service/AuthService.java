package com.smartSure.authService.service;

import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.smartSure.authService.dto.auth.AuthResponseDto;
import com.smartSure.authService.dto.auth.LoginRequestDto;
import com.smartSure.authService.dto.auth.RegisterRequestDto;
import com.smartSure.authService.dto.messagePayload.EmailMessage;
import com.smartSure.authService.entity.Role;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.messaging.EmailPublisher;
import com.smartSure.authService.repository.UserRepository;
import com.smartSure.authService.security.JwtUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
	
	private final UserRepository repo;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtUtil;
	private final ModelMapper modelMapper;
	private final EmailPublisher emailPublisher;
	
	public String register(RegisterRequestDto request) {
		User user = modelMapper.map(request, User.class);
		user.setPassword(passwordEncoder.encode(request.getPassword()));
		user.setRole(Role.valueOf(request.getRole().toUpperCase()));
		
		if(repo.findByEmail(request.getEmail()).isPresent()) {
			throw new RuntimeException("Email already registered");
		}
		
		repo.save(user);
		
//		RabbitMQ
		
		emailPublisher.sendEmail(
		        new EmailMessage(
		            user.getEmail(),
		            "Welcome to SmartSure",
		            "Your account has been created successfully!"
		        )
		    );
		
		return "User registered successfully";
	}
	
	public AuthResponseDto login(LoginRequestDto request) {
		
		User user = repo.findByEmail(request.getEmail())
				.orElseThrow(() -> new RuntimeException("User not found"));
		
		if(!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
			throw new RuntimeException("Invalid credentials");
		}
		
//		String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
		String token = jwtUtil.generateToken(user.getUserId(), user.getRole().name());
		
//		RabbitMQ
		
		emailPublisher.sendEmail(
		        new EmailMessage(
		            user.getEmail(),
		            "Login Alert",
		            "You have successfully logged in to Smart Sure."
		        )
		    );
		return new AuthResponseDto(token, user.getEmail(), user.getRole().name());
	}
}
