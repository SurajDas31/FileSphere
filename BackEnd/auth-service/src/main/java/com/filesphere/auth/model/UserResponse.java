package com.filesphere.auth.model;

import java.util.UUID;

public record UserResponse(UUID id, String firstName, String lastName, String email, String mobileNo, String role, String tenantId, String profilePicPath) {
}
