package com.smartSure.claimService.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.smartSure.claimService.dto.PolicyDTO;

@FeignClient(name = "policyService", path = "/api/policies")
public interface PolicyClient {

    // FeignClientInterceptor forwards X-User-Id, X-User-Role, X-Internal-Secret automatically
    @GetMapping("/{policyId}")
    PolicyDTO getPolicyById(@PathVariable("policyId") Long policyId);

    @org.springframework.web.bind.annotation.PutMapping("/internal/{policyId}/deduct-coverage")
    PolicyDTO deductCoverage(@PathVariable("policyId") Long policyId, @org.springframework.web.bind.annotation.RequestParam("amount") java.math.BigDecimal amount);

    @GetMapping("/internal/customer/{customerId}/policy-ids")
    java.util.List<Long> getMyPolicyIds(@PathVariable("customerId") Long customerId);
}
