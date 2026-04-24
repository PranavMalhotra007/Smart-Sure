package com.smartSure.authService.dto.address;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(name = "Address Request Dto")
public class AddressRequestDto {

    @NotBlank(message = "Street address should not be blank")
    private String street;

    @NotBlank(message = "City should not be blank")
    private String city;

    @NotBlank(message = "State should not be blank")
    private String state;

    @NotBlank(message = "Pincode should not be blank")
    private String pincode;

    @NotBlank(message = "Country should not be blank")
    private String country;
}
