package com.smartSure.authService.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.smartSure.authService.entity.Role;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class AdminSeeder {

    private final UserRepository repo;
    private final PasswordEncoder passwordEncoder;
    
    @Value("${admin.email}")
    private String adminEmail;
    
    @Value("${admin.password}")
    private String adminPassword;
    
    @Value("${admin.firstname}")
    private String firstName;
    
    @Value("${admin.lastname}")
    private String lastName;

    @Bean
    public CommandLineRunner seedAdmin() {
        return args -> {
        	
        	if (adminEmail == null || adminPassword == null) {
                throw new RuntimeException("Admin credentials not configured properly");
            }

        	repo.findByEmail(adminEmail).ifPresentOrElse(user -> {
        	}, () -> {
        	    User admin = new User();
        	    admin.setFirstName(firstName);
        	    admin.setLastName(lastName);
        	    admin.setEmail(adminEmail);
        	    admin.setPassword(passwordEncoder.encode(adminPassword));
        	    admin.setRole(Role.ADMIN);

        	    repo.save(admin);
        	});
        };
    }
}