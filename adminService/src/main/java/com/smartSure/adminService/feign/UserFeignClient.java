package com.smartSure.adminService.feign;

import com.smartSure.adminService.dto.UserDTO;
import com.smartSure.adminService.dto.PageResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "authService")
public interface UserFeignClient {

    // Fetch a single user by ID — used when admin views claim/policy details
    @GetMapping("/user/getInfo/{userId}")
    UserDTO getUserById(@PathVariable Long userId);

    // Fetch all users — used for admin user management dashboard
    @GetMapping("/user/getAll")
    PageResponseDTO<UserDTO> getAllUsers();
}
