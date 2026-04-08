package com.smartSure.adminService.config;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.smartSure.adminService.util.HeaderUtils;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@Component
public class FeignInterceptor implements RequestInterceptor {

    @Value("${internal.secret}")
    private String internalSecret;


    @Override
    public void apply(RequestTemplate template) {

        template.header("X-Internal-Secret", internalSecret);

        // Always derive X-User-* from Spring Security context.
        // This avoids relying on servlet request context existing inside Feign execution.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            template.header("X-User-Id", String.valueOf(auth.getPrincipal()));

            String role = null;
            for (GrantedAuthority ga : auth.getAuthorities()) {
                if (ga != null && ga.getAuthority() != null) {
                    role = ga.getAuthority();
                    break;
                }
            }

            // Strip ROLE_ prefix if present (e.g. ROLE_ADMIN -> ADMIN)
            if (role != null) {
                if (role.startsWith("ROLE_")) {
                    role = role.substring("ROLE_".length());
                }
                template.header("X-User-Role", role);
            }
        }
    }
}