package com.filesphere.gateway.repository;

import org.springframework.data.repository.CrudRepository;
import com.filesphere.gateway.model.InvalidatedToken;
import org.springframework.stereotype.Repository;

@Repository
public interface InvalidatedTokenRepository extends CrudRepository<InvalidatedToken, String> {
}
