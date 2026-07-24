# Generation Manifest Specification

**Status:** Draft
**Purpose:** Define machine-readable constitution for PING code generation
**Context:** PING generates runtime from Tenant Constitution via Generation Manifest

---

## 1. Overview

The Generation Manifest is a first-class constitutional artifact that makes the Constitution executable. Instead of being documentation for contractors, it becomes the source that PING agents compile into the application.

**Architecture:**
```
PING Kernel
        ↓
Constitution
        ↓
Generation Manifest
        ↓
Code Generator
        ↓
Repositories
Services
Events
APIs
Tests
Projections
Replay
Witness
```

**Target Flow:**
```
Constitution
    ↓
PING
    ↓
Generate (80-90%)
    ↓
Humans Review
    ↓
Deploy
```

---

## 2. Manifest Structure

### 2.1 Root Schema

```yaml
version: "1.0"
tenant_id: "tenant-001"
constitution:
  identities: {...}
  missions: {...}
  evidence: {...}
  observations: {...}
  claims: {...}
  facts: {...}
  capabilities: {...}
  policies: {...}
  authorities: {...}
  workflows: {...}
```

### 2.2 Versioning

```yaml
version: "MAJOR.MINOR.PATCH"
# MAJOR: Breaking changes to manifest structure
# MINOR: New fields, backward compatible
# PATCH: Bug fixes, documentation updates
```

---

## 3. Identities

### 3.1 Schema

```yaml
identities:
  IdentityName:
    version: "1.0"
    description: "Human-readable description"
    fields:
      - name: field_name
        type: string | number | boolean | date | enum
        required: true | false
        unique: true | false
        indexed: true | false
        enum_values: [...]  # for enum type
    external_mappings:
      - provider: provider_name
        external_field: external_field_name
        mapping_type: direct | transform
        transform: ...  # optional transform function
    policies:
      - policy_name
    events:
      - IdentityCreated
      - IdentityUpdated
      - IdentityDeleted
    commands:
      - Create
      - Update
      - Delete
```

### 3.2 Example: Customer

```yaml
identities:
  Customer:
    version: "1.0"
    description: "Customer identity with external provider mappings"
    fields:
      - name: name
        type: string
        required: true
        unique: false
        indexed: true
      - name: email
        type: string
        required: true
        unique: true
        indexed: true
      - name: phone
        type: string
        required: false
        unique: false
        indexed: true
      - name: address
        type: string
        required: false
        unique: false
        indexed: false
    external_mappings:
      - provider: google_contacts
        external_field: contactId
        mapping_type: direct
      - provider: jobber
        external_field: customerId
        mapping_type: direct
      - provider: hubspot
        external_field: contactId
        mapping_type: direct
      - provider: salesforce
        external_field: accountId
        mapping_type: direct
    policies:
      - UniqueEmail
      - ValidPhoneFormat
    events:
      - CustomerCreated
      - CustomerUpdated
      - CustomerDeleted
    commands:
      - Create
      - Update
      - Delete
```

### 3.3 Example: Crew

```yaml
identities:
  Crew:
    version: "1.0"
    description: "Crew member identity with skills and availability"
    fields:
      - name: name
        type: string
        required: true
        unique: false
        indexed: true
      - name: role
        type: enum
        required: true
        unique: false
        indexed: true
        enum_values: [foreman, carpenter, laborer, specialist]
      - name: skills
        type: array
        required: false
        unique: false
        indexed: false
      - name: availability
        type: object
        required: false
        unique: false
        indexed: false
    external_mappings:
      - provider: jobber
        external_field: crewId
        mapping_type: direct
    policies:
      - ValidRole
      - SkillsMatchRole
    events:
      - CrewCreated
      - CrewUpdated
      - CrewDeleted
    commands:
      - Create
      - Update
      - Delete
```

---

## 4. Missions

### 4.1 Schema

```yaml
missions:
  MissionName:
    version: "1.0"
    description: "Human-readable description"
    owns:
      - RelatedIdentity
      - RelatedMission
      - Evidence
    events:
      - EventName:
          fields:
            - name: field_name
              type: string | number | boolean | date | enum
              required: true | false
    commands:
      - CommandName:
          parameters:
            - name: parameter_name
              type: string | number | boolean | date | enum
              required: true | false
    policies:
      - PolicyName
    state_machine:
      initial_state: StateName
      states:
        - name: StateName
          transitions:
            - on: EventName
              to: TargetState
              guard: GuardName
```

### 4.2 Example: Estimate

```yaml
missions:
  Estimate:
    version: "1.0"
    description: "Estimate mission for customer property"
    owns:
      - Customer
      - Property
      - Tasks
      - Evidence
    events:
      - EstimateCreated:
          fields:
            - name: customer_id
              type: string
              required: true
            - name: property_id
              type: string
              required: true
            - name: estimated_amount
              type: number
              required: true
      - EstimateAccepted:
          fields:
            - name: accepted_by
              type: string
              required: true
            - name: accepted_at
              type: date
              required: true
      - EstimateRejected:
          fields:
            - name: rejected_by
              type: string
              required: true
            - name: rejected_at
              type: date
              required: true
            - name: reason
              type: string
              required: false
      - EstimateExpired:
          fields:
            - name: expired_at
              type: date
              required: true
    commands:
      - Accept:
          parameters:
            - name: accepted_by
              type: string
              required: true
      - Reject:
          parameters:
            - name: rejected_by
              type: string
              required: true
            - name: reason
              type: string
              required: false
      - Expire:
          parameters: []
    policies:
      - MustHaveCustomer
      - MustHaveProperty
      - ValidAmount
    state_machine:
      initial_state: draft
      states:
        - name: draft
          transitions:
            - on: EstimateCreated
              to: pending
        - name: pending
          transitions:
            - on: EstimateAccepted
              to: accepted
            - on: EstimateRejected
              to: rejected
            - on: EstimateExpired
              to: expired
        - name: accepted
          transitions:
            - on: JobCreated
              to: converted
        - name: rejected
          transitions: []
        - name: expired
          transitions: []
        - name: converted
          transitions: []
```

### 4.3 Example: Job

```yaml
missions:
  Job:
    version: "1.0"
    description: "Job mission for executing work"
    owns:
      - Estimate
      - Customer
      - Property
      - Tasks
      - Crew
      - Evidence
      - Invoice
    events:
      - JobCreated:
          fields:
            - name: estimate_id
              type: string
              required: true
            - name: scheduled_start
              type: date
              required: true
            - name: scheduled_end
              type: date
              required: true
      - JobStarted:
          fields:
            - name: started_at
              type: date
              required: true
            - name: started_by
              type: string
              required: true
      - JobCompleted:
          fields:
            - name: completed_at
              type: date
              required: true
            - name: completed_by
              type: string
              required: true
      - JobCancelled:
          fields:
            - name: cancelled_at
              type: date
              required: true
            - name: cancelled_by
              type: string
              required: true
            - name: reason
              type: string
              required: false
    commands:
      - Start:
          parameters:
            - name: started_by
              type: string
              required: true
      - Complete:
          parameters:
            - name: completed_by
              type: string
              required: true
      - Cancel:
          parameters:
            - name: cancelled_by
              type: string
              required: true
            - name: reason
              type: string
              required: false
    policies:
      - MustHaveEstimate
      - MustHaveCrew
      - ValidSchedule
    state_machine:
      initial_state: scheduled
      states:
        - name: scheduled
          transitions:
            - on: JobCreated
              to: scheduled
            - on: JobStarted
              to: in_progress
        - name: in_progress
          transitions:
            - on: JobCompleted
              to: completed
            - on: JobCancelled
              to: cancelled
        - name: completed
          transitions: []
        - name: cancelled
          transitions: []
```

---

## 5. Evidence

### 5.1 Schema

```yaml
evidence:
  EvidenceType:
    version: "1.0"
    description: "Human-readable description"
    content_type: MIME_type_pattern
    processing:
      - processing_step
    metadata:
      - name: metadata_field
        type: string | number | boolean | date
        required: true | false
    policies:
      - PolicyName
    events:
      - EvidenceIngested
      - EvidenceProcessed
```

### 5.2 Example: Photo

```yaml
evidence:
  Photo:
    version: "1.0"
    description: "Photo evidence with object detection and classification"
    content_type: image/*
    processing:
      - object_detection
      - classification
      - text_extraction
      - quality_assessment
    metadata:
      - name: location
        type: string
        required: false
      - name: timestamp
        type: date
        required: true
      - name: camera
        type: string
        required: false
      - name: resolution
        type: string
        required: false
    policies:
      - ValidImageFormat
      - MaxFileSize
    events:
      - PhotoIngested
      - PhotoProcessed
```

### 5.3 Example: Video

```yaml
evidence:
  Video:
    version: "1.0"
    description: "Video evidence with frame extraction and motion detection"
    content_type: video/*
    processing:
      - frame_extraction
      - motion_detection
      - audio_extraction
      - transcription
    metadata:
      - name: duration
        type: number
        required: true
      - name: resolution
        type: string
        required: false
      - name: frame_rate
        type: number
        required: false
    policies:
      - ValidVideoFormat
      - MaxFileSize
      - MaxDuration
    events:
      - VideoIngested
      - VideoProcessed
```

### 5.4 Example: Voice

```yaml
evidence:
  Voice:
    version: "1.0"
    description: "Voice evidence with transcription and sentiment analysis"
    content_type: audio/*
    processing:
      - transcription
      - sentiment_analysis
      - speaker_identification
    metadata:
      - name: duration
        type: number
        required: true
      - name: sample_rate
        type: number
        required: false
      - name: channels
        type: number
        required: false
    policies:
      - ValidAudioFormat
      - MaxFileSize
      - MaxDuration
    events:
      - VoiceIngested
      - VoiceProcessed
```

### 5.5 Example: PDF

```yaml
evidence:
  PDF:
    version: "1.0"
    description: "PDF evidence with text and table extraction"
    content_type: application/pdf
    processing:
      - text_extraction
      - table_extraction
      - signature_detection
      - metadata_extraction
    metadata:
      - name: page_count
        type: number
        required: true
      - name: author
        type: string
        required: false
      - name: created_date
        type: date
        required: false
    policies:
      - ValidPDFFormat
      - MaxFileSize
      - MaxPageCount
    events:
      - PDFIngested
      - PDFProcessed
```

---

## 6. Observations

### 6.1 Schema

```yaml
observations:
  ObservationName:
    version: "1.0"
    description: "Human-readable description"
    evidence_types:
      - EvidenceType
    claims:
      - ClaimName
    confidence_threshold: number
    requires_verification: true | false
    events:
      - ObservationCreated
      - ObservationVerified
```

### 6.2 Example: RoofDamage

```yaml
observations:
  RoofDamage:
    version: "1.0"
    description: "Observation of roof damage from photo or video evidence"
    evidence_types:
      - Photo
      - Video
    claims:
      - NeedsReplacement
      - NeedsRepair
    confidence_threshold: 0.7
    requires_verification: true
    events:
      - RoofDamageObserved
      - RoofDamageVerified
```

### 6.3 Example: WaterLeak

```yaml
observations:
  WaterLeak:
    version: "1.0"
    description: "Observation of water leak from photo or video evidence"
    evidence_types:
      - Photo
      - Video
    claims:
      - NeedsRepair
      - NeedsReplacement
    confidence_threshold: 0.6
    requires_verification: true
    events:
      - WaterLeakObserved
      - WaterLeakVerified
```

### 6.4 Example: BrokenWindow

```yaml
observations:
  BrokenWindow:
    version: "1.0"
    description: "Observation of broken window from photo or video evidence"
    evidence_types:
      - Photo
      - Video
    claims:
      - NeedsReplacement
    confidence_threshold: 0.8
    requires_verification: false
    events:
      - BrokenWindowObserved
      - BrokenWindowVerified
```

---

## 7. Claims

### 7.1 Schema

```yaml
claims:
  ClaimName:
    version: "1.0"
    description: "Human-readable description"
    confidence_threshold: number
    requires_verification: true | false
    verification_method: human | automated | hybrid
    auto_verify_threshold: number
    events:
      - ClaimCreated
      - ClaimVerified
      - ClaimRejected
```

### 7.2 Example: NeedsReplacement

```yaml
claims:
  NeedsReplacement:
    version: "1.0"
    description: "Claim that component needs replacement"
    confidence_threshold: 0.8
    requires_verification: true
    verification_method: hybrid
    auto_verify_threshold: 0.9
    events:
      - NeedsReplacementClaimed
      - NeedsReplacementVerified
      - NeedsReplacementRejected
```

### 7.3 Example: NeedsRepair

```yaml
claims:
  NeedsRepair:
    version: "1.0"
    description: "Claim that component needs repair"
    confidence_threshold: 0.6
    requires_verification: false
    verification_method: automated
    auto_verify_threshold: 0.7
    events:
      - NeedsRepairClaimed
      - NeedsRepairVerified
      - NeedsRepairRejected
```

---

## 8. Facts

### 8.1 Schema

```yaml
facts:
  FactName:
    version: "1.0"
    description: "Human-readable description"
    source: ClaimName
    verification_required: true | false
    ttl: number  # time to live in seconds, optional
    events:
      - FactEstablished
      - FactRevoked
```

### 8.2 Example: VerifiedRoofDamage

```yaml
facts:
  VerifiedRoofDamage:
    version: "1.0"
    description: "Verified fact that roof has damage"
    source: NeedsReplacement
    verification_required: true
    ttl: 31536000  # 1 year
    events:
      - VerifiedRoofDamageEstablished
      - VerifiedRoofDamageRevoked
```

---

## 9. Capabilities

### 9.1 Schema

```yaml
capabilities:
  CapabilityName:
    version: "1.0"
    description: "Human-readable description"
    supports:
      - operation_name
    inputs:
      - name: input_name
        type: string | number | boolean | date | enum | array | object
        required: true | false
    outputs:
      - name: output_name
        type: string | number | boolean | date | enum | array | object
    constraints:
      - constraint_name
    events:
      - CapabilityExecuted
      - CapabilityFailed
```

### 9.2 Example: Calendar

```yaml
capabilities:
  Calendar:
    version: "1.0"
    description: "Calendar capability for scheduling events"
    supports:
      - schedule
      - cancel
      - reschedule
      - availability
      - conflict_detection
    inputs:
      - name: start_time
        type: date
        required: true
      - name: end_time
        type: date
        required: true
      - name: attendees
        type: array
        required: false
      - name: location
        type: string
        required: false
      - name: title
        type: string
        required: true
      - name: description
        type: string
        required: false
    outputs:
      - name: event_id
        type: string
      - name: calendar_url
        type: string
      - name: status
        type: enum
        enum_values: [confirmed, tentative, cancelled]
    constraints:
      - MaxAttendees: 100
      - MaxDuration: 86400  # 24 hours in seconds
    events:
      - CalendarEventScheduled
      - CalendarEventCancelled
      - CalendarEventRescheduled
      - CalendarAvailabilityChecked
      - CalendarConflictDetected
```

### 9.3 Example: Payments

```yaml
capabilities:
  Payments:
    version: "1.0"
    description: "Payments capability for charging and invoicing"
    supports:
      - charge
      - refund
      - subscription
      - invoice
    inputs:
      - name: amount
        type: number
        required: true
      - name: currency
        type: enum
        required: true
        enum_values: [USD, EUR, GBP, CAD]
      - name: customer_id
        type: string
        required: jobber
      - name: payment_method
        type: enum
        required: false
        enum_values: [card, bank_transfer, check]
    outputs:
      - name: payment_id
        type: string
      - name: receipt_url
        type: string
      - name: status
        type: enum
        enum_values: [succeeded, failed, pending, refunded]
    constraints:
      - MinAmount: 0.01
      - MaxAmount: 1000000
    events:
      - PaymentCharged
      - PaymentRefunded
      - SubscriptionCreated
      - InvoiceCreated
```

### 9.4 Example: CRM

```yaml
capabilities:
  CRM:
    version: "1.0"
    description: "CRM capability for customer management"
    supports:
      - create_customer
      - update_customer
      - sync_contacts
    inputs:
      - name: name
        type: string
        required: true
      - name: email
        type: string
        required: true
      - name: phone
        type: string
        required: false
      - name: address
        type: string
        required: false
    outputs:
      - name: customer_id
        type: string
      - name: sync_status
        type: enum
        enum_values: [synced, pending, failed]
    constraints:
      - UniqueEmail: true
    events:
      - CustomerCreated
      - CustomerUpdated
      - ContactsSynced
```

### 9.5 Example: Messaging

```yaml
capabilities:
  Messaging:
    version: "1.0"
    description: "Messaging capability for email, SMS, and notifications"
    supports:
      - send_email
      - send_sms
      - send_notification
    inputs:
      - name: recipient
        type: string
        required: true
      - name: subject
        type: string
        required: true
      - name: body
        type: string
        required: true
      - name: channel
        type: enum
        required: true
        enum_values: [email, sms, notification]
    outputs:
      - name: message_id
        type: string
      - name: delivery_status
        type: enum
        enum_values: [delivered, failed, pending]
    constraints:
      - MaxSubjectLength: 200
      - MaxBodyLength: 10000
    events:
      - MessageSent
      - MessageDelivered
      - MessageFailed
```

### 9.6 Example: Storage

```yaml
capabilities:
  Storage:
    version: "1.0"
    description: "Storage capability for file upload, download, and management"
    supports:
      - upload
      - download
      - delete
      - archive
    inputs:
      - name: file
        type: object
        required: true
      - name: metadata
        type: object
        required: false
      - name: retention_period
        type: number
        required: false
    outputs:
      - name: file_id
        type: string
      - name: storage_url
        type: string
      - name: size
        type: number
    constraints:
      - MaxFileSize: 1073741824  # 1GB in bytes
      - AllowedTypes: [image/*, video/*, audio/*, application/pdf]
    events:
      - FileUploaded
      - FileDownloaded
      - FileDeleted
      - FileArchived
```

### 9.7 Example: Vision

```yaml
capabilities:
  Vision:
    version: "1.0"
    description: "Vision capability for object detection, classification, and text extraction"
    supports:
      - detect_objects
      - classify_images
      - extract_text
    inputs:
      - name: image
        type: object
        required: true
      - name: model
        type: enum
        required: false
        enum_values: [yolo, resnet, efficientnet]
      - name: confidence_threshold
        type: number
        required: false
    outputs:
      - name: detections
        type: array
      - name: classifications
        type: array
      - name: text
        type: string
    constraints:
      - MaxImageSize: 10485760  # 10MB in bytes
      - MinConfidence: 0.5
    events:
      - ObjectsDetected
      - ImageClassified
      - TextExtracted
```

### 9.8 Example: Scheduling

```yaml
capabilities:
  Scheduling:
    version: "1.0"
    description: "Scheduling capability for finding windows and optimizing schedules"
    supports:
      - find_window
      - detect_conflict
      - optimize_schedule
    inputs:
      - name: constraints
        type: object
        required: true
      - name: preferences
        type: object
        required: false
      - name: horizon
        type: number
        required: false
    outputs:
      - name: windows
        type: array
      - name: conflicts
        type: array
      - name: optimized_schedule
        type: object
    constraints:
      - MaxHorizon: 7776000  # 90 days in seconds
    events:
      - ScheduleWindowFound
      - ScheduleConflictDetected
      - ScheduleOptimized
```

---

## 10. Policies

### 10.1 Schema

```yaml
policies:
  PolicyName:
    version: "1.0"
    description: "Human-readable description"
    enforcement: runtime | constitutional | hybrid
    scope: all | identity | mission | evidence | observation | claim | fact | capability
    rules:
      - rule_name: rule_definition
    events:
      - PolicyViolated
      - PolicyEnforced
```

### 10.2 Example: TenantIsolation

```yaml
policies:
  TenantIsolation:
    version: "1.0"
    description: "Every operation must include tenantId"
    enforcement: runtime
    scope: all
    rules:
      - require_tenant_id: "Every operation must include tenantId in metadata"
      - forbid_cross_tenant_access: "Operations cannot access data from other tenants"
    events:
      - TenantIsolationViolated
      - TenantIsolationEnforced
```

### 10.3 Example: Replay

```yaml
policies:
  Replay:
    version: "1.0"
    description: "All state must be replayable from events"
    enforcement: constitutional
    scope: all
    rules:
      - event_sourcing: "All state changes must be recorded as events"
      - immutable_events: "Events cannot be modified or deleted"
      - deterministic_replay: "Replay must produce identical state from same events"
    events:
      - ReplayPolicyViolated
      - ReplayPolicyEnforced
```

### 10.4 Example: Witness

```yaml
policies:
  Witness:
    version: "1.0"
    description: "All operations must generate witness attestations"
    enforcement: constitutional
    scope: all
    rules:
      - witness_generation: "Every operation must generate a witness attestation"
      - witness_verification: "Witness attestations must be verifiable"
    events:
      - WitnessPolicyViolated
      - WitnessPolicyEnforced
```

### 10.5 Example: Authority

```yaml
policies:
  Authority:
    version: "1.0"
    description: "All mutations must go through authorities"
    enforcement: constitutional
    scope: all
    rules:
      - authority_required: "All mutations must be authorized by the appropriate authority"
      - authority_jurisdiction: "Authorities must only operate within their jurisdiction"
    events:
      - AuthorityPolicyViolated
      - AuthorityPolicyEnforced
```

---

## 11. Authorities

### 11.1 Schema

```yaml
authorities:
  AuthorityName:
    version: "1.0"
    description: "Human-readable description"
    jurisdiction:
      - domain_scope
    owns:
      - event_type
      - projection_type
    depends_on:
      - authority_name
    events:
      - AuthorityExecuted
      - AuthorityFailed
```

### 11.2 Example: Mission Authority

```yaml
authorities:
  MissionAuthority:
    version: "1.0"
    description: "Authority for mission lifecycle and state transitions"
    jurisdiction:
      - Mission lifecycle
      - Task assignment
      - Crew assignment
    owns:
      - MissionCreated
      - MissionAccepted
      - CrewAssigned
      - MissionCompleted
      - MissionStateProjection
    depends_on:
      - IdentityAuthority
    events:
      - MissionAuthorityExecuted
      - MissionAuthorityFailed
```

### 11.3 Example: Observation Authority

```yaml
authorities:
  ObservationAuthority:
    version: "1.0"
    description: "Authority for evidence observation and claim evaluation"
    jurisdiction:
      - Evidence observation
      - Claim evaluation
      - Fact verification
    owns:
      - ObservationCreated
      - ClaimCreated
      - FactEstablished
      - ObservationProjection
    depends_on:
      - EvidenceAuthority
    events:
      - ObservationAuthorityExecuted
      - ObservationAuthorityFailed
```

### 11.4 Example: Evidence Authority

```yaml
authorities:
  EvidenceAuthority:
    version: "1.0"
    description: "Authority for evidence ingestion and chain validation"
    jurisdiction:
      - Evidence ingestion
      - Evidence chain validation
    owns:
      - EvidenceIngested
      - EvidenceProcessed
      - EvidenceLineageProjection
    depends_on: []
    events:
      - EvidenceAuthorityExecuted
      - EvidenceAuthorityFailed
```

### 11.5 Example: Identity Authority

```yaml
authorities:
  IdentityAuthority:
    version: "1.0"
    description: "Authority for identity assignment and external identity mapping"
    jurisdiction:
      - Identity assignment
      - External identity mapping
    owns:
      - IdentityCreated
      - IdentityUpdated
      - IdentityDeleted
      - ExternalIdentityMapped
      - IdentityProjection
    depends_on: []
    events:
      - IdentityAuthorityExecuted
      - IdentityAuthorityFailed
```

---

## 12. Workflows

### 12.1 Schema

```yaml
workflows:
  WorkflowName:
    version: "1.0"
    description: "Human-readable description"
    trigger:
      event: EventName
      condition: optional_condition
    steps:
      - name: step_name
        type: command | intent | capability | condition
        target: target_name
        parameters:
          - name: parameter_name
            value: parameter_value
        on_failure: continue | stop | retry
        retry_count: number
    events:
      - WorkflowStarted
      - WorkflowCompleted
      - WorkflowFailed
```

### 12.2 Example: Estimate to Job Workflow

```yaml
workflows:
  EstimateToJob:
    version: "1.0"
    description: "Convert accepted estimate to job"
    trigger:
      event: EstimateAccepted
    steps:
      - name: create_job
        type: command
        target: Job.Create
        parameters:
          - name: estimate_id
            value: ${event.estimate_id}
        on_failure: stop
        retry_count: 3
      - name: schedule_appointment
        type: intent
        target: NeedAppointment
        parameters:
          - name: mission_id
            value: ${job.id}
          - name: constraints
            value:
              start_after: ${event.accepted_at}
              duration: 3600
        on_failure: continue
        retry_count: 0
      - name: notify_crew
        type: capability
        target: Messaging.send_notification
        parameters:
          - name: recipient
            value: ${job.crew_id}
          - name: subject
            value: "New Job Assigned"
          - name: body
            value: "You have been assigned to job ${job.id}"
        on_failure: continue
        retry_count: 3
    events:
      - EstimateToJobStarted
      - EstimateToJobCompleted
      - EstimateToJobFailed
```

---

## 13. Generation Targets

### 13.1 What PING Generates

From the Generation Manifest, PING agents generate:

**Repositories:**
- Event store implementations
- Aggregate repositories
- Projection repositories

**Services:**
- Command handlers
- Query handlers
- Domain services

**Events:**
- Event schemas
- Event serializers
- Event deserializers

**APIs:**
- REST endpoints
- GraphQL schemas
- WebSocket handlers

**Projections:**
- Read model schemas
- Projection builders
- Projection updaters

**CQRS Handlers:**
- Command validation
- Query optimization
- Event routing

**Tests:**
- Unit tests
- Integration tests
- Replay tests
- Boundary violation tests

**Documentation:**
- API documentation
- Event documentation
- Policy documentation

**Replay:**
- Replay engine configuration
- State reconstruction logic
- Divergence detection

**Witness:**
- Witness generation logic
- Witness verification logic
- Witness chain management

---

## 14. Validation Rules

### 14.1 Manifest Validation

```yaml
validation:
  required_fields:
    - version
    - tenant_id
    - constitution.identities
    - constitution.missions
    - constitution.evidence
    - constitution.observations
    - constitution.claims
    - constitution.facts
    - constitution.capabilities
    - constitution.policies
    - constitution.authorities
  
  version_format: "MAJOR.MINOR.PATCH"
  
  reference_integrity:
    - identities.external_mappings.provider must exist in capabilities
    - missions.owns must reference defined identities or missions
    - observations.evidence_types must reference defined evidence
    - observations.claims must reference defined claims
    - facts.source must reference defined claims
    - authorities.depends_on must reference defined authorities
    - workflows.trigger.event must reference defined events
    - workflows.steps.target must reference defined commands, intents, or capabilities
  
  state_machine_validity:
    - missions.state_machine.initial_state must exist in states
    - states.transitions.to must reference defined states
    - states.transitions.on must reference defined events
  
  policy_scope_validity:
    - policies.scope must be valid scope value
    - policies.enforcement must be valid enforcement value
  
  capability_validity:
    - capabilities.supports must be non-empty array
    - capabilities.inputs must be defined for all operations
    - capabilities.outputs must be defined for all operations
```

---

## 15. Example Complete Manifest

```yaml
version: "1.0"
tenant_id: "tenant-001"
constitution:
  identities:
    Customer:
      version: "1.0"
      description: "Customer identity with external provider mappings"
      fields:
        - name: name
          type: string
          required: true
          unique: false
          indexed: true
        - name: email
          type: string
          required: true
          unique: true
          indexed: true
      external_mappings:
        - provider: google_contacts
          external_field: contactId
          mapping_type: direct
      policies:
        - UniqueEmail
      events:
        - CustomerCreated
        - CustomerUpdated
      commands:
        - Create
        - Update
  
  missions:
    Estimate:
      version: "1.0"
      description: "Estimate mission for customer property"
      owns:
        - Customer
        - Property
      events:
        - EstimateCreated:
            fields:
              - name: customer_id
                type: string
                required: true
        - EstimateAccepted:
            fields:
              - name: accepted_by
                type: string
                required: true
      commands:
        - Accept:
            parameters:
              - name: accepted_by
                type: string
                required: true
      policies:
        - MustHaveCustomer
      state_machine:
        initial_state: draft
        states:
          - name: draft
            transitions:
              - on: EstimateCreated
                to: pending
          - name: pending
            transitions:
              - on: EstimateAccepted
                to: accepted
  
  evidence:
    Photo:
      version: "1.0"
      description: "Photo evidence with object detection"
      content_type: image/*
      processing:
        - object_detection
        - classification
      metadata:
        - name: timestamp
          type: date
          required: true
      policies:
        - ValidImageFormat
      events:
        - PhotoIngested
        - PhotoProcessed
  
  observations:
    RoofDamage:
      version: "1.0"
      description: "Observation of roof damage"
      evidence_types:
        - Photo
      claims:
        - NeedsReplacement
      confidence_threshold: 0.7
      requires_verification: true
      events:
        - RoofDamageObserved
  
  claims:
    NeedsReplacement:
      version: "1.0"
      description: "Claim that component needs replacement"
      confidence_threshold: 0.8
      requires_verification: true
      verification_method: hybrid
      events:
        - NeedsReplacementClaimed
        - NeedsReplacementVerified
  
  facts:
    VerifiedRoofDamage:
      version: "1.0"
      description: "Verified fact that roof has damage"
      source: NeedsReplacement
      verification_required: true
      events:
        - VerifiedRoofDamageEstablished
  
  capabilities:
    Calendar:
      version: "1.0"
      description: "Calendar capability for scheduling events"
      supports:
        - schedule
        - cancel
      inputs:
        - name: start_time
          type: date
          required: true
        - name: end_time
          type: date
          required: true
      outputs:
        - name: event_id
          type: string
      events:
        - CalendarEventScheduled
        - CalendarEventCancelled
  
  policies:
    TenantIsolation:
      version: "1.0"
      description: "Every operation must include tenantId"
      enforcement: runtime
      scope: all
      rules:
        - require_tenant_id: "Every operation must include tenantId"
      events:
        - TenantIsolationViolated
  
  authorities:
    MissionAuthority:
      version: "1.0"
      description: "Authority for mission lifecycle"
      jurisdiction:
        - Mission lifecycle
      owns:
        - MissionCreated
        - MissionAccepted
      depends_on:
        - IdentityAuthority
      events:
        - MissionAuthorityExecuted
  
  workflows:
    EstimateToJob:
      version: "1.0"
      description: "Convert accepted estimate to job"
      trigger:
        event: EstimateAccepted
      steps:
        - name: create_job
          type: command
          target: Job.Create
          parameters:
            - name: estimate_id
              value: ${event.estimate_id}
          on_failure: stop
      events:
        - EstimateToJobStarted
        - EstimateToJobCompleted
```

---

## 16. Conclusion

The Generation Manifest is the machine-readable constitution that PING agents consume to generate 80-90% of the runtime code. This approach:

1. **Makes the Constitution Executable:** Instead of documentation, the constitution becomes the source code
2. **Accelerates Development:** 4-week milestone instead of 6-month roadmap
3. **Ensures Constitutional Compliance:** Generated code automatically respects constitutional constraints
4. **Enables Rapid Evolution:** Constitution changes trigger regeneration of affected components
5. **Reduces Human Error:** Generated code eliminates manual implementation mistakes
6. **Maintains Consistency:** All generated code follows the same patterns and conventions

The Generation Manifest is the key to building the Tenant OS rapidly while preserving the constitutional guarantees established by PING.
