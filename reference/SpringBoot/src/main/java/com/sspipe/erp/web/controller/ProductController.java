package com.sspipe.erp.web.controller;

import com.sspipe.erp.web.dto.ProductRequest;
import com.sspipe.erp.web.dto.ProductResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/masters/products")
public class ProductController {

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLANT_ADMIN','PRODUCTION_MANAGER','VIEWER')")
    public Page<ProductResponse> list(Pageable pageable, @RequestParam(required = false) String q) {
        return null;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLANT_ADMIN','PRODUCTION_MANAGER')")
    public ProductResponse create(@Valid @RequestBody ProductRequest body) { return null; }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLANT_ADMIN','PRODUCTION_MANAGER')")
    public ProductResponse update(@PathVariable UUID id, @Valid @RequestBody ProductRequest body) { return null; }
}
