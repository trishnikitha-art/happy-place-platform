# Repository Boundary Rule

**Constitutional Rule:** Repositories are isolated. Cross-application communication occurs only through versioned APIs, event contracts, or shared schemas. No application may modify, deploy, or directly manipulate another application's source code, build pipeline, or deployment environment.

---

## Two Separate Systems

### HPP (Public Website)

**Purpose:**
- Customer-facing website
- Production deployment
- Vercel
- Marketing
- SEO
- Landing pages
- Forms
- Public assets

**Deployment:**
- GitHub → Vercel

**PING Access:**
- ✅ Read shared schemas
- ✅ Consume APIs
- ✅ Consume events
- ✅ Consume projections
- ❌ NO write access to HPP files
- ❌ NO deployment access
- ❌ NO routing changes
- ❌ NO configuration changes
- ❌ NO build pipeline changes

**Treat HPP as an external application.**

### PING (Business Operating System)

**Purpose:**
- Mission Control
- Admin
- Workers
- Event Runtime
- Neo4j
- Qdrant
- Ollama
- Business Operating System

**Deployment:**
- GitHub → localhost → Docker → Server → Mission Runtime

**Independence:**
- Deploys independently
- Runs independently
- Owns its own repository
- Owns its own CI/CD
- Owns its own deployments

---

## Relationship

**Instead of:**
```
PING
   ↓
modifies HPP
```

**It becomes:**
```
HPP
   ↓
Business Events

PING
   ↓
Mission Runtime

PING
   ↓
Recommendations

HPP
   ↓
reads published results
```

**Only data crosses. Never source code.**

---

## Shared Contracts

If both applications need the same object (Customer, Review, Estimate, Mission, Project):

**Share only:**
- Schemas
- Event contracts
- API contracts
- Projection interfaces

**Not:**
- Components
- Pages
- Deployments

---

## Admin Rule

The admin interface belongs to PING, not HPP.

**Admin may never:**
- Overwrite website files
- Redeploy the website
- Modify frontend assets
- Touch the public repository

**Admin only:**
- Manages business data through APIs
- Manages business data through events

---

## Communication Pattern

Think of HPP and PING as two neighboring services:

```
HPP
   ↓
POST /events
   ↓
PING
   ↓
Workers
   ↓
Neo4j
   ↓
Qdrant
   ↓
Ollama
   ↓
Projections
   ↓
API
   ↓
HPP
```

**No filesystem access. No repository access. No deployment access.**

---

## Constitutional Rule

"Repositories are isolated. Cross-application communication occurs only through versioned APIs, event contracts, or shared schemas. No application may modify, deploy, or directly manipulate another application's source code, build pipeline, or deployment environment."

**Result:** HPP stays its own Vercel-hosted public website, PING stays its own business operating system, and the only thing they exchange is well-defined data.
