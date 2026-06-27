-- Initialize default system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES ('storage_path', '/app/storage') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('storage_type', 'LOCAL') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('ftp_host', 'ftp.filesphere.com') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('ftp_port', '21') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('ftp_user', 'ftpuser') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('ftp_password', 'ftppassword') ON CONFLICT (setting_key) DO NOTHING;

-- Seed default Root Tenant (starting at 1000)
INSERT INTO tenants (id, name, tenant_key) VALUES ('04ac0ad3-4465-48bc-bc28-483ef2bf5443', 'Root Tenant', 1000) ON CONFLICT (id) DO NOTHING;

-- Seed default Root SUPER_ADMIN User
INSERT INTO users (id, email, first_name, last_name, mobile_no, role, password, tenant_id) VALUES ('ddfbb347-3bc7-401e-ad8c-512b7eea16a1', 'root', 'Root', 'User', '9999999999', 'SUPER_ADMIN', '$2a$10$NVxJUE4AKe/QYb.5cyT2n.EGQIRHxMVt.ml2jGjYerPEQI6i0UNd.', '04ac0ad3-4465-48bc-bc28-483ef2bf5443') ON CONFLICT (id) DO NOTHING;
