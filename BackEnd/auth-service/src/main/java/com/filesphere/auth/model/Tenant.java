package com.filesphere.auth.model;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "tenants")
public class Tenant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_key", nullable = false, unique = true)
    private Long tenantKey;

    @Column(nullable = false)
    private String name;

    @Column(name = "max_file_size_bytes")
    private Long maxFileSizeBytes = 52428800L; // Default 50MB

    public Tenant() {}

    public Tenant(UUID id, String name, Long tenantKey) {
        this.id = id;
        this.name = name;
        this.tenantKey = tenantKey;
    }

    public Tenant(UUID id, String name, Long tenantKey, Long maxFileSizeBytes) {
        this.id = id;
        this.name = name;
        this.tenantKey = tenantKey;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getTenantKey() {
        return tenantKey;
    }

    public void setTenantKey(Long tenantKey) {
        this.tenantKey = tenantKey;
    }

    public Long getMaxFileSizeBytes() {
        return maxFileSizeBytes;
    }

    public void setMaxFileSizeBytes(Long maxFileSizeBytes) {
        this.maxFileSizeBytes = maxFileSizeBytes;
    }
}
