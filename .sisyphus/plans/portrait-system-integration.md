# Portrait Generation System Integration Plan

## Overview

This document outlines the comprehensive plan for integrating Gemini 2.0 Flash Image ("Nano Banana") into the PlaneShift character generation system, enabling AI-powered portrait creation with intelligent tagging, persistence, and remix capabilities.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Tagging System Design](#tagging-system-design)
6. [Service Interfaces](#service-interfaces)
7. [Implementation Phases](#implementation-phases)
8. [Integration Points](#integration-points)
9. [API Specifications](#api-specifications)
10. [Security & Protection Rules](#security--protection-rules)
11. [Testing Strategy](#testing-strategy)
12. [Effort Estimates](#effort-estimates)

---

## Executive Summary

### Goals
1. **Generate portraits on-the-fly** during character/NPC creation using Gemini 2.0 Flash Image
2. **Persist portraits** with comprehensive tagging for future reuse and search
3. **Enable portrait remix** for adapting existing portraits to new contexts
4. **Protect key portraits** (Travellers, key NPCs) from being "remixed" into look-alikes
5. **Support family resemblance** through explicit family grouping

### Key Decisions
- **Separate `PortraitService`** instead of extending `NarrativeGenerator`
- **Hierarchical JSONB tags** with strict enum validation
- **Object storage** for images (local FS dev, S3-compatible prod)
- **Weighted tag matching** for search (embeddings optional later)
- **Explicit family groups** instead of automatic "relative detection"

---

## Current State Analysis

### Existing Infrastructure

| Component | Location | Current State |
|-----------|----------|---------------|
| Character Gen Wizard | `apps/web/components/chargen/ChargenWizard.tsx` | 7-step wizard, creates `ChargenCharacter` |
| NPC Generation | `apps/rag-service/services/narrative_generator.py` | Generates name, personality, motivation, appearance (text) |
| Graph Nodes | `packages/shared/src/types/graph.ts` | `GraphNode.metadata.image_url` field exists (unused) |
| Gemini Provider | `apps/rag-service/providers/gemini.py` | Text-only, uses `gemini-2.0-flash` |
| Entity Spawn Form | `apps/web/components/chargen/EntitySpawnForm.tsx` | UI for creating NPCs during chargen |
| NPC Details Schema | `apps/rag-service/schemas/narrative.py` | Has `appearance?: str` field |

### Gaps to Fill
- No image generation capability in Gemini provider
- No portrait storage or management
- No tagging system
- No portrait search or matching
- No remix/editing functionality

---

## System Architecture

### High-Level Architecture

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                    |
|  apps/web (Next.js)                                                     |
|  +-------------------+  +--------------------+  +----------------------+ |
|  | ChargenWizard     |  | EntitySpawnForm    |  | PortraitLibrary(new) | |
|  | (FinalizeStep)    |  | (NPC creation)     |  | (search/select)      | |
|  +---------+---------+  +---------+----------+  +----------+-----------+ |
|            |                      |                        |             |
|            +----------------------+------------------------+             |
|                                   v                                      |
|                      +------------------------+                          |
|                      |  Portrait Hooks        |                          |
|                      |  usePortrait.ts        |                          |
|                      +-----------+------------+                          |
+--------------------------|-----------------------------------------------+
                           | HTTP API
                           v
+-------------------------------------------------------------------------+
|                              BACKEND                                     |
|  apps/server (Fastify)                                                  |
|  +---------------------------------------------------------------------+|
|  |                      Portrait Router (new)                          ||
|  |  POST /portraits/generate                                           ||
|  |  POST /portraits/:id/remix                                          ||
|  |  GET  /portraits/search                                             ||
|  |  POST /nodes/:nodeId/portrait                                       ||
|  |  GET  /portraits/:id/image                                          ||
|  +---------------------------------------------------------------------+|
|                                 |                                       |
|  +------------------------------v--------------------------------------+|
|  |                    Portrait Service (new)                           ||
|  |  +------------------+  +------------------+  +---------------------+ ||
|  |  | Generation       |  | Tag Matching     |  | Policy Enforcement  | ||
|  |  | Orchestration    |  | & Search         |  | (protection/family) | ||
|  |  +------------------+  +------------------+  +---------------------+ ||
|  +---------------------------------------------------------------------+|
|                                 |                                       |
|  +------------------------------v--------------------------------------+|
|  |                    Storage Layer                                    ||
|  |  +-----------------------+  +--------------------------------------+||
|  |  | Portrait Repository   |  | Storage Adapter                      |||
|  |  | (Postgres JSONB)      |  | LocalDisk / S3Compatible             |||
|  |  +-----------------------+  +--------------------------------------+||
|  +---------------------------------------------------------------------+|
+-------------------------------------------------------------------------+
                           | Internal HTTP
                           v
+-------------------------------------------------------------------------+
|                           AI SERVICE                                     |
|  apps/rag-service (FastAPI)                                             |
|  +---------------------------------------------------------------------+|
|  |                   Portrait AI Router (new)                          ||
|  |  POST /ai/portraits/image  - Generate portrait image                ||
|  |  POST /ai/portraits/tags   - Extract tags from description          ||
|  |  POST /ai/portraits/prompt - Build prompt from tags                 ||
|  +---------------------------------------------------------------------+|
|                                 |                                       |
|  +------------------------------v--------------------------------------+|
|  |                  Gemini Provider (extended)                         ||
|  |  + generate_image()                                                 ||
|  |  + generate_image_from_reference()                                  ||
|  |  + extract_portrait_tags()                                          ||
|  +---------------------------------------------------------------------+|
+-------------------------------------------------------------------------+
```

### Service Boundaries

| Service | Responsibility | Key Principle |
|---------|----------------|---------------|
| **Frontend (Web)** | UI, user interaction | Never talks to Gemini directly |
| **Backend (Server)** | Rules, persistence, search | System of record for portraits |
| **AI Service (RAG)** | AI inference only | Stateless, no persistence |

---

## Data Models

### Database Schema

```sql
-- Portrait metadata table
CREATE TABLE portraits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    
    -- Node linkage
    subject_node_id UUID REFERENCES graph_nodes(id),
    
    -- Lineage tracking
    anchor_portrait_id UUID REFERENCES portraits(id),
    source_portrait_id UUID REFERENCES portraits(id),
    
    -- Family/protection
    family_group_id UUID,
    protected BOOLEAN NOT NULL DEFAULT false,
    source_policy TEXT NOT NULL DEFAULT 'campaign' 
        CHECK (source_policy IN ('subject_only', 'family_only', 'campaign', 'public')),
    
    -- Tags (JSONB for flexibility)
    tags JSONB NOT NULL DEFAULT '{}',
    
    -- Generation metadata
    prompt TEXT,
    prompt_fingerprint TEXT,
    model_id TEXT,
    
    -- Storage
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    
    -- Audit
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_portraits_campaign ON portraits(campaign_id);
CREATE INDEX idx_portraits_subject ON portraits(subject_node_id);
CREATE INDEX idx_portraits_family ON portraits(family_group_id);
CREATE INDEX idx_portraits_protected ON portraits(protected);
CREATE INDEX idx_portraits_tags ON portraits USING gin(tags);
```

### TypeScript Types

```typescript
// packages/shared/src/types/portrait.ts

export interface PortraitTags {
  demographics?: {
    gender?: 'female' | 'male' | 'nonbinary' | 'ambiguous';
    age_range?: 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'elder';
    skin_tone?: 'very_fair' | 'fair' | 'medium' | 'olive' | 'brown' | 'dark';
    eye_color?: 'brown' | 'hazel' | 'green' | 'blue' | 'gray' | 'amber';
    hair_color?: 'black' | 'brown' | 'blonde' | 'red' | 'gray' | 'white' | 'dyed';
    hair_style?: 'buzzcut' | 'short' | 'medium' | 'long' | 'bald' | 'ponytail' | 'braids' | 'afro' | 'wavy' | 'curly';
  };
  physical?: {
    build?: 'slim' | 'average' | 'athletic' | 'stocky' | 'heavy';
    height?: 'short' | 'average' | 'tall';
    distinguishing_features?: DistinguishingFeature[];
  };
  career?: {
    career_type?: CareerType;
    rank_level?: 'low' | 'mid' | 'high';
    career_style?: 'uniformed' | 'civilian' | 'corporate' | 'street' | 'formal';
  };
  traits?: {
    demeanor?: 'calm' | 'stern' | 'friendly' | 'aloof' | 'nervous' | 'aggressive';
    vibe?: 'trustworthy' | 'menacing' | 'mysterious' | 'eccentric' | 'professional';
  };
  background?: {
    homeworld_type?: 'high_tech' | 'industrial' | 'frontier' | 'agricultural' | 'underclass' | 'rich_core';
    social_class?: 'low' | 'middle' | 'upper' | 'noble';
  };
  story: {
    entity_type: 'traveller' | 'npc';
    relationship_type?: 'ally' | 'enemy' | 'neutral' | 'patron' | 'contact' | 'family';
    importance_level?: 'extra' | 'supporting' | 'key';
    family_group?: string;
  };
  rendering?: {
    style?: 'realistic' | 'painterly' | 'cinematic' | 'comic';
    framing?: 'headshot' | 'bust' | 'full_body';
    lighting?: 'neutral' | 'dramatic' | 'low_key' | 'high_key';
  };
  freeform?: string[];
}

export type DistinguishingFeature = 
  | 'scar' | 'tattoo' | 'cybernetic_implant' | 'piercing'
  | 'missing_eye' | 'burn_marks' | 'freckles' | 'beard' | 'mustache'
  | { custom: string };

export type CareerType = 
  | 'navy' | 'marines' | 'scout' | 'merchant' | 'army' 
  | 'agent' | 'noble' | 'drifter' | 'scholar' | 'rogue' 
  | 'citizen' | 'entertainer' | 'other';

export type SourcePolicy = 'subject_only' | 'family_only' | 'campaign' | 'public';

export interface Portrait {
  id: string;
  campaignId: string;
  subjectNodeId?: string;
  anchorPortraitId?: string;
  sourcePortraitId?: string;
  familyGroupId?: string;
  protected: boolean;
  sourcePolicy: SourcePolicy;
  tags: PortraitTags;
  prompt?: string;
  promptFingerprint?: string;
  modelId?: string;
  storageKey: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  imageUrl?: string; // Computed for display
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortraitSearchResult {
  portrait: Portrait;
  score: number;
  scoreBreakdown: Record<string, number>;
}
```

### Python Pydantic Models

```python
# apps/rag-service/schemas/portrait.py

from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel

class Gender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    NONBINARY = "nonbinary"
    AMBIGUOUS = "ambiguous"

class AgeRange(str, Enum):
    CHILD = "child"
    TEEN = "teen"
    YOUNG_ADULT = "young_adult"
    ADULT = "adult"
    MIDDLE_AGED = "middle_aged"
    ELDER = "elder"

# ... (all other enums)

class Demographics(BaseModel):
    gender: Optional[Gender] = None
    age_range: Optional[AgeRange] = None
    skin_tone: Optional[SkinTone] = None
    eye_color: Optional[EyeColor] = None
    hair_color: Optional[HairColor] = None
    hair_style: Optional[HairStyle] = None

class Physical(BaseModel):
    build: Optional[Build] = None
    height: Optional[Height] = None
    distinguishing_features: Optional[list[Union[DistinguishingFeature, dict]]] = None

class Career(BaseModel):
    career_type: Optional[CareerType] = None
    rank_level: Optional[RankLevel] = None
    career_style: Optional[CareerStyle] = None

class Traits(BaseModel):
    demeanor: Optional[Demeanor] = None
    vibe: Optional[Vibe] = None

class Background(BaseModel):
    homeworld_type: Optional[HomeworldType] = None
    social_class: Optional[SocialClass] = None

class Story(BaseModel):
    entity_type: EntityType
    relationship_type: Optional[RelationshipType] = None
    importance_level: Optional[ImportanceLevel] = None
    family_group: Optional[str] = None

class Rendering(BaseModel):
    style: Optional[RenderStyle] = "realistic"
    framing: Optional[Framing] = "bust"
    lighting: Optional[Lighting] = "neutral"

class PortraitTags(BaseModel):
    demographics: Optional[Demographics] = None
    physical: Optional[Physical] = None
    career: Optional[Career] = None
    traits: Optional[Traits] = None
    background: Optional[Background] = None
    story: Story
    rendering: Optional[Rendering] = None
    freeform: Optional[list[str]] = None

class GeneratePortraitRequest(BaseModel):
    tags: PortraitTags
    appearance_text: Optional[str] = None
    reference_image_base64: Optional[str] = None

class GeneratePortraitResponse(BaseModel):
    image_base64: str
    mime_type: str = "image/png"
    prompt_used: str
    model_id: str

class ExtractTagsRequest(BaseModel):
    appearance_text: str
    career: Optional[str] = None
    characteristics: Optional[dict[str, int]] = None
    entity_type: EntityType

class ExtractTagsResponse(BaseModel):
    tags: PortraitTags
    confidence: dict[str, float] = {}
```

---

## Tagging System Design

### Tag Categories & Weights

| Category | Fields | Search Weight | Purpose |
|----------|--------|---------------|---------|
| **Demographics** | gender, age_range, skin_tone, eye_color, hair_color, hair_style | 5x (high) | Primary visual identification |
| **Physical** | build, height, distinguishing_features | 3x (medium-high) | Body type matching |
| **Career** | career_type, rank_level, career_style | 3x (medium) | Context-appropriate portraits |
| **Traits** | demeanor, vibe | 2x (low-medium) | Emotional match |
| **Background** | homeworld_type, social_class | 2x (low-medium) | Aesthetic context |
| **Story** | entity_type, relationship_type, importance_level | Filter (not scored) | Protection rules |
| **Rendering** | style, framing, lighting | 1x (low) | Visual consistency |

### Tag Extraction Pipeline

```
Character Data --> NarrativeGenerator.appearance --> AI Tag Extraction --> Validated PortraitTags
      |                                                                           |
  Characteristics                                                           Prompt Builder
  (STR, DEX, etc.)                                                                |
      |                                                                      Image Prompt
  Infer physical                                                                  |
  traits                                                                   Gemini Image Gen
```

### Characteristic-to-Tag Inference Rules

```typescript
// Example: Infer physical tags from Traveller characteristics
function inferTagsFromCharacteristics(chars: CharacteristicSet): Partial<PortraitTags['physical']> {
  const result: Partial<PortraitTags['physical']> = {};
  
  // STR + END -> Build
  const strEnd = (chars.STR + chars.END) / 2;
  if (strEnd >= 10) result.build = 'athletic';
  else if (strEnd >= 8) result.build = 'average';
  else if (strEnd <= 5) result.build = 'slim';
  
  // SOC -> Social markers (handled in background.social_class)
  // ... etc
  
  return result;
}
```

---

## Service Interfaces

### Backend Portrait Service (TypeScript)

```typescript
// apps/server/src/services/portrait.service.ts

export interface PortraitService {
  // Generation
  generateFromNPC(input: {
    campaignId: string;
    nodeId: string;
    npcDetails: NPCDetails;
    relationship?: string;
    protected?: boolean;
    familyGroupId?: string;
  }): Promise<Portrait>;

  generateFromPC(input: {
    campaignId: string;
    nodeId: string;
    character: ChargenCharacter;
  }): Promise<Portrait>;

  // Remix/Edit
  remix(input: {
    campaignId: string;
    sourcePortraitId: string;
    promptDelta: string;
    tagsPatch?: Partial<PortraitTags>;
    targetNodeId?: string;
    enforceSameSubject?: boolean;
  }): Promise<Portrait>;

  // Search & Match
  search(input: {
    campaignId: string;
    filters: Partial<PortraitTags>;
    text?: string;
    limit?: number;
    excludeProtected?: boolean;
  }): Promise<PortraitSearchResult[]>;

  suggestForCharacter(input: {
    campaignId: string;
    tags: Partial<PortraitTags>;
    limit?: number;
  }): Promise<PortraitSearchResult[]>;

  // Attachment
  attachToNode(input: {
    portraitId: string;
    nodeId: string;
    userId: string;
  }): Promise<void>;

  // Policy
  canRemixFrom(input: {
    sourcePortraitId: string;
    targetNodeId?: string;
    userId: string;
  }): Promise<{ allowed: boolean; reason?: string }>;
}
```

### RAG Service Portrait AI (Python)

```python
# apps/rag-service/services/portrait_generator.py

class PortraitAI:
    """AI capabilities for portrait generation."""
    
    async def generate_image(
        self,
        tags: PortraitTags,
        appearance_text: Optional[str] = None,
    ) -> GeneratePortraitResponse:
        """Generate a new portrait from tags and optional appearance text."""
        ...

    async def generate_from_reference(
        self,
        reference_image: bytes,
        prompt_delta: str,
        tags_patch: Optional[PortraitTags] = None,
    ) -> GeneratePortraitResponse:
        """Generate a portrait variant from an existing image."""
        ...

    async def extract_tags(
        self,
        appearance_text: str,
        career: Optional[str] = None,
        characteristics: Optional[dict[str, int]] = None,
        entity_type: str = "npc",
    ) -> ExtractTagsResponse:
        """Extract structured tags from appearance description."""
        ...

    def build_prompt(self, tags: PortraitTags) -> str:
        """Build an image generation prompt from tags."""
        ...
```

---

## Implementation Phases

### Phase 1: Foundation (3-4 days)

**Goal**: Core infrastructure for portrait generation and storage

#### 1.1 Database & Types
- [x] Create `portraits` table migration
- [x] Add `PortraitTags` TypeScript types to `packages/shared`
- [x] Add Pydantic models to `apps/rag-service`
- [x] Update `GraphNode.metadata` type to include `portrait_id`

#### 1.2 Storage Layer
- [x] Implement `StorageAdapter` interface
- [x] Implement `LocalDiskStorageAdapter` for dev
- [x] Add storage configuration to `.env`

#### 1.3 Gemini Image Generation
- [x] Extend `GeminiProvider` with `generate_image()` method
- [x] Add image generation endpoint to RAG service
- [x] Implement prompt builder from tags

#### 1.4 Basic Portrait Service
- [x] Create `PortraitService` class
- [x] Implement `generateFromNPC()` basic flow
- [x] Add portrait router with `/portraits/generate` endpoint

### Phase 2: Integration (2-3 days)

**Goal**: Connect portrait generation to character creation flows

#### 2.1 NPC Integration
- [x] Add "Generate Portrait" button to `EntitySpawnForm`
- [x] Implement `usePortrait` hook for frontend
- [x] Connect NPC creation to portrait service
- [x] Display generated portrait in entity spawn UI

#### 2.2 PC Integration  
- [x] Add portrait generation to `FinalizeStep.tsx`
- [x] Auto-mark PC portraits as `protected: true`
- [x] Attach portrait to graph node on finalize

#### 2.3 Tag Extraction
- [x] Implement `extract_tags()` in RAG service
- [x] Add tag extraction endpoint
- [x] Integrate with NPC `appearance` text

### Phase 3: Search & Library (2-3 days)

**Goal**: Portrait discovery and reuse

#### 3.1 Search Implementation
- [x] Implement weighted tag matching algorithm
- [x] Add `/portraits/search` endpoint
- [x] Create `PortraitLibrary` component

#### 3.2 Portrait Selection UI
- [x] Add portrait picker modal
- [x] Implement "use existing portrait" option
- [x] Add portrait preview in graph nodes

#### 3.3 Suggestion System
- [x] Implement `suggestForCharacter()` service method
- [x] Add "suggested portraits" section in spawn form
- [x] Show score breakdown for suggestions

### Phase 4: Remix & Protection (2-3 days)

**Goal**: Portrait editing with policy enforcement

#### 4.1 Protection Rules
- [x] Implement `canRemixFrom()` policy method
- [x] Add `source_policy` field handling
- [x] Enforce protection in remix endpoint

#### 4.2 Family Groups
- [x] Add family group management
- [x] Implement "Create Relative" option
- [x] Auto-set family resemblance in remix

#### 4.3 Remix UI
- [x] Create portrait remix modal
- [x] Add "edit this portrait" option
- [x] Support prompt delta input
- [x] Display lineage chain

### Phase 5: Polish & Advanced (2-3 days)

**Goal**: Production-ready quality

#### 5.1 Performance
- [x] Add caching for portrait images
- [x] Implement lazy loading in gallery
- [x] Add progress indicators for generation

#### 5.2 S3 Storage Adapter
- [x] Implement `S3CompatibleStorageAdapter`
- [x] Add signed URL generation
- [x] Configure for production

#### 5.3 Testing
- [x] Unit tests for tag matching
- [x] Integration tests for generation flow
- [x] E2E test for portrait in chargen

---

## Integration Points

### EntitySpawnForm Enhancement

```tsx
// apps/web/components/chargen/EntitySpawnForm.tsx

// ADD: Portrait generation section
<div className="pt-4 border-t border-zinc-700">
  <label className="text-sm font-medium mb-2 block">Portrait</label>
  
  {portrait ? (
    <div className="relative">
      <img src={portrait.imageUrl} className="w-32 h-32 rounded-lg object-cover" />
      <button onClick={handleRegenerate}>Regenerate</button>
    </div>
  ) : (
    <div className="flex gap-2">
      <SciFiButton onClick={handleGeneratePortrait} disabled={generating}>
        {generating ? 'Generating...' : 'Generate Portrait'}
      </SciFiButton>
      <SciFiButton onClick={handleSelectFromLibrary} theme="slate">
        Browse Library
      </SciFiButton>
    </div>
  )}
</div>
```

### FinalizeStep Enhancement

```tsx
// apps/web/components/chargen/steps/FinalizeStep.tsx

// ADD: Portrait section before finalize button
<div className="portrait-section">
  <h3>Character Portrait</h3>
  <PortraitGenerator
    character={character}
    onPortraitGenerated={setPortrait}
    autoProtect={true} // Travellers are always protected
  />
</div>

// MODIFY: createCharacterNode to include portrait
const handleFinalize = async () => {
  const nodeData = createCharacterNode(character);
  if (portrait) {
    await attachPortrait(portrait.id, nodeData.graphNodeId);
  }
};
```

### GraphNode Display

```tsx
// apps/web/components/graph/CustomNode.tsx

// ADD: Portrait display in node
{node.metadata.portrait_id && (
  <img 
    src={`/api/portraits/${node.metadata.portrait_id}/image`}
    className="w-12 h-12 rounded-full absolute -top-2 -right-2"
    alt={node.label}
  />
)}
```

---

## API Specifications

### Backend API (Fastify)

```yaml
openapi: 3.0.0
paths:
  /portraits/generate:
    post:
      summary: Generate a new portrait
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [campaign_id, tags]
              properties:
                campaign_id: { type: string, format: uuid }
                subject_node_id: { type: string, format: uuid }
                tags: { $ref: '#/components/schemas/PortraitTags' }
                appearance_text: { type: string }
                protected: { type: boolean, default: false }
                family_group_id: { type: string, format: uuid }
      responses:
        201:
          description: Portrait generated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Portrait'

  /portraits/{id}/remix:
    post:
      summary: Create a remix of an existing portrait
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [prompt_delta]
              properties:
                prompt_delta: { type: string }
                tags_patch: { $ref: '#/components/schemas/PortraitTags' }
                target_node_id: { type: string, format: uuid }
                enforce_same_subject: { type: boolean }
      responses:
        201:
          description: Remixed portrait created
        403:
          description: Remix not allowed (protected portrait)

  /portraits/search:
    get:
      summary: Search portraits by tags
      parameters:
        - name: campaign_id
          in: query
          required: true
          schema: { type: string, format: uuid }
        - name: tags
          in: query
          schema: { type: string, description: 'JSON-encoded partial tags' }
        - name: q
          in: query
          schema: { type: string, description: 'Free text search' }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: exclude_protected
          in: query
          schema: { type: boolean, default: false }
      responses:
        200:
          description: Search results
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PortraitSearchResult'

  /portraits/{id}/image:
    get:
      summary: Get portrait image
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Portrait image
          content:
            image/png: {}

  /nodes/{nodeId}/portrait:
    post:
      summary: Attach portrait to graph node
      parameters:
        - name: nodeId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [portrait_id]
              properties:
                portrait_id: { type: string, format: uuid }
      responses:
        200:
          description: Portrait attached
```

### RAG Service API (FastAPI)

```yaml
paths:
  /ai/portraits/image:
    post:
      summary: Generate portrait image using Gemini
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GeneratePortraitRequest'
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GeneratePortraitResponse'

  /ai/portraits/tags:
    post:
      summary: Extract portrait tags from text
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExtractTagsRequest'
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExtractTagsResponse'
```

---

## Security & Protection Rules

### Protection Levels

| Policy | Who Can Remix | Use Case |
|--------|---------------|----------|
| `subject_only` | Only for the same subject node | Key story NPCs, Travellers |
| `family_only` | Same subject OR same family_group | Relatives of key characters |
| `campaign` | Anyone in the campaign | General NPCs |
| `public` | Anyone (future) | Shared portrait library |

### Enforcement Rules

```typescript
function canRemixPortrait(
  source: Portrait,
  targetNodeId: string | undefined,
  userId: string
): { allowed: boolean; reason?: string } {
  // Protected portraits have strict rules
  if (source.protected) {
    // Rule 1: subject_only - only same subject can use
    if (source.sourcePolicy === 'subject_only') {
      if (targetNodeId !== source.subjectNodeId) {
        return { allowed: false, reason: 'This portrait is protected and can only be remixed for the same character.' };
      }
    }
    
    // Rule 2: family_only - same subject OR same family
    if (source.sourcePolicy === 'family_only') {
      if (targetNodeId !== source.subjectNodeId) {
        const targetNode = getNode(targetNodeId);
        const targetFamilyGroup = targetNode?.metadata?.family_group_id;
        if (targetFamilyGroup !== source.familyGroupId) {
          return { allowed: false, reason: 'This portrait can only be remixed for family members.' };
        }
      }
    }
  }
  
  return { allowed: true };
}
```

### Auto-Protection Rules

| Entity Type | Auto Protected | Default Policy |
|-------------|----------------|----------------|
| Traveller (PC) | Yes | `subject_only` |
| NPC with `importance_level: 'key'` | Yes | `subject_only` |
| NPC with `relationship_type: 'ally' or 'enemy'` | Optional | `campaign` |
| Generic NPC | No | `campaign` |

---

## Testing Strategy

### Unit Tests

```typescript
// apps/server/__tests__/portrait-service.test.ts

describe('PortraitService', () => {
  describe('tag matching', () => {
    it('should score demographics with high weight', () => {
      const source = { demographics: { gender: 'female', age_range: 'adult' } };
      const target = { demographics: { gender: 'female', age_range: 'elder' } };
      const score = calculateTagSimilarity(source, target);
      expect(score).toBeGreaterThan(0.5); // Gender match
      expect(score).toBeLessThan(0.9); // Age mismatch penalty
    });

    it('should match career context', () => {
      const source = { career: { career_type: 'navy', rank_level: 'high' } };
      const target = { career: { career_type: 'navy', rank_level: 'mid' } };
      const score = calculateTagSimilarity(source, target);
      expect(score).toBeGreaterThan(0.7); // Same career type
    });
  });

  describe('protection rules', () => {
    it('should block remix of protected portrait for different subject', async () => {
      const result = await service.canRemixFrom({
        sourcePortraitId: protectedPortraitId,
        targetNodeId: differentNodeId,
        userId: anyUserId,
      });
      expect(result.allowed).toBe(false);
    });

    it('should allow family remix for family members', async () => {
      const result = await service.canRemixFrom({
        sourcePortraitId: familyProtectedId,
        targetNodeId: familyMemberNodeId, // Same family_group_id
        userId: anyUserId,
      });
      expect(result.allowed).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
// apps/server/__tests__/portrait-integration.test.ts

describe('Portrait Generation Flow', () => {
  it('should generate, store, and attach portrait', async () => {
    // 1. Generate portrait
    const response = await request(app)
      .post('/portraits/generate')
      .send({
        campaign_id: testCampaignId,
        tags: { story: { entity_type: 'npc' }, demographics: { gender: 'male' } },
        appearance_text: 'A weathered spacer with gray temples',
      });
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    // 2. Verify storage
    const imageResponse = await request(app)
      .get(`/portraits/${response.body.id}/image`);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['content-type']).toBe('image/png');

    // 3. Attach to node
    await request(app)
      .post(`/nodes/${testNodeId}/portrait`)
      .send({ portrait_id: response.body.id });

    // 4. Verify search finds it
    const searchResponse = await request(app)
      .get('/portraits/search')
      .query({ campaign_id: testCampaignId, tags: JSON.stringify({ demographics: { gender: 'male' } }) });
    expect(searchResponse.body).toContainEqual(expect.objectContaining({ id: response.body.id }));
  });
});
```

### E2E Tests

```typescript
// apps/web/e2e/portrait-chargen.spec.ts

test('should generate portrait during NPC creation', async ({ page }) => {
  // Navigate to chargen
  await page.goto('/chargen');
  
  // Start career event that spawns NPC
  // ... navigate to event with spawn
  
  // Fill NPC form
  await page.fill('[data-testid="npc-name"]', 'Captain Vance');
  
  // Click generate portrait
  await page.click('[data-testid="generate-portrait"]');
  
  // Wait for portrait to appear
  await expect(page.locator('[data-testid="portrait-preview"]')).toBeVisible();
  
  // Complete spawn
  await page.click('[data-testid="spawn-complete"]');
  
  // Verify portrait in graph node
  await page.goto('/graph');
  await expect(page.locator('[data-testid="node-captain-vance"] img')).toBeVisible();
});
```

---

## Effort Estimates

### By Phase

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| Phase 1 | Foundation | 3-4 days | None |
| Phase 2 | Integration | 2-3 days | Phase 1 |
| Phase 3 | Search & Library | 2-3 days | Phase 2 |
| Phase 4 | Remix & Protection | 2-3 days | Phase 3 |
| Phase 5 | Polish & Advanced | 2-3 days | Phase 4 |
| **Total** | | **11-16 days** | |

### MVP (Minimum Viable Portrait)

For a quick MVP with just generation + storage + basic attachment:
- Phase 1.1-1.4: 3 days
- Phase 2.1-2.2 (partial): 2 days
- **MVP Total: 5 days**

### Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gemini image gen latency (>30s) | User frustration | Medium | Add async job queue, progress indicator |
| Tag taxonomy drift | Poor search quality | High | Strict enum validation, AI normalization |
| Storage costs at scale | Operational cost | Low | Content-addressable deduplication |
| Policy enforcement bugs | Wrong portraits exposed | Medium | Comprehensive unit tests, audit logging |

---

## Environment Variables

### New Variables Required

```bash
# apps/server/.env
PORTRAIT_STORAGE_TYPE=local  # or 's3'
PORTRAIT_STORAGE_PATH=./uploads/portraits
# For S3:
# PORTRAIT_S3_BUCKET=planeshift-portraits
# PORTRAIT_S3_REGION=us-east-1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

# apps/rag-service/.env
GEMINI_API_KEY=...  # Already exists
GEMINI_IMAGE_MODEL=gemini-2.0-flash  # Or specific image model
```

---

## Open Questions

1. **Portrait Style Consistency**: Should we enforce a consistent visual style across the campaign? (e.g., "all portraits in cinematic style")

2. **Batch Generation**: Should we support generating multiple portrait options at once for user selection?

3. **Offline Support**: How do portraits work with the local-first Yjs architecture? Cache images in IndexedDB?

4. **Foundry Export**: Should exported characters include portrait images or just URLs?

5. **Rate Limiting**: How many portraits per session/campaign to prevent API cost explosion?

---

## Appendix: Prompt Template

```python
PORTRAIT_PROMPT_TEMPLATE = """
Create a Traveller RPG character portrait.

Subject:
- Entity: {story.entity_type}, importance: {story.importance_level or 'standard'}
- Age: {demographics.age_range or 'adult'}, gender: {demographics.gender or 'unspecified'}
- Skin tone: {demographics.skin_tone or 'medium'}, eyes: {demographics.eye_color or 'brown'}
- Hair: {demographics.hair_color or 'dark'}, style: {demographics.hair_style or 'short'}
- Build: {physical.build or 'average'}, height impression: {physical.height or 'average'}
{distinguishing_features_section}

Context:
- Career: {career.career_type or 'traveller'}, rank: {career.rank_level or 'entry'}, style: {career.career_style or 'civilian'}
- Demeanor: {traits.demeanor or 'neutral'}, vibe: {traits.vibe or 'professional'}
- Homeworld vibe: {background.homeworld_type or 'industrial'}, class: {background.social_class or 'middle'}

{appearance_text_section}

Rendering constraints:
- Framing: {rendering.framing or 'bust'} portrait, centered, clear face, sharp focus
- Background: subtle sci-fi neutral, no text, no logos, no watermark
- Lighting: {rendering.lighting or 'neutral'}, style: {rendering.style or 'realistic'}

Safety:
- Do not resemble real people or celebrities.
- Appropriate for all ages.
"""
```

---

## Files to Create/Modify

### New Files

| File Path | Purpose |
|-----------|---------|
| `packages/shared/src/types/portrait.ts` | TypeScript types for portraits |
| `apps/server/src/services/portrait.service.ts` | Portrait business logic |
| `apps/server/src/routes/portraits.ts` | Portrait API routes |
| `apps/server/src/storage/storage-adapter.ts` | Storage abstraction |
| `apps/server/src/storage/local-disk-adapter.ts` | Local file storage |
| `apps/server/migrations/NNNN_create_portraits.sql` | Database migration |
| `apps/rag-service/schemas/portrait.py` | Pydantic models |
| `apps/rag-service/services/portrait_generator.py` | AI portrait generation |
| `apps/rag-service/routers/portrait.py` | AI endpoints |
| `apps/web/lib/portrait/usePortrait.ts` | Portrait React hook |
| `apps/web/components/portrait/PortraitGenerator.tsx` | Generation UI |
| `apps/web/components/portrait/PortraitLibrary.tsx` | Search/select UI |
| `apps/web/components/portrait/PortraitRemixer.tsx` | Remix UI |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `packages/shared/src/types/graph.ts` | Add `portrait_id` to metadata |
| `apps/rag-service/providers/gemini.py` | Add image generation methods |
| `apps/web/components/chargen/EntitySpawnForm.tsx` | Add portrait section |
| `apps/web/components/chargen/steps/FinalizeStep.tsx` | Add portrait generation |
| `apps/web/lib/chargen/finalize.ts` | Attach portrait to node |
| `apps/web/components/graph/CustomNode.tsx` | Display portrait |

---

## Summary

This plan provides a comprehensive, phased approach to integrating Gemini 2.0 Flash Image ("Nano Banana") for portrait generation in PlaneShift. Key features include:

1. **Structured tagging** with hierarchical JSONB schema for rich metadata
2. **Protection policies** preventing Traveller/key NPC portraits from being remixed into look-alikes
3. **Family grouping** for maintaining resemblance between relatives
4. **Weighted tag matching** for intelligent portrait search and suggestions
5. **Clean architecture** separating AI inference (RAG service) from business logic (Server) and UI (Web)

The MVP can be delivered in ~5 days, with the full feature set requiring 11-16 days of development effort.
