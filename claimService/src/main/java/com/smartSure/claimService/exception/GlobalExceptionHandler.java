package com.smartSure.claimService.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClaimNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleClaimNotFound(ClaimNotFoundException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(map);
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, String>> handleInvalidTransition(InvalidStatusTransitionException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(map);
    }

    @ExceptionHandler(ClaimDeletionNotAllowedException.class)
    public ResponseEntity<Map<String, String>> handleDeletionNotAllowed(ClaimDeletionNotAllowedException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(map);
    }

    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(UnauthorizedAccessException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(map);
    }

    @ExceptionHandler(DocumentNotUploadedException.class)
    public ResponseEntity<Map<String, String>> handleDocumentNotUploaded(DocumentNotUploadedException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(map);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", "Validation failed: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(map);
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleBadRequest(Exception ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(map);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        Map<String, String> map = new HashMap<>();
        map.put("Error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(map);
    }
}
