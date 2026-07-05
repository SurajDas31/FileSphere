package com.filesphere.auth.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.filesphere.auth.model.User;
import com.filesphere.auth.model.UserResponse;
import com.filesphere.auth.repository.UserRepository;
import com.filesphere.auth.security.JwtService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private static Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private com.filesphere.auth.repository.TenantRepository tenantRepository;

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (userRepository.existsByEmail(email)) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Email/username is already registered");
            return ResponseEntity.badRequest().body(response);
        }

        String role = "USER";
        String tenantIdStr = request.get("tenantId");
        String joinTenantMode = request.getOrDefault("joinTenantMode", "join"); // "join" or "create"
        com.filesphere.auth.model.Tenant tenant = null;

        if ("create".equalsIgnoreCase(joinTenantMode)) {
            String tenantName = request.get("tenantName");
            if (tenantName == null || tenantName.trim().isEmpty()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Tenant name is required for creating a tenant");
                return ResponseEntity.badRequest().body(response);
            }
            tenant = new com.filesphere.auth.model.Tenant();
            tenant.setName(tenantName.trim());
            
            // Calculate next auto-increment sequence starting at 1000
            Long nextKey = 1000L;
            try {
                java.util.List<com.filesphere.auth.model.Tenant> allTenants = tenantRepository.findAll();
                for (com.filesphere.auth.model.Tenant t : allTenants) {
                    if (t.getTenantKey() != null && t.getTenantKey() >= nextKey) {
                        nextKey = t.getTenantKey() + 1;
                    }
                }
            } catch (Exception e) {}
            tenant.setTenantKey(nextKey);
            
            tenant = tenantRepository.save(tenant);
            role = "ADMIN";
        } else {
            // Join Mode: Enforce required alphanumeric/BIGINT tenantKey
            if (tenantIdStr == null || tenantIdStr.trim().isEmpty()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Tenant Id is not available");
                return ResponseEntity.badRequest().body(response);
            }
            Long lookupKey = null;
            try {
                lookupKey = Long.parseLong(tenantIdStr.trim());
            } catch (NumberFormatException e) {
                // Invalid numeric ID
            }
            if (lookupKey != null) {
                tenant = tenantRepository.findByTenantKey(lookupKey).orElse(null);
            }
            if (tenant == null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Tenant Id is not available");
                return ResponseEntity.badRequest().body(response);
            }
        }

        User user = new User();
        user.setFirstName(request.get("firstName"));
        user.setLastName(request.get("lastName"));
        user.setEmail(email);
        user.setMobileNo(request.get("mobileNo"));
        user.setRole(role);
        user.setTenant(tenant);
        user.setPassword(passwordEncoder.encode(request.get("password")));

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getFirstName(), user.getLastName(), user.getTenantId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("token", token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        UserResponse userResponse = new UserResponse(
                user.getId(), 
                user.getFirstName(), 
                user.getLastName(), 
                user.getEmail(), 
                user.getMobileNo(), 
                user.getRole(),
                user.getTenantId(),
                user.getProfilePicPath()
        );

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getFirstName(), user.getLastName(), user.getTenantId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);        
        response.put("user", userResponse);
        
        return ResponseEntity.ok(response);
    }

    @Autowired
    private com.filesphere.auth.repository.InvalidatedTokenRepository invalidatedTokenRepository;

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            try {
                java.util.Date expiry = jwtService.extractExpiration(jwt);
                com.filesphere.auth.model.InvalidatedToken blacklistedToken = new com.filesphere.auth.model.InvalidatedToken(jwt, expiry);
                invalidatedTokenRepository.save(blacklistedToken);
            } catch (Exception e) {
                // Token extraction / validation error, ignore or log
            }
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (request.containsKey("firstName")) {
            user.setFirstName(request.get("firstName"));
        }
        if (request.containsKey("lastName")) {
            user.setLastName(request.get("lastName"));
        }
        if (request.containsKey("mobileNo")) {
            user.setMobileNo(request.get("mobileNo"));
        }

        userRepository.save(user);

        UserResponse userResponse = new UserResponse(
                user.getId(), 
                user.getFirstName(), 
                user.getLastName(), 
                user.getEmail(), 
                user.getMobileNo(), 
                user.getRole(),
                user.getTenantId(),
                user.getProfilePicPath()
        );

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getFirstName(), user.getLastName(), user.getTenantId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", userResponse);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        UserResponse userResponse = new UserResponse(
                user.getId(), 
                user.getFirstName(), 
                user.getLastName(), 
                user.getEmail(), 
                user.getMobileNo(), 
                user.getRole(),
                user.getTenantId(),
                user.getProfilePicPath()
        );
        return ResponseEntity.ok(userResponse);
    }

    // Profile Upload Endpoint (Simulating saving to shared NFS path)
    @PostMapping("/profile/upload")
    public ResponseEntity<?> uploadProfilePic(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty file provided"));
        }

        try {
            // Shared NFS/storage profiles folder path inside Docker structure
            String nfsProfilePath = "/app/storage/profiles/";
            java.io.File directory = new java.io.File(nfsProfilePath);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String fileExtension = "";
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String internalName = "profile_" + user.getId() + fileExtension;
            java.io.File destination = new java.io.File(nfsProfilePath + internalName);
            file.transferTo(destination);

            // Save visual relative URL access path or disk absolute path
            // Tying this to local port mapping so standard HTTP can fetch it
            String accessPath = "http://localhost:7002/api/auth/profile/pic/" + internalName;
            user.setProfilePicPath(accessPath);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("profilePicPath", accessPath));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "NFS upload failed: " + e.getMessage()));
        }
    }

    // Profile Image Stream Endpoint
    @GetMapping("/profile/pic/{filename:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> getProfilePic(@PathVariable String filename) {
        try {
            java.nio.file.Path path = java.nio.file.Paths.get("/app/storage/profiles/" + filename);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "image/png") // Fallback content-type
                        .body(resource);
            }
        } catch (Exception e) {
            // Fallback to error or ignore
        }
        return ResponseEntity.notFound().build();
    }

    

    @GetMapping("/admin/tenants")
    public ResponseEntity<?> listTenantsAndUsers() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!"SUPER_ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: SUPER_ADMIN role required"));
        }

        java.util.List<User> allUsers = userRepository.findAll();
        Map<String, java.util.List<UserResponse>> tenantMap = new HashMap<>();

        for (User u : allUsers) {
            String tId = u.getTenant() != null ? String.valueOf(u.getTenant().getTenantKey()) : "default-tenant";
            UserResponse ur = new UserResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getMobileNo(), u.getRole(), tId, u.getProfilePicPath());
            tenantMap.computeIfAbsent(tId, k -> new java.util.ArrayList<>()).add(ur);
        }

        return ResponseEntity.ok(tenantMap);
    }
}
