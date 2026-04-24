package com.smartSure.authService.dto.address;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(name = "Address Response Dto")
public class AddressResponseDto {

    private Long addressId;
    private String street;
    private String city;
    private String state;
    private String pincode;
    private String country;
}
