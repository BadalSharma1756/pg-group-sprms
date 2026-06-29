package com.sspipe.erp.service;

import com.sspipe.erp.domain.Product;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Mirrors the trg_products_autocalc database trigger.
 * Total meter = 2*(L+W) + 4*H (per unit), then derived feet & pipe counts.
 */
@Component
public class ProductCalculationEngine {
    private static final BigDecimal MM_TO_M  = new BigDecimal("0.001");
    private static final BigDecimal M_TO_FT  = new BigDecimal("3.28084");
    private static final BigDecimal FOUR     = new BigDecimal("4");
    private static final BigDecimal SIX      = new BigDecimal("6");

    public void recalc(Product p) {
        BigDecimal L = p.getLengthMm().multiply(MM_TO_M);
        BigDecimal W = p.getWidthMm().multiply(MM_TO_M);
        BigDecimal H = p.getHeightMm().multiply(MM_TO_M);
        BigDecimal totalM = L.add(W).multiply(new BigDecimal("2")).add(H.multiply(FOUR));
        p.setTotalMeter(scale(totalM));
        p.setTotalFeet(scale(totalM.multiply(M_TO_FT)));
        p.setPipesRequired4m(scale(totalM.divide(FOUR, 6, RoundingMode.HALF_UP)));
        p.setPipesRequired6m(scale(totalM.divide(SIX, 6, RoundingMode.HALF_UP)));
    }
    private static BigDecimal scale(BigDecimal v) { return v.setScale(6, RoundingMode.HALF_UP); }
}
