package com.sspipe.erp.service;

import com.sspipe.erp.domain.InventoryTransaction;
import com.sspipe.erp.domain.TxnType;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

/** Single entry point for stock changes. Append-only; current stock is derived. */
@Service
public class InventoryLedger {
    public InventoryTransaction post(UUID materialId, UUID plantId, TxnType type,
                                     BigDecimal qtyIn, BigDecimal qtyOut,
                                     String refTable, UUID refId, String remarks) {
        // 1. validate non-negative qty
        // 2. persist InventoryTransaction row
        // 3. NEVER update a cached "current_stock" column — read it from v_current_stock
        return null; // reference only
    }
}
