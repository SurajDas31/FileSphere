package com.filesphere.auth.initializer;

import com.filesphere.auth.model.User;
import com.filesphere.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class RootUserInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.filesphere.auth.repository.TenantRepository tenantRepository;

    @Autowired
    private com.filesphere.auth.repository.SystemSettingRepository systemSettingRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("RootUserInitializer: Database seeding handled by import.sql");
    }
}
