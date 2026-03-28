package com.smartSure.adminService.config;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.smartSure.adminService.util.HeaderUtils;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;

@Component
public class FeignInterceptor implements RequestInterceptor {

    @Value("${internal.secret}")
    private String internalSecret;


    @Override
    public void apply(RequestTemplate template) {

        template.header("X-Internal-Secret", internalSecret);


        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attributes == null) {
            return;
        }

        HttpServletRequest request = attributes.getRequest();

        HeaderUtils.copyHeaders(request, template);
    }
}