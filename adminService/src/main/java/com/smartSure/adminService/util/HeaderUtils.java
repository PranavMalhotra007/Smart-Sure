package com.smartSure.adminService.util;

import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;

public class HeaderUtils {

    public static void copyHeaders(HttpServletRequest request, RequestTemplate template) {

        String userId = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");

        if (userId != null) {
            template.header("X-User-Id", userId);
        }

        if (role != null) {
            // Downstream services expect ROLE_ prefix to be added by their own filters,
            // so normalize here if the header already contains it.
            if (role.startsWith("ROLE_")) {
                role = role.substring("ROLE_".length());
            }
            template.header("X-User-Role", role);
        }
    }
}