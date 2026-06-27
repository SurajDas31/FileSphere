package com.filesphere.auth.model;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "user_settings")
public class UserSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    // Preference setting columns
    @Column(name = "theme", nullable = false)
    private String theme = "light"; // default

    @Column(name = "glassmorphism", nullable = false)
    private boolean glassmorphism = true; // default

    @Column(name = "accent_color", nullable = false)
    private String accentColor = "blue"; // default

    @Column(name = "sidebar_density", nullable = false)
    private String sidebarDensity = "Default"; // Compact, Default, Relaxed

    @Column(name = "auto_hide_sidebar", nullable = false)
    private boolean autoHideSidebar = false;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public boolean isGlassmorphism() {
        return glassmorphism;
    }

    public void setGlassmorphism(boolean glassmorphism) {
        this.glassmorphism = glassmorphism;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public void setAccentColor(String accentColor) {
        this.accentColor = accentColor;
    }

    public String getSidebarDensity() {
        return sidebarDensity;
    }

    public void setSidebarDensity(String sidebarDensity) {
        this.sidebarDensity = sidebarDensity;
    }

    public boolean isAutoHideSidebar() {
        return autoHideSidebar;
    }

    public void setAutoHideSidebar(boolean autoHideSidebar) {
        this.autoHideSidebar = autoHideSidebar;
    }
}
