package com.smartSure.authService.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class InternalRequestFilter extends OncePerRequestFilter {
	
	@Value("${internal.secret}")
	private String internalSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
    	
    	String path = request.getRequestURI();
    	
        // Only enforce internal secret for internal endpoints
        if (path.contains("/internal/")) {
            String secret = request.getHeader("X-Internal-Secret");

            if (secret == null || !internalSecret.equals(secret)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}