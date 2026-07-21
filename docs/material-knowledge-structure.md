# Material Knowledge JSON Structure

## Objective

Define a standardized JSON structure for all material knowledge files. Each material has its own file with regional planning costs, confidence scores, and metadata.

## File Structure

```
internal/knowledge/materials/
├── cedar.json
├── pressure-treated.json
├── trex-enhance.json
├── trex-select.json
├── trex-transcend.json
├── timbertech.json
├── simpson-strongtie.json
├── galvanized-fasteners.json
├── stainless-fasteners.json
├── quikrete.json
├── gravel.json
├── oil-stain.json
├── water-stain.json
├── cabinets-stock.json
├── cabinets-semi-custom.json
├── cabinets-custom.json
├── quartz-level1.json
├── quartz-level2.json
├── quartz-premium.json
├── tile-ceramic.json
├── tile-porcelain.json
└── vinyl-flooring.json
```

## JSON Schema

```typescript
interface MaterialKnowledge {
  // Material identification
  material: string;           // e.g., "cedar", "trex-enhance"
  type: string;              // e.g., "lumber", "composite", "fastener"
  category: string;          // e.g., "fencing", "decking", "hardware"
  
  // Unit of measurement
  unit: string;              // e.g., "linear_foot", "square_foot", "each"
  
  // Regional planning costs
  regionalCosts: {
    [region: string]: {
      planningCost: number;   // Planning cost per unit
      confidence: number;     // 0-1 confidence score
      effectiveDate: string;  // ISO date string
      supplier: string;       // Supplier name
      notes: string;         // Additional notes
    }
  };
  
  // Applicable services
  applicableServices: string[];  // e.g., ["fences", "decks", "pergolas"]
  
  // Assumptions
  assumptions: string[];     // List of assumptions for pricing
  
  // Metadata
  lastVerified: string;      // ISO date string
  verificationInterval: number; // Days between verifications
  source: string;           // e.g., "supplier_quote", "market_research"
  
  // Optional: Variants
  variants?: {
    [variant: string]: {
      planningCost: number;
      description: string;
    }
  };
  
  // Optional: Bulk pricing
  bulkPricing?: {
    threshold: number;       // Minimum quantity
    discount: number;        // Percentage discount
  };
}
```

## Example: cedar.json

```json
{
  "material": "cedar",
  "type": "lumber",
  "category": "fencing",
  "unit": "linear_foot",
  "regionalCosts": {
    "albany": {
      "planningCost": 3.50,
      "confidence": 0.85,
      "effectiveDate": "2024-01-15",
      "supplier": "Local lumber yard",
      "notes": "6-foot cedar boards, standard grade"
    },
    "corvallis": {
      "planningCost": 3.75,
      "confidence": 0.85,
      "effectiveDate": "2024-01-15",
      "supplier": "Local lumber yard",
      "notes": "6-foot cedar boards, standard grade"
    },
    "lebanon": {
      "planningCost": 3.45,
      "confidence": 0.85,
      "effectiveDate": "2024-01-15",
      "supplier": "Local lumber yard",
      "notes": "6-foot cedar boards, standard grade"
    },
    "salem": {
      "planningCost": 3.80,
      "confidence": 0.85,
      "effectiveDate": "2024-01-15",
      "supplier": "Regional lumber supplier",
      "notes": "6-foot cedar boards, standard grade"
    }
  },
  "applicableServices": ["fences", "decks", "pergolas"],
  "assumptions": [
    "Standard grade cedar",
    "6-foot boards",
    "No special treatment",
    "Bulk pricing applies for 100+ linear feet"
  ],
  "lastVerified": "2024-01-15",
  "verificationInterval": 90,
  "source": "supplier_quote",
  "variants": {
    "premium": {
      "planningCost": 4.50,
      "description": "Clear grade cedar, fewer knots"
    },
    "economy": {
      "planningCost": 2.75,
      "description": "Construction grade, more knots"
    }
  },
  "bulkPricing": {
    "threshold": 100,
    "discount": 0.05
  }
}
```

## Example: trex-enhance.json

```json
{
  "material": "trex-enhance",
  "type": "composite",
  "category": "decking",
  "unit": "square_foot",
  "regionalCosts": {
    "albany": {
      "planningCost": 12.50,
      "confidence": 0.90,
      "effectiveDate": "2024-01-15",
      "supplier": "Home Depot",
      "notes": "Trex Enhance Basics, standard color"
    },
    "corvallis": {
      "planningCost": 12.75,
      "confidence": 0.90,
      "effectiveDate": "2024-01-15",
      "supplier": "Home Depot",
      "notes": "Trex Enhance Basics, standard color"
    },
    "salem": {
      "planningCost": 13.00,
      "confidence": 0.90,
      "effectiveDate": "2024-01-15",
      "supplier": "Home Depot",
      "notes": "Trex Enhance Basics, standard color"
    }
  },
  "applicableServices": ["decks"],
  "assumptions": [
    "Trex Enhance Basics line",
    "Standard color (not premium)",
    "Includes hidden fasteners",
    "Includes fascia"
  ],
  "lastVerified": "2024-01-15",
  "verificationInterval": 60,
  "source": "retail_pricing",
  "variants": {
    "premium": {
      "planningCost": 18.50,
      "description": "Trex Transcend, premium color"
    }
  },
  "bulkPricing": {
    "threshold": 200,
    "discount": 0.03
  }
}
```

## Example: simpson-strongtie.json

```json
{
  "material": "simpson-strongtie",
  "type": "hardware",
  "category": "structural",
  "unit": "each",
  "regionalCosts": {
    "albany": {
      "planningCost": 2.50,
      "confidence": 0.95,
      "effectiveDate": "2024-01-15",
      "supplier": "Local lumber yard",
      "notes": "Standard post bracket, galvanized"
    },
    "corvallis": {
      "planningCost": 2.50,
      "confidence": 0.95,
      "effectiveDate": "2024-01-15",
      "supplier": "Local lumber yard",
      "notes": "Standard post bracket, galvanized"
    },
    "salem": {
      "planningCost": 2.50,
      "confidence": 0.95,
      "effectiveDate": "2024-01-15",
      "supplier": "Regional lumber supplier",
      "notes": "Standard post bracket, galvanized"
    }
  },
  "applicableServices": ["decks", "fences", "pergolas"],
  "assumptions": [
    "Standard post bracket",
    "Galvanized steel",
    "Includes screws",
    "One bracket per post"
  ],
  "lastVerified": "2024-01-15",
  "verificationInterval": 120,
  "source": "supplier_catalog",
  "variants": {
    "stainless": {
      "planningCost": 5.50,
      "description": "Stainless steel bracket for coastal areas"
    },
    "heavy-duty": {
      "planningCost": 4.00,
      "description": "Heavy-duty bracket for larger loads"
    }
  }
}
```

## Example: quartz-level1.json

```json
{
  "material": "quartz-level1",
  "type": "countertop",
  "category": "kitchen",
  "unit": "square_foot",
  "regionalCosts": {
    "albany": {
      "planningCost": 45.00,
      "confidence": 0.80,
      "effectiveDate": "2024-01-15",
      "supplier": "Local fabricator",
      "notes": "Entry-level quartz, standard edge"
    },
    "corvallis": {
      "planningCost": 48.00,
      "confidence": 0.80,
      "effectiveDate": "2024-01-15",
      "supplier": "Local fabricator",
      "notes": "Entry-level quartz, standard edge"
    },
    "salem": {
      "planningCost": 50.00,
      "confidence": 0.80,
      "effectiveDate": "2024-01-15",
      "supplier": "Regional fabricator",
      "notes": "Entry-level quartz, standard edge"
    }
  },
  "applicableServices": ["kitchen-remodel", "bath-remodel"],
  "assumptions": [
    "Entry-level quartz",
    "Standard edge profile",
    "Includes fabrication",
    "Includes installation",
    "Does not include sink"
  ],
  "lastVerified": "2024-01-15",
  "verificationInterval": 90,
  "source": "fabricator_quote",
  "variants": {
    "level2": {
      "planningCost": 65.00,
      "description": "Mid-range quartz, more patterns"
    },
    "premium": {
      "planningCost": 85.00,
      "description": "Premium quartz, designer patterns"
    }
  }
}
```

## Material Files List

### Lumber
- `cedar.json` - Cedar lumber for fencing, decking, pergolas
- `pressure-treated.json` - Pressure-treated lumber for structural applications

### Composite Decking
- `trex-enhance.json` - Trex Enhance Basics line
- `trex-select.json` - Trex Select line
- `trex-transcend.json` - Trex Transcend premium line
- `timbertech.json` - TimberTech composite decking

### Hardware
- `simpson-strongtie.json` - Simpson Strong-Tie structural hardware
- `galvanized-fasteners.json` - Galvanized screws and nails
- `stainless-fasteners.json` - Stainless steel fasteners for coastal areas

### Concrete & Gravel
- `quikrete.json` - Quikrete concrete products
- `gravel.json` - Gravel for footings and drainage

### Finishes
- `oil-stain.json` - Oil-based stains for cedar
- `water-stain.json` - Water-based stains for cedar
- `paint.json` - Exterior paint for trim and siding

### Cabinetry
- `cabinets-stock.json` - Stock cabinets (off-the-shelf)
- `cabinets-semi-custom.json` - Semi-custom cabinets
- `cabinets-custom.json` - Custom-built cabinets

### Countertops
- `quartz-level1.json` - Entry-level quartz
- `quartz-level2.json` - Mid-range quartz
- `quartz-premium.json` - Premium quartz
- `granite.json` - Granite countertops

### Flooring
- `tile-ceramic.json` - Ceramic tile
- `tile-porcelain.json` - Porcelain tile
- `vinyl-flooring.json` - Luxury vinyl plank
- `hardwood.json` - Hardwood flooring

### Fixtures
- `fixtures-standard.json` - Standard plumbing fixtures
- `fixtures-premium.json` - Premium plumbing fixtures
- `fixtures-luxury.json` - Luxury plumbing fixtures

## Knowledge Refresh Queue

### Purpose

Track which material knowledge files need to be refreshed and when.

### Structure

```typescript
interface KnowledgeRefreshQueue {
  materialId: string;
  lastVerified: string;
  nextRefresh: string;
  priority: "high" | "medium" | "low";
  assignedTo: string;  // Who is responsible for verification
  notes: string;
}
```

### Example

```json
{
  "materialId": "cedar",
  "lastVerified": "2024-01-15",
  "nextRefresh": "2024-04-15",
  "priority": "medium",
  "assignedTo": "Taylor",
  "notes": "Check with local lumber yard for price changes"
}
```

## Verification Process

### Manual Verification

1. Contact supplier for current pricing
2. Update regional costs
3. Update effective date
4. Update confidence score
5. Add notes about any changes
6. Commit to repository

### Automated Verification (Future)

1. Integrate with supplier APIs
2. Automatically fetch pricing
3. Compare to current knowledge
4. Flag significant changes (>10%)
5. Create pull request for review
6. Manual approval before merge

## Confidence Scoring

### 0.95 - Very High Confidence
- Direct supplier quote
- Recent verification (<30 days)
- Stable pricing history
- Single source

### 0.85 - High Confidence
- Supplier quote
- Recent verification (<60 days)
- Stable pricing history
- Multiple sources agree

### 0.75 - Medium Confidence
- Market research
- Verification within 90 days
- Some price variation
- Multiple sources

### 0.65 - Low-Medium Confidence
- Market research
- Verification 90-120 days ago
- Moderate price variation
- Limited sources

### 0.50 - Low Confidence
- Historical data
- Verification >120 days ago
- High price variation
- Single source

### <0.50 - Very Low Confidence
- Outdated data
- No recent verification
- Unknown pricing
- Should not be used

## Error Handling

### Missing Regional Cost
- Use closest region
- Log warning
- Flag for verification

### Outdated Knowledge
- Flag in refresh queue
- Use with caution
- Add disclaimer in output

### Low Confidence
- Widen planning range
- Add disclaimer in output
- Flag for verification

### Missing Material
- Use proxy material
- Log error
- Flag for creation

## Implementation Plan

### Phase 1: Core Materials (Week 1)
- [ ] Create cedar.json
- [ ] Create pressure-treated.json
- [ ] Create simpson-strongtie.json
- [ ] Create galvanized-fasteners.json
- [ ] Create quikrete.json
- [ ] Create gravel.json

### Phase 2: Decking Materials (Week 1-2)
- [ ] Create trex-enhance.json
- [ ] Create trex-select.json
- [ ] Create trex-transcend.json
- [ ] Create timbertech.json

### Phase 3: Finishes (Week 2)
- [ ] Create oil-stain.json
- [ ] Create water-stain.json
- [ ] Create paint.json

### Phase 4: Interior Materials (Week 2-3)
- [ ] Create cabinets-stock.json
- [ ] Create cabinets-semi-custom.json
- [ ] Create cabinets-custom.json
- [ ] Create quartz-level1.json
- [ ] Create quartz-level2.json
- [ ] Create quartz-premium.json

### Phase 5: Flooring & Fixtures (Week 3)
- [ ] Create tile-ceramic.json
- [ ] Create tile-porcelain.json
- [ ] Create vinyl-flooring.json
- [ ] Create fixtures-standard.json
- [ ] Create fixtures-premium.json

### Phase 6: Refresh Queue (Week 3-4)
- [ ] Implement refresh queue system
- [ ] Set up verification schedule
- [ ] Assign responsibility for each material
- [ ] Create verification process documentation

## Monitoring

- **Knowledge Freshness**: Track age of each material's last verification
- **Confidence Distribution**: Track confidence score distribution
- **Refresh Compliance**: Track adherence to refresh queue schedule
- **Price Volatility**: Track price changes over time
- **Source Reliability**: Track reliability of different sources
