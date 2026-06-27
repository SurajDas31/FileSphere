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

    public Tenant() {}

    public Tenant(UUID id, String name, Long tenantKey) {
        this.id = id;
        this.name = name;
        this.tenantKey = tenantKey;
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
}
