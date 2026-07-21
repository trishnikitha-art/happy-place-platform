# Pricing Engine Architecture (Knowledge-Based)

## Objective

Build a planning estimate engine that calculates knowledge, not prices. Taylor is still the estimator. This is a planning tool for homeowners, not an official quote.

## Philosophy

**Rule #1: Never calculate a price directly. Calculate knowledge.**

```
Customer Input
    ↓
Knowledge Authorities
    ↓
Planning Range Authority
    ↓
Confidence Score
    ↓
Human-Readable Explanation
    ↓
Taylor's Official Estimate
```

The estimate is a planning tool. Taylor is still the estimator. That distinction matters legally and builds trust.

## Architecture

### Planning Formula

```
Labor
+
Materials
+
Concrete
+
Hardware
+
Removal
+
Disposal
+
Travel
+
Weather
+
Permit
+
Planning Reserve
=
Planning Range
```

No hidden magic. Everything explainable.

### Confidence Scoring

Confidence ranges from 0.95 (high) to 0.32 (low). Lower confidence widens the planning range, not the price.

```
Confidence 0.95 → Range ±10%
Confidence 0.75 → Range ±20%
Confidence 0.61 → Range ±30%
Confidence 0.32 → Range ±50%
```

Uncertainty expands range, not price.

## Service Authorities

### Fence Authority

**Dimensions**
- Linear feet
- Height
- Corners
- Gates (single, double)
- Existing removal
- Concrete replacement
- Rock digging
- Slope
- Access
- HOA requirements

**Fence Style**
- Privacy
- Board-on-board
- Horizontal
- Ranch
- Picket
- Hog panel
- Decorative

**Material**
- Cedar
- Pressure-treated
- Vinyl
- Composite
- Metal

**Finish**
- Raw
- Oil stain
- Water stain
- Paint

**Labor Complexity**
- Easy (flat ground, good access)
- Medium (slight slope, moderate access)
- Hard (steep slope, poor access)
- Extreme (difficult terrain, limited access)

### Deck Authority

**Dimensions**
- Width
- Depth
- Stories
- Height

**Features**
- Railings
- Stairs
- Picture frame border
- Hidden fasteners

**Material**
- Composite
- Pressure-treated
- Cedar
- Trex Enhance
- Trex Select
- Trex Transcend
- TimberTech

**Covered**
- Pergola
- Electrical
- Lighting
- Skirting

**Footings**
- Concrete footings
- Sonotubes
- Helical piers

**Demolition**
- Existing ledger removal
- Old deck removal

**Site Conditions**
- Slope
- Access
- Permit requirements
- Inspection requirements

### Bathroom Authority

**Tub/Shower**
- Tub removal
- Walk-in shower
- Tile surround
- Acrylic surround
- Glass door
- Custom niche
- Bench

**Vanity**
- Single vanity
- Double vanity
- Medicine cabinet
- Custom cabinetry

**Flooring**
- Tile
- Vinyl
- Laminate
- Subfloor repair
- Dry rot repair

**Fixtures**
- Premium fixtures
- Luxury fixtures
- Standard fixtures

**Plumbing**
- Relocation
- New rough-in
- Existing reuse

**Electrical**
- Lighting
- Ventilation fan
- GFCI outlets
- Relocation

**Waterproofing**
- Schluter system
- RedGard
- Custom waterproofing

**Permit**
- Building permit
- Plumbing permit
- Electrical permit

### Kitchen Authority

**Cabinetry**
- Cabinet count
- Island
- Peninsula
- Stock cabinets
- Semi-custom cabinets
- Custom cabinets

**Countertop**
- Quartz (level 1, 2, premium)
- Granite
- Laminate
- Butcher block

**Appliances**
- Appliance relocation
- New appliances
- Gas line
- Electrical upgrade

**Lighting**
- Under-cabinet lighting
- Recessed lighting
- Pendant lighting
- Electrical relocation

**Plumbing**
- Sink relocation
- New rough-in
- Existing reuse
- Gas line

**Backsplash**
- Tile
- Stone
- Glass

**Pantry**
- Walk-in pantry
- Butler's pantry
- Custom shelving

**Demolition**
- Full gut
- Partial demolition
- Cabinet removal only

**Finish Work**
- Drywall
- Painting
- Trim
- Flooring

**Permit**
- Building permit
- Electrical permit
- Plumbing permit

### Repair Authority

**Repairs are uncertainty. Unknown damage should widen confidence.**

**Repair Types**
- Dry rot repair
- Water damage
- Structural repair
- Trim repair
- Door replacement
- Window repair
- Flooring repair
- Exterior trim

**Uncertainty Factors**
- Hidden damage (behind walls, under flooring)
- Extent of damage
- Material availability
- Structural implications
- Permit requirements

**Confidence Impact**
- Minor repair (visible, contained): Confidence 0.75-0.95
- Major repair (hidden damage possible): Confidence 0.50-0.75
- Structural repair (unknown extent): Confidence 0.32-0.50

## Material Knowledge

Each material has its own JSON file with regional planning costs.

### Example: cedar.json

```json
{
  "material": "cedar",
  "type": "lumber",
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
  "verificationInterval": "90 days"
}
```

### Material Files

- `cedar.json`
- `pressure-treated.json`
- `trex-enhance.json`
- `trex-select.json`
- `trex-transcend.json`
- `timbertech.json`
- `simpson-strongtie.json`
- `galvanized-fasteners.json`
- `stainless-fasteners.json`
- `quikrete.json`
- `gravel.json`
- `oil-stain.json`
- `water-stain.json`
- `cabinets-stock.json`
- `cabinets-semi-custom.json`
- `cabinets-custom.json`
- `quartz-level1.json`
- `quartz-level2.json`
- `quartz-premium.json`
- `tile-ceramic.json`
- `tile-porcelain.json`
- `vinyl-flooring.json`

## Oregon Regional Authority

Instead of one multiplier, create regional profiles.

### Regional Profiles

**Albany**
- Travel: Base rate
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 5-15 miles

**Corvallis**
- Travel: +10% (university traffic)
- Permit tendencies: Stricter
- Inspection timelines: 5-7 business days
- Demand: High
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 5-15 miles

**Lebanon**
- Travel: Base rate
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Sweet Home**
- Travel: +15% (distance)
- Permit tendencies: Relaxed
- Inspection timelines: 5-7 business days
- Demand: Low
- Weather: Higher rainfall
- Fuel: +5%
- Supplier distance: 20-30 miles

**Salem**
- Travel: +20% (city traffic)
- Permit tendencies: Stricter
- Inspection timelines: 7-10 business days
- Demand: High
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Keizer**
- Travel: +20% (city traffic)
- Permit tendencies: Stricter
- Inspection timelines: 7-10 business days
- Demand: High
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Dallas**
- Travel: Base rate
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Monmouth**
- Travel: Base rate
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Philomath**
- Travel: +10%
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Higher rainfall
- Fuel: Regional average
- Supplier distance: 15-25 miles

**Eugene**
- Travel: +25% (city traffic)
- Permit tendencies: Stricter
- Inspection timelines: 7-10 business days
- Demand: High
- Weather: Higher rainfall
- Fuel: +5%
- Supplier distance: 15-25 miles

**Junction City**
- Travel: +15%
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 15-25 miles

**Brownsville**
- Travel: +20% (distance)
- Permit tendencies: Relaxed
- Inspection timelines: 5-7 business days
- Demand: Low
- Weather: Average rainfall
- Fuel: +5%
- Supplier distance: 20-30 miles

**Halsey**
- Travel: +10%
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Jefferson**
- Travel: +10%
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

**Turner**
- Travel: +10%
- Permit tendencies: Standard
- Inspection timelines: 3-5 business days
- Demand: Medium
- Weather: Average rainfall
- Fuel: Regional average
- Supplier distance: 10-20 miles

## Seasonal Authority

Seasonal factors don't change prices directly. They widen planning confidence.

**Spring**
- Demand: ↑ (homeowner projects start)
- Rain: ↑ (Oregon spring)
- Scheduling: ↑ (contractor availability)
- Confidence impact: -5% (weather uncertainty)

**Summer**
- Demand: ↑↑ (peak season)
- Weather: ↓ (best weather)
- Scheduling: ↓ (contractor busy)
- Confidence impact: 0% (best conditions)

**Fall**
- Demand: Balanced
- Weather: Average
- Scheduling: Balanced
- Confidence impact: 0% (predictable)

**Winter**
- Rain: ↑↑ (Oregon winter)
- Concrete: Delays (curing issues)
- Short daylight: Slower progress
- Confidence impact: -15% (weather uncertainty)

## Planning Range Output

Instead of "Estimated Price", show:

```
Here's what we understood
• Cedar privacy fence
• 185 linear feet
• One walk gate
• One double gate
• Existing fence removal
• Semi-transparent oil stain
• Albany, Oregon

Preliminary Planning Range
Based on similar Mid-Willamette Valley projects, work like this commonly falls between
$11,800–$15,900

This planning range includes regional labor, materials, typical installation requirements, disposal, and a conservative planning reserve. It is intended to help with budgeting and is not an official quote. Taylor will visit the property, verify measurements and site conditions, and prepare a written estimate specific to your home.
```

**Bias the planning range conservatively high (roughly 10-15%)** so customers are more likely to be pleasantly surprised by the formal estimate rather than disappointed.

## Implementation Plan

### Phase 1: Knowledge Base (Week 1-2)
- [ ] Create material JSON files
- [ ] Create regional profiles
- [ ] Create seasonal factors
- [ ] Define service authorities
- [ ] Set up knowledge refresh queue

### Phase 2: Planning Engine (Week 2-3)
- [ ] Implement Planning Range Authority
- [ ] Implement confidence scoring
- [ ] Implement range calculation
- [ ] Implement human-readable output
- [ ] Add bias for conservative estimates

### Phase 3: Frontend Integration (Week 3-4)
- [ ] Update estimate wizard with detailed questions
- [ ] Integrate planning engine
- [ ] Display planning range output
- [ ] Add confidence indicator
- [ ] Add disclaimer language

### Phase 4: Testing & Refinement (Week 4-5)
- [ ] Test with real estimates
- [ ] Compare planning ranges to actual quotes
- [ ] Refine confidence scoring
- [ ] Refine regional factors
- [ ] Refine material costs

### Phase 5: Learning Loop (Week 5-6)
- [ ] Track planning vs. actual
- [ ] Store in Estimate Analytics
- [ ] Analyze accuracy over time
- [ ] Refine knowledge base
- [ ] Improve confidence scoring

## Technology Stack

- **Knowledge Base**: JSON files in `internal/knowledge/`
- **Planning Engine**: TypeScript in `internal/estimate/planning-authority.ts`
- **Confidence Scoring**: Algorithmic based on uncertainty factors
- **Regional Authority**: Regional profiles in JSON
- **Seasonal Authority**: Seasonal factors in JSON
- **Estimate Analytics**: Google Sheets integration

## Error Handling

- **Missing Knowledge**: Use regional average, log warning
- **Unknown Material**: Use proxy material, log warning
- **Unknown Region**: Use closest region, log warning
- **Low Confidence**: Widen range, add disclaimer
- **Calculation Error**: Return wide range, log error

## Monitoring

- **Planning Accuracy**: Track planning vs. actual accuracy
- **Confidence Calibration**: Track confidence vs. actual variance
- **Knowledge Freshness**: Track knowledge refresh intervals
- **Regional Accuracy**: Track regional accuracy by county
- **Material Accuracy**: Track material cost accuracy

## Rollback Plan

- **Fallback to Current System**: Use existing `preliminaryRange` function
- **Manual Knowledge Updates**: Manual JSON updates if automation fails
- **Conservative Bias**: Always bias high for customer satisfaction
- **Audit Trail**: Log all planning calculations for troubleshooting

## Legal Disclaimer

Every planning range must include:

```
This is not an official quote. It is a conservative planning estimate intended to help with budgeting. Taylor will visit the property and prepare a detailed written estimate based on your home's exact conditions. Final pricing may vary based on site conditions, material availability, and other factors.
```

## Future Enhancements

- **Machine Learning**: Use historical data to improve confidence scoring
- **Real-Time Pricing**: Integrate with supplier APIs for real-time material costs
- **Dynamic Seasonal**: Real-time weather integration for seasonal factors
- **Project Complexity**: AI-powered complexity assessment
- **Visual Estimation**: Photo-based material estimation
