package com.smartSure.claimService.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class HeaderAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String userIdStr = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");
        
        String path = request.getRequestURI();

        if (path.contains("swagger") || path.contains("api-docs") || path.contains("actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (userIdStr != null && role != null) {
            try {
                Long userId = Long.parseLong(userIdStr);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );

                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (NumberFormatException e) {
                // invalid userId header — skip authentication
            }
        }

        filterChain.doFilter(request, response);
    }
}