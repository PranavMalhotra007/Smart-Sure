package com.smartSure.adminService.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Distributed Caching Configuration for AdminService
 * 
 * This configuration class sets up Redis-based distributed caching to improve
 * performance by caching frequently accessed administrative data such as
 * audit logs, user information, system statistics, and dashboard data
 * across multiple service instances.
 * 
 * Key Features:
 * - Redis as the distributed cache store
 * - JSON serialization for complex objects
 * - Configurable TTL for different cache regions
 * - Connection pooling for optimal performance
 * - Cache eviction strategies for data consistency
 * - Administrative dashboard optimization
 * 
 * @author SmartSure Development Team
 * @version 1.0
 * @since 2024-03-25
 */
@Slf4j
@Configuration
@EnableCaching
public class AdminCacheConfig {

    /**
     * Cache region names used throughout the AdminService
     */
    public static final String AUDIT_LOGS_CACHE = "audit-logs";
    public static final String USER_MANAGEMENT_CACHE = "user-management";
    public static final String SYSTEM_STATISTICS_CACHE = "system-statistics";
    public static final String DASHBOARD_DATA_CACHE = "dashboard-data";
    public static final String RECENT_ACTIVITY_CACHE = "recent-activity";
    public static final String ADMIN_REPORTS_CACHE = "admin-reports";

    /**
     * Configures the Redis-based cache manager with custom serialization
     * and TTL settings for different cache regions.
     * 
     * @param redisConnectionFactory Redis connection factory
     * @return Configured RedisCacheManager instance
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        log.info("Initializing Redis-based distributed cache manager for AdminService");
        
        // Configure JSON serialization for cache values
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = 
            new Jackson2JsonRedisSerializer<>(Object.class);
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, 
                                         ObjectMapper.DefaultTyping.NON_FINAL);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);

        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5)) // Default 5 minutes TTL for admin data
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(jackson2JsonRedisSerializer))
                .disableCachingNullValues();

        // Build cache manager with specific configurations for different regions
        RedisCacheManager cacheManager = RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultConfig)
                // Audit logs - medium TTL as they don't change once created
                .withCacheConfiguration(AUDIT_LOGS_CACHE, 
                    defaultConfig.entryTtl(Duration.ofMinutes(30)))
                // User management data - longer TTL as user data changes infrequently
                .withCacheConfiguration(USER_MANAGEMENT_CACHE, 
                    defaultConfig.entryTtl(Duration.ofHours(1)))
                // System statistics - very short TTL for real-time data
                .withCacheConfiguration(SYSTEM_STATISTICS_CACHE, 
                    defaultConfig.entryTtl(Duration.ofMinutes(2)))
                // Dashboard data - short TTL for near real-time updates
                .withCacheConfiguration(DASHBOARD_DATA_CACHE, 
                    defaultConfig.entryTtl(Duration.ofMinutes(3)))
                // Recent activity - very short TTL for real-time monitoring
                .withCacheConfiguration(RECENT_ACTIVITY_CACHE, 
                    defaultConfig.entryTtl(Duration.ofMinutes(1)))
                // Admin reports - longer TTL as reports are computationally expensive
                .withCacheConfiguration(ADMIN_REPORTS_CACHE, 
                    defaultConfig.entryTtl(Duration.ofMinutes(15)))
                .build();

        log.info("Redis cache manager initialized with {} cache regions for AdminService", 6);
        return cacheManager;
    }

    /**
     * Configures RedisTemplate for manual cache operations and complex queries.
     * 
     * @param redisConnectionFactory Redis connection factory
     * @return Configured RedisTemplate instance
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        log.debug("Configuring RedisTemplate for manual cache operations in AdminService");
        
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        
        // Configure serializers
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = 
            new Jackson2JsonRedisSerializer<>(Object.class);
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, 
                                         ObjectMapper.DefaultTyping.NON_FINAL);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);

        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        
        // Set serializers
        template.setKeySerializer(stringRedisSerializer);
        template.setHashKeySerializer(stringRedisSerializer);
        template.setValueSerializer(jackson2JsonRedisSerializer);
        template.setHashValueSerializer(jackson2JsonRedisSerializer);
        
        template.afterPropertiesSet();
        
        log.debug("RedisTemplate configured successfully for AdminService");
        return template;
    }
}