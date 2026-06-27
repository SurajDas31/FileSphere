package com.filesphere.auth.security;

import com.filesphere.auth.model.User;
import com.filesphere.auth.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.filesphere.auth.repository.TenantRepository tenantRepository;

    @Value("${app.frontend.redirect-url}")
    private String frontendRedirectUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        
        if (email == null) {
            // Fallback for GitHub if email is private, use login/username
            String login = oAuth2User.getAttribute("login");
            email = login + "@github.com";
        }

        String name = oAuth2User.getAttribute("name");
        String firstName = "";
        String lastName = "";

        if (name != null) {
            String[] parts = name.split(" ", 2);
            firstName = parts[0];
            if (parts.length > 1) {
                lastName = parts[1];
            }
        } else {
            firstName = oAuth2User.getAttribute("given_name");
            lastName = oAuth2User.getAttribute("family_name");
            if (firstName == null) firstName = oAuth2User.getAttribute("first_name");
            if (lastName == null) lastName = oAuth2User.getAttribute("last_name");
        }

        if (firstName == null) firstName = "OAuth";
        if (lastName == null) lastName = "User";

        // Save or update user
        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            // Auto create tenant
            com.filesphere.auth.model.Tenant newTenant = new com.filesphere.auth.model.Tenant();
            String tenantName = "OAuth Tenant";
            if (email.contains("@")) {
                String domain = email.substring(email.indexOf("@") + 1);
                if (!domain.isEmpty() && !domain.contains("gmail") && !domain.contains("yahoo") && !domain.contains("outlook")) {
                    tenantName = domain + " Tenant";
                }
            }
            newTenant.setName(tenantName);
            newTenant = tenantRepository.save(newTenant);

            user = new User();
            user.setEmail(email);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setRole("USER");
            user.setMobileNo("");
            user.setTenant(newTenant);
            userRepository.save(user);
        }

        // Generate JWT
        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getFirstName(), user.getLastName(), user.getTenantId());

        // Redirect to React Frontend callback page
        String targetUrl = UriComponentsBuilder.fromUriString(frontendRedirectUrl)
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
