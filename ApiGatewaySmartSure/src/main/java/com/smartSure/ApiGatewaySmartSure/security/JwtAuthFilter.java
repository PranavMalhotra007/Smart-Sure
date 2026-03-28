package com.smartSure.ApiGatewaySmartSure.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;


import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements WebFilter {

    private final JwtUtil jwtUtil;
    
    @Value("${internal.secret}")
    private String internalSecret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    	
    	String path = exchange.getRequest().getURI().getPath();
    	if (path.startsWith("/api/auth") ||
    		path.startsWith("/actuator") ||
    		path.startsWith("/authService/actuator") ||
    		path.startsWith("/swagger") ||
    		path.startsWith("/v3/api-docs")) {
    		
    	    return chain.filter(exchange);
    	}
    	
        String header = exchange.getRequest()
                .getHeaders()
                .getFirst(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")) {

            String token = header.substring(7);

            if (jwtUtil.validateToken(token)) {

                Long userIdLong = jwtUtil.extractUserIdAsLong(token);
                String userId = String.valueOf(userIdLong);
                String role = jwtUtil.extractRole(token);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                userIdLong,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );

                ServerWebExchange mutatedExchange = exchange.mutate()
                        .request(builder -> builder
                                .header("X-User-Id", userId)
                                .header("X-User-Role", role)
                                .header("X-Internal-Secret", internalSecret)
                        )
                        .build();

                return chain.filter(mutatedExchange)
                        .contextWrite(ReactiveSecurityContextHolder.withAuthentication(auth));
            }
        }

        return chain.filter(exchange);
    }
}