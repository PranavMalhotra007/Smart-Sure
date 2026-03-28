package com.smartSure.authService.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.smartSure.authService.dto.address.AddressRequestDto;
import com.smartSure.authService.dto.address.AddressResponseDto;
import com.smartSure.authService.entity.Address;
import com.smartSure.authService.entity.User;
import com.smartSure.authService.repository.AddressRepository;
import com.smartSure.authService.repository.UserRepository;
import com.smartSure.authService.security.JwtUtil;

@ExtendWith(MockitoExtension.class)
public class AddressServiceTest {
	
	@Mock
    private AddressRepository repo;
	
	@Mock
	private UserRepository uRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private ModelMapper modelMapper;

    @InjectMocks
    private AddressService service;
    
    @Test
    void createAddress_success() {

    	User user = new User();
        Address address = new Address();

        when(uRepo.findById(1L)).thenReturn(Optional.of(user));
        
        when(modelMapper.map(any(AddressRequestDto.class), eq(Address.class))).thenReturn(address);

        when(repo.save(any(Address.class))).thenReturn(address);
        when(modelMapper.map(any(Address.class), eq(AddressResponseDto.class))).thenReturn(new AddressResponseDto());

        AddressResponseDto response = service.create(new AddressRequestDto(), 1L);

        assertNotNull(response);
    }
}
