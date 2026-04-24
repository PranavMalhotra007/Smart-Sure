package com.smartSure.authService.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(name = "Change Password Request Dto")
public class ChangePasswordRequestDto {

    @NotBlank(message = "Current password should not be blank")
    private String currentPassword;

    @NotBlank(message = "New password should not be blank")
    @Size(min = 8, message = "Minimum length of new password is 8")
    private String newPassword;

    @NotBlank(message = "Confirm password should not be blank")
    private String confirmPassword;
}
