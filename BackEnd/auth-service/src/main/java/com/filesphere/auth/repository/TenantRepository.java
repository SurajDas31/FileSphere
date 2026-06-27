package com.filesphere.auth.repository;

import com.filesphere.auth.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findByTenantKey(Long tenantKey);
}
