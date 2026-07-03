package com.filesphere.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.filesphere.gateway.repository.InvalidatedTokenRepository;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
@WebFilter("/*")
public class GatewayProxyFilter implements Filter {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.services.auth-url}")
    private String authServiceUrl;

    @Value("${app.services.file-url}")
    private String fileServiceUrl;

    @Autowired
    private InvalidatedTokenRepository invalidatedTokenRepository;

    private SecretKey getSigningKey() {
        byte[] keyBytes = this.jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        // 1. CORS Headers
        String origin = request.getHeader("Origin");
        if (origin != null) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        } else {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-Requested-With");
        response.setHeader("Access-Control-Allow-Credentials", "true");

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            return;
        }

        String path = request.getRequestURI();

        // 2. Identify Target Service and Security Requirements
        String targetBaseUrl;
        boolean requiresAuth = true;

        // Path matches:
        // /oauth2/**, /login/oauth2/**, /api/auth/signup, /api/auth/login, /api/auth/profile/pic/** -> Public auth
        boolean isPublicAuth = path.startsWith("/oauth2") || path.startsWith("/login/oauth2") ||
                path.equals("/api/auth/signup") || path.equals("/api/auth/login") ||
                path.startsWith("/api/auth/profile/pic/");

        if (isPublicAuth) {
            targetBaseUrl = authServiceUrl;
            requiresAuth = false;
        } else if (path.startsWith("/api/auth")) {
            targetBaseUrl = authServiceUrl;
            requiresAuth = true;
        } else if (path.startsWith("/api")) {
            targetBaseUrl = fileServiceUrl;
            requiresAuth = true;
        } else {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Not Found");
            return;
        }

        // 3. Authenticate JWT if required
        Map<String, String> trustHeaders = new HashMap<>();
        if (requiresAuth) {
            String authHeader = request.getHeader("Authorization");
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                token = request.getParameter("token");
            }

            if (token == null || token.trim().isEmpty()) {
                sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authorization header or token query parameter is required");
                return;
            }

            // Check if token is blacklisted
            if (invalidatedTokenRepository.existsById(token)) {
                sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Token is invalidated (logged out)");
                return;
            }

            try {
                // Parse JWT
                Claims claims = Jwts.parser()
                        .verifyWith(getSigningKey())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                // Extract fields
                String email = claims.getSubject();
                String role = claims.get("role", String.class);
                String tenantId = claims.get("tenantId", String.class);
                String firstName = claims.get("firstName", String.class);
                String lastName = claims.get("lastName", String.class);

                if (email == null) {
                    sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid token claims: subject is missing");
                    return;
                }

                // Populate custom trust headers
                trustHeaders.put("X-User-Email", email);
                if (role != null) trustHeaders.put("X-User-Role", role);
                if (tenantId != null) trustHeaders.put("X-Tenant-Id", tenantId);
                if (firstName != null) trustHeaders.put("X-User-First-Name", firstName);
                if (lastName != null) trustHeaders.put("X-User-Last-Name", lastName);

            } catch (Exception e) {
                sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token: " + e.getMessage());
                return;
            }
        }

        // 4. Proxy the request
        proxyRequest(request, response, targetBaseUrl, trustHeaders);
    }

    private void proxyRequest(HttpServletRequest request, HttpServletResponse response, String targetBaseUrl, Map<String, String> trustHeaders) throws IOException {
        String queryString = request.getQueryString();
        String path = request.getRequestURI();
        String targetUrlStr = targetBaseUrl + path + (queryString != null ? "?" + queryString : "");

        URL targetUrl = URI.create(targetUrlStr).toURL();
        HttpURLConnection conn = (HttpURLConnection) targetUrl.openConnection();
        conn.setRequestMethod(request.getMethod());

        // Copy incoming headers
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            // Don't forward gateway-specific or hop-by-hop headers
            if ("host".equalsIgnoreCase(name) || "connection".equalsIgnoreCase(name)) {
                continue;
            }
            Enumeration<String> values = request.getHeaders(name);
            while (values.hasMoreElements()) {
                conn.addRequestProperty(name, values.nextElement());
            }
        }

        // Inject Trust Headers
        for (Map.Entry<String, String> entry : trustHeaders.entrySet()) {
            conn.setRequestProperty(entry.getKey(), entry.getValue());
        }

        // Configure connection for output if needed
        boolean hasRequestBody = "POST".equalsIgnoreCase(request.getMethod()) ||
                "PUT".equalsIgnoreCase(request.getMethod()) ||
                ("DELETE".equalsIgnoreCase(request.getMethod()) && (request.getContentLengthLong() > 0 || request.getHeader("Transfer-Encoding") != null));

        conn.setDoInput(true);
        if (hasRequestBody) {
            conn.setDoOutput(true);
            // Don't buffer content of files/chunks in memory
            conn.setChunkedStreamingMode(8192);

            try (InputStream in = request.getInputStream();
                 OutputStream out = conn.getOutputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                out.flush();
            }
        }

        // Get Response status & stream
        int responseCode = conn.getResponseCode();
        response.setStatus(responseCode);

        // Copy response headers
        Map<String, List<String>> headerFields = conn.getHeaderFields();
        for (Map.Entry<String, List<String>> entry : headerFields.entrySet()) {
            String key = entry.getKey();
            if (key == null) continue; // Skip HTTP Status line

            // Skip CORS headers from target since gateway already sets them
            if (key.toLowerCase().startsWith("access-control-")) {
                continue;
            }

            for (String value : entry.getValue()) {
                response.addHeader(key, value);
            }
        }

        // Stream response body back
        InputStream errorStream = conn.getErrorStream();
        try (InputStream responseStream = (errorStream != null) ? errorStream : conn.getInputStream();
             OutputStream out = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = responseStream.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            out.flush();
        } finally {
            conn.disconnect();
        }
    }

    private void sendJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
        response.getWriter().flush();
    }

    @Override
    public void destroy() {}
}
