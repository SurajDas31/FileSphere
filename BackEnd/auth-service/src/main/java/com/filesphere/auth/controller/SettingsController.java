package com.filesphere.auth.controller;

import java.util.HashMap;
import java.util.Map;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.apache.commons.net.ftp.FTPReply;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.filesphere.auth.model.User;
import com.filesphere.auth.repository.UserRepository;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
public class SettingsController {

    private static Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.filesphere.auth.repository.SystemSettingRepository systemSettingRepository;

    @Autowired
    private com.filesphere.auth.repository.UserSettingRepository userSettingRepository;

    @GetMapping("/user/settings")
    public ResponseEntity<?> getUserSettings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        com.filesphere.auth.model.UserSetting us = userSettingRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    com.filesphere.auth.model.UserSetting newUs = new com.filesphere.auth.model.UserSetting();
                    newUs.setUserId(user.getId());
                    return userSettingRepository.save(newUs);
                });
        return ResponseEntity.ok(us);
    }

    @PostMapping("/user/settings")
    public ResponseEntity<?> updateUserSettings(@RequestBody Map<String, Object> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        com.filesphere.auth.model.UserSetting us = userSettingRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    com.filesphere.auth.model.UserSetting newUs = new com.filesphere.auth.model.UserSetting();
                    newUs.setUserId(user.getId());
                    return newUs;
                });

        if (request.containsKey("theme")) {
            us.setTheme((String) request.get("theme"));
        }
        if (request.containsKey("glassmorphism")) {
            us.setGlassmorphism((Boolean) request.get("glassmorphism"));
        }
        if (request.containsKey("accentColor")) {
            us.setAccentColor((String) request.get("accentColor"));
        }
        if (request.containsKey("sidebarDensity")) {
            us.setSidebarDensity((String) request.get("sidebarDensity"));
        }
        if (request.containsKey("autoHideSidebar")) {
            us.setAutoHideSidebar((Boolean) request.get("autoHideSidebar"));
        }

        userSettingRepository.save(us);
        return ResponseEntity.ok(us);
    }

    @org.springframework.beans.factory.annotation.Value("${app.tenant.max-file-size-bytes:52428800}")
    private long maxFileSizeConfig;

    private Map<String, String> getLoadedSystemSettings() {
        Map<String, String> current = new HashMap<>();
        systemSettingRepository.findAll().forEach(s -> current.put(s.getKey(), s.getValue()));
        
        // Ensure standard keys exist
        current.putIfAbsent("storage_path", "/app/storage");
        current.putIfAbsent("storage_type", "LOCAL");
        current.putIfAbsent("ftp_host", "ftp.filesphere.com");
        current.putIfAbsent("ftp_port", "21");
        current.putIfAbsent("ftp_user", "ftpuser");
        current.putIfAbsent("ftp_password", "ftppassword");
        return current;
    }

    @GetMapping("/admin/settings")
    public ResponseEntity<?> getAdminSettings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!"SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: SUPER_ADMIN role required"));
        }

        Map<String, String> loaded = getLoadedSystemSettings();

        // Include OAuth IDs dynamically from Environment vars if not custom modified
        Map<String, String> responseSettings = new HashMap<>(loaded);
        responseSettings.putIfAbsent("google_client_id", System.getenv("GOOGLE_CLIENT_ID") != null ? System.getenv("GOOGLE_CLIENT_ID") : "placeholder-id");
        responseSettings.putIfAbsent("google_client_secret", System.getenv("GOOGLE_CLIENT_SECRET") != null ? System.getenv("GOOGLE_CLIENT_SECRET") : "placeholder-secret");
        responseSettings.putIfAbsent("facebook_client_id", System.getenv("FACEBOOK_CLIENT_ID") != null ? System.getenv("FACEBOOK_CLIENT_ID") : "placeholder-id");
        responseSettings.putIfAbsent("facebook_client_secret", System.getenv("FACEBOOK_CLIENT_SECRET") != null ? System.getenv("FACEBOOK_CLIENT_SECRET") : "placeholder-secret");
        responseSettings.putIfAbsent("max_file_size_limit", String.valueOf(maxFileSizeConfig));

        return ResponseEntity.ok(responseSettings);
    }

    @PostMapping("/admin/settings")
    public ResponseEntity<?> saveAdminSettings(@RequestBody Map<String, String> settings) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!"SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: SUPER_ADMIN role required"));
        }

        for (Map.Entry<String, String> entry : settings.entrySet()) {
            systemSettingRepository.save(new com.filesphere.auth.model.SystemSetting(entry.getKey(), entry.getValue()));
        }
        return ResponseEntity.ok(Map.of("message", "Settings updated successfully"));
    }

    @PostMapping("/admin/ftp/test")
    public ResponseEntity<?> testFtpConnection(@RequestBody Map<String, String> ftpDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!"SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: SUPER_ADMIN role required"));
        }

        // Simulate connection test success feedback
        String host = ftpDetails.getOrDefault("ftp_host", "");
        int port = Integer.parseInt(ftpDetails.getOrDefault("ftp_port", ""));
        String ftpUser = ftpDetails.getOrDefault("ftp_user", "");
        String ftpPass = ftpDetails.getOrDefault("ftp_password", "");

        FTPClient ftpClient = new FTPClient();

        try {
            ftpClient.connect(host, port);

            int replyCode = ftpClient.getReplyCode();
            if (!FTPReply.isPositiveCompletion(replyCode)) {
                ftpClient.disconnect();
                return new ResponseEntity<>(Map.of("message", "Connection failed. Reply code: " + replyCode), HttpStatus.SERVICE_UNAVAILABLE);
            }

            boolean success = ftpClient.login(ftpUser, ftpPass);

            if (success) {
                log.info("Connected and logged in successfully.");

                ftpClient.enterLocalPassiveMode();
                ftpClient.setFileType(FTP.BINARY_FILE_TYPE);

                // Verify by listing the current directory
                FTPFile[] filesArr = ftpClient.listFiles();

                Arrays.asList(filesArr).stream().forEach(file -> System.out.println(file));
                

                ftpClient.logout();
            } else {
                log.info("Login failed, Check the credentials.");
                return new ResponseEntity<>(Map.of("message", "Login failed, Check the credentials: " + host), HttpStatus.UNAUTHORIZED);
            }

        } catch (Exception e) {
            log.info("Connection error: " + e.getMessage());
            e.printStackTrace();

            return new ResponseEntity<>(Map.of("message", "Connection error: " + e.getMessage()), HttpStatus.SERVICE_UNAVAILABLE);
        } finally {
            try {
                if (ftpClient.isConnected()) {
                    ftpClient.disconnect();
                }
            } catch (Exception ignored) {
            }
        }
        
        return ResponseEntity.ok(Map.of("message", "Connection established successfully to FTP server " + host));
    }

    @GetMapping("/admin/storage/directories")
    public ResponseEntity<?> listDirectories() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!"SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: SUPER_ADMIN role required"));
        }

        java.util.List<String> paths = new java.util.ArrayList<>();
        paths.add("/"); // Default FTP root

        Map<String, String> loaded = getLoadedSystemSettings();
        String host = loaded.getOrDefault("ftp_host", "ftp.filesphere.com");
        String portStr = loaded.getOrDefault("ftp_port", "21");
        int port = 21;
        try {
            port = Integer.parseInt(portStr);
        } catch (NumberFormatException e) {}
        String ftpUser = loaded.getOrDefault("ftp_user", "ftpuser");
        String ftpPass = loaded.getOrDefault("ftp_password", "ftppassword");

        FTPClient ftpClient = new FTPClient();
        try {
            ftpClient.connect(host, port);
            int replyCode = ftpClient.getReplyCode();
            if (FTPReply.isPositiveCompletion(replyCode)) {
                boolean success = ftpClient.login(ftpUser, ftpPass);
                if (success) {
                    ftpClient.enterLocalPassiveMode();
                    // Recursively collect nested directories from root "/"
                    collectSubDirectories(ftpClient, "/", paths, 0, 3);
                    ftpClient.logout();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to retrieve directories from FTP server: " + e.getMessage());
        } finally {
            try {
                if (ftpClient.isConnected()) {
                    ftpClient.disconnect();
                }
            } catch (Exception ignored) {}
        }

        java.util.List<String> uniquePaths = paths.stream().distinct().toList();
        return ResponseEntity.ok(uniquePaths);
    }

    private void collectSubDirectories(FTPClient ftpClient, String currentDir, java.util.List<String> paths, int currentDepth, int maxDepth) {
        if (currentDepth > maxDepth) {
            return;
        }
        try {
            FTPFile[] files = ftpClient.listFiles(currentDir);
            if (files != null) {
                for (FTPFile f : files) {
                    if (f.isDirectory() && !f.getName().equals(".") && !f.getName().equals("..")) {
                        String cleanPath = currentDir.endsWith("/") ? currentDir + f.getName() : currentDir + "/" + f.getName();
                        paths.add(cleanPath);
                        collectSubDirectories(ftpClient, cleanPath, paths, currentDepth + 1, maxDepth);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error exploring subdirectories at " + currentDir + ": " + e.getMessage());
        }
    }
}
