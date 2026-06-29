package com.sspipe.erp.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true) private String code;
    @Column(nullable = false) private String name;
    private String category;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id", nullable = false)
    private Department department;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "pipe_size_id", nullable = false)
    private PipeSize pipeSize;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(name = "length_mm", nullable = false) private BigDecimal lengthMm;
    @Column(name = "width_mm",  nullable = false) private BigDecimal widthMm;
    @Column(name = "height_mm", nullable = false) private BigDecimal heightMm;

    // Calculated by ProductCalculationEngine before persist/update.
    @Column(name = "total_meter")        private BigDecimal totalMeter;
    @Column(name = "total_feet")         private BigDecimal totalFeet;
    @Column(name = "pipes_required_4m")  private BigDecimal pipesRequired4m;
    @Column(name = "pipes_required_6m")  private BigDecimal pipesRequired6m;

    @Enumerated(EnumType.STRING) private EntityStatus status = EntityStatus.ACTIVE;
    private OffsetDateTime createdAt; private OffsetDateTime updatedAt;
    // getters/setters omitted for brevity
}
