package com.sspipe.erp.service;

import com.sspipe.erp.domain.GapVerification;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

/**
 * Parity with trg_gap_compute.
 *   expected_consumption = SUM(production.total_meter_consumed) up to verify_date
 *   system_stock         = SUM(qty_in) - SUM(qty_out)
 *   allowed_wastage      = expected_consumption * material.allowed_wastage_pct / 100
 *   difference           = physical_stock - system_stock
 *   actual_gap           = difference + allowed_wastage   (negative => shortage)
 */
@Service
public class GapVerificationEngine {
    public void compute(GapVerification g) { /* reference only */ }
}
