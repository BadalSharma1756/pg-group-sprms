package com.sspipe.erp.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final SecretKey key = Keys.hmacShaKeyFor("change-me-32-bytes-min-secret-key!!".getBytes());
    private static final Duration ACCESS_TTL  = Duration.ofMinutes(15);
    private static final Duration REFRESH_TTL = Duration.ofDays(7);

    public String issueAccess(UUID userId, java.util.Set<String> roles) {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("roles", roles)
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(Instant.now().plus(ACCESS_TTL)))
            .signWith(key)
            .compact();
    }
    public String issueRefresh(UUID userId) {
        return Jwts.builder().subject(userId.toString())
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(Instant.now().plus(REFRESH_TTL)))
            .signWith(key).compact();
    }
}
