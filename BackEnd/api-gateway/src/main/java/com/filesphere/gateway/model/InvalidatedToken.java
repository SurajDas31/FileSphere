package com.filesphere.gateway.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Date;

@Entity
@Table(name = "invalidated_tokens")
public class InvalidatedToken {
    @Id
    @Column(columnDefinition = "TEXT")
    private String token;

    @Column(name = "expiry_date", nullable = false)
    private Date expiryDate;

    public InvalidatedToken() {
    }

    public InvalidatedToken(String token, Date expiryDate) {
        this.token = token;
        this.expiryDate = expiryDate;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Date getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(Date expiryDate) {
        this.expiryDate = expiryDate;
    }
}
