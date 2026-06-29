package com.sspipe.erp.web.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequest(
    @NotBlank String code,
    @NotBlank String name,
    String category,
    @NotNull UUID plantId,
    @NotNull UUID departmentId,
    @NotNull UUID pipeSizeId,
    @NotNull UUID materialId,
    @NotNull @Positive BigDecimal lengthMm,
    @NotNull @Positive BigDecimal widthMm,
    @NotNull @Positive BigDecimal heightMm
) {}
