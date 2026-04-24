package com.smartSure.authService.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(name = "User Request Dto")
public class UserRequestDto {

    @NotBlank(message = "First name should not be blank")
    private String firstName;

    private String lastName;

    private Long phone;

    private String dateOfBirth;   // yyyy-MM-dd

    private String gender;        // MALE / FEMALE / OTHER
}
