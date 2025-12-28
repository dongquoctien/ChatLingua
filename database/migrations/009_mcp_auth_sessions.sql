-- MCP OAuth2-like Device Authorization Flow
-- Allows MCP to authenticate via browser login

CREATE TABLE IF NOT EXISTS mcp_auth_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_code VARCHAR(64) NOT NULL UNIQUE,
  user_id INT DEFAULT NULL,
  status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_code (session_code),
  INDEX idx_status_expires (status, expires_at)
);

-- Clean up expired sessions periodically (optional: use event scheduler)
-- DELETE FROM mcp_auth_sessions WHERE expires_at < NOW() AND status = 'pending';
