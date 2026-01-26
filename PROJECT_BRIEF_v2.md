# **PROJECT\_BRIEF\_v2.md**

## **v2 Delta Summary**

The following revisions constitute the delta between the initial project scope (v1) and this finalized execution plan (v2). These changes reflect authoritative architectural decisions designed to prioritize collaborative real-time interaction and robust data integrity over cosmetic polish.

* **Milestone Reordering:** The **Lifepath Graph** has been elevated to the primary milestone (Milestone 1). The roadmap is restructured to prioritize the multi-user real-time graph engine before campaign management or Foundry integrations.  
* **Real-Time Architecture:** Explicit selection of **CRDT (Conflict-free Replicated Data Types)** via the **Yjs** library to power the multi-user Lifepath Graph, replacing generic WebSocket speculation. This ensures offline-first capabilities and robust eventual consistency.1  
* **MVP Campaign State:** Introduction of a **Barebones Campaign State** module (Base Resources \+ Reputation Tracking) as an immediate MVP requirement, utilizing low-fidelity tabular UIs for reliability over polish.  
* **GraphRAG Access Control:** Detailed specification of a **Role-Based \+ Character-Knowledge Gating** mechanism for the RAG pipeline. This includes metadata injection strategies (e.g., access\_scope tags) to filter vector retrieval based on user roles and in-game character knowledge states.3  
* **Conflict Resolution Policy:** Implementation of a deterministic **Sync Conflict Policy**. This includes a "Conflict Matrix" defining rules for specific collision scenarios (e.g., GM override authority, Last-Write-Wins for scalar values, append-only for logs) and a dedicated "Conflict Queue" UI for manual resolution of edge cases.4  
* **Manual Fallback Protocol:** A new **Manual Fallback Mode** section defining the operational runbook for importing/exporting campaign data via JSON when the automated PlaneShift-Foundry sync bridge is unavailable (specifically addressing Foundry V11+ LevelDB constraints).6  
* **Blue-Booking Preservation:** The "Minigame" mechanics (Hacking, Social maneuvering) have been moved to a **Future Extensions / Nice-to-Have** section, preserving their design logic for post-MVP iterations without blocking the critical path.  
* **Expanded Data Models:** Detailed schema definitions for Graph Entities, Faction Reputation, and Base Resource ledgers.

## ---

**1\. Project Overview & Vision**

**PlaneShift** is an advanced campaign management ecosystem designed to bridge the functional gap between high-fidelity virtual tabletop simulation (Foundry VTT) and the abstract, narrative-driven layer of tabletop roleplaying games (TTRPGs). It operates as a "second screen" architecture for Game Masters (GMs) and players, specifically targeting the *meta-game* layers: complex faction politics, evolving character lifepaths, logistical base management, and deep lore discovery.

### **1.1 Context and Problem Space**

Current market solutions fracture the TTRPG experience into two disconnected domains: the tactical simulation (handled by VTTs like Foundry) and the narrative management (handled by disconnected tools like Google Docs, Obsidian, or physical notebooks). This separation creates a "State Drift" where the narrative reality (e.g., "The Baron is angry at us") desynchronizes from the simulation reality (e.g., The Baron's token is still set to 'Neutral' AI). Furthermore, collaborative world-building is often hampered by single-user locking mechanisms in traditional wiki software.

PlaneShift solves this by providing a unified, real-time, synchronized environment. It does not replace the VTT; it enhances it by offloading the complex, non-tactical data structures—relationship graphs, economic ledgers, and knowledge retrieval—into a specialized interface that syncs back to the VTT when necessary.

### **1.2 Core Objectives**

1. **Visualize the Narrative (The Lifepath Graph):** Transform static character backstories and ephemeral campaign events into a persistent, dynamic, and interactive **Lifepath Graph**. This graph serves as the central navigation interface for the campaign's history and future \[v2\].  
2. **Synchronize Truth (The Bridge):** Maintain a unified state of campaign reality between the VTT (tactical simulation) and the Web App (narrative management), ensuring data consistency across disparate platforms through a deterministic sync protocol \[v2\].  
3. **Gate Knowledge (Secure RAG):** Utilize **GraphRAG** (Retrieval Augmented Generation) to serve lore and answers to players strictly based on what their characters *know*, enforcing a narrative "fog of war" that respects roleplay constraints \[v2\].  
4. **Collaborate in Real-Time (The Multiplayer Engine):** Allow multiple users to edit the campaign graph, update resources, and take notes simultaneously, with robust conflict resolution driven by CRDTs, ensuring that the "collective imagination" is captured without technical friction.1

## ---

**2\. System Architecture**

### **2.1 High-Level Stack Strategy**

The architecture is defined by a need for real-time responsiveness and offline resilience. We adopt a **Local-First** web architecture.

* **Frontend:** React 18 / Next.js framework.  
  * *Visualization:* WebGL-powered canvas (e.g., React Flow or dedicated PIXI.js renderer) for the Lifepath Graph to handle 1000+ nodes efficiently.7  
  * *State Management:* **Yjs** (CRDT library) coupled with IndexedDB for local persistence.  
* **Collaboration Engine:** **Yjs** over WebSockets.  
  * *Rationale:* Yjs provides the shared types (Maps, Arrays, Text) necessary to build a conflict-free distributed state.8  
* **Backend:** Hybrid Node.js/Python microservices.  
  * *Node.js Service:* Handles WebSocket signaling (y-websocket), authentication, and basic CRUD operations for the PostgreSQL persistence layer.  
  * *Python Service:* Dedicated to AI operations—Vector embeddings (LangChain/LlamaIndex) and LLM orchestration for GraphRAG.  
* **Database Layer:**  
  * *Primary State:* PostgreSQL (persisting Yjs binary updates/snapshots).  
  * *Vector Store:* Pinecone or Milvus (optimized for metadata filtering).9  
* **Integration Layer:** A custom Foundry VTT Module (plane-shift-bridge) communicating via a secured REST/Socket API.

### **2.2 Data Flow & State Management \[v2\]**

The system operates on a **Local-First** principle. This is critical for TTRPG sessions where internet connectivity may be intermittent or where latency must not interrupt the flow of storytelling.

1. **Client-Side Authority:** The browser maintains a local replica of the campaign state (Y.Doc). All user actions (graph edits, note taking) are applied immediately to this local replica, ensuring zero-latency feedback.10  
2. **Sync Layer:** The Yjs provider propagates these changes as efficient binary deltas to other connected clients and the central server via WebSockets.  
3. **Persistence:** The server acts as a "dumb" peer that persists these deltas to PostgreSQL. It does not perform conflict arbitration itself; the CRDT logic handles that mathematically.1  
4. **Conflict Resolution:** Merges happen automatically via CRDT logic (see Section 4.2). Semantic conflicts (e.g., narrative contradictions that are mathematically valid but logically impossible) are flagged for GM review via a "Conflict Queue".5  
5. **Foundry Bridge:** A specialized sync adapter polls or pushes changes between the PlaneShift server and the Foundry VTT host, converting between Foundry's Document Model (Actors, Items) and PlaneShift's Graph Schema.

## ---

**3\. Milestone 1: The Lifepath Graph (Priority)**

**Status:** CRITICAL PATH

**Timeline:** Weeks 1-4

The Lifepath Graph is the visual heart of PlaneShift. It represents characters, events, factions, and items as nodes in a connected web. This milestone focuses entirely on enabling a multi-user, real-time collaborative environment for editing this graph. It is the "Minimum Viable Product" for the visualization engine.

### **3.1 Functional Requirements**

* **Real-Time Multi-User Editing:** Multiple users must be able to add, move, and edit nodes simultaneously without locking the document or overwriting each other's work.1  
* **Presence Awareness:** Users must see the cursors and selection halos of other active users to prevent "stepping on toes" during planning sessions.11  
* **Offline Resilience:** Users can continue editing if the connection drops; changes sync automatically upon reconnection.2  
* **History & Undo:** A global undo/redo stack that respects user intent (selective undo).12

### **3.2 Real-Time Collaboration Model: CRDT Implementation \[v2\]**

We have selected **Option 1: CRDT-based collaboration** using **Yjs**.

* **Justification:**  
  * **vs. Operational Transformation (OT):** OT relies on a central server to transform operations, which introduces latency and single-point-of-failure risks. It is brittle in poor network conditions.1  
  * **vs. Server Locking:** Locking creates friction in creative brainstorming sessions.  
  * **Why Yjs?** Yjs is optimized for graph-like structures (nested maps) and text editing. It outperforms Automerge in memory efficiency for large documents and has a robust ecosystem for presence awareness.8

#### **3.2.1 Data Model (Yjs Schemas)**

The graph state is stored in a single Y.Doc. This document contains the following shared types:

* **Nodes (Y.Map\<NodeID, Y.Map\>):**  
  * id: UUID (Immutable).  
  * type: String (Enum: Actor, Event, Faction, Location, Item).  
  * position: Y.Map {x: float, y: float}. *Architectural Note: Position is separated to avoid update storms on metadata changes during dragging.*  
  * label: Y.Text (Supports collaborative text editing on the label itself).  
  * metadata: Y.Map (Arbitrary JSON data: tags, status, image URL).  
  * locked: Boolean (If true, only GM can move/edit).  
* **Edges (Y.Array\<Edge\>):**  
  * id: UUID.  
  * source: NodeID.  
  * target: NodeID.  
  * relation: String (Enum: Ally, Enemy, Located\_In, Participated\_In).  
  * weight: Integer (Visual thickness).  
* **Presence (Y.Awareness):**  
  * Ephemeral state broadcasted via WebSocket (not persisted to DB).  
  * userId: UUID.  
  * cursor: {x, y} (Canvas coordinates).  
  * selection: \`\` (List of currently selected nodes).  
  * color: Hex string (User's assigned color).

#### **3.2.2 Handling Conflicting Edits**

CRDTs handle *data* conflicts (e.g., two users changing a label) mathematically. However, *semantic* conflicts require logic 1:

* **Concurrent Node Movement:** If User A and User B move Node X simultaneously, the **Last-Write-Wins (LWW)** strategy is applied to the {x, y} coordinates based on the hybrid logical clock. Visually, the node will "jump" to the final position. *Mitigation:* Visual interpolation (tweening) handles the jump smoothly.  
* **Concurrent Deletion & Edit:** If User A deletes Node X while User B edits its label, the **Deletion wins**. Node X is removed. *Mitigation:* The "Undo" stack allows recovery.  
* **Edge Ghosting:** If a Node is deleted, all connected Edges are automatically identified and removed by a reactive cleanup routine on the client side (orphaned edges are not strictly forbidden by the data model but are cleaned for hygiene).

### **3.3 Acceptance Criteria (Milestone 1\)**

| Requirement ID | Description | Acceptance Criteria |
| :---- | :---- | :---- |
| **LG-01** | **Node CRUD** | User can create, read, update label, and delete nodes. Changes reflect on other clients within \<100ms. |
| **LG-02** | **Edge Linking** | User can drag a line between two nodes to create an edge. Relationship type can be selected from a dropdown. |
| **LG-03** | **Canvas Manipulation** | User can pan (infinite canvas) and zoom (0.1x to 5x). Viewport state is local (not synced). |
| **LG-04** | **Presence** | When User A selects a node, User B sees a colored border around that node with User A's name tag. |
| **LG-05** | **Offline Sync** | User A disconnects internet \-\> Adds 3 nodes \-\> Reconnects. Nodes appear on User B’s screen immediately.2 |
| **LG-06** | **Persistance** | Server saves Y.Doc binary updates to Postgres. Reloading the page restores the graph exactly as left. |

## ---

**4\. Campaign State Tracking (MVP)**

**Status:** PRIORITY (Integrated alongside Graph)

**Design Philosophy:** "Spreadsheet-lite." Low UI ambition, high reliability.

This section defines the barebones data tables required to track the "Macro Game" (Base building and Faction politics). These are not graphical widgets but functional data grids. It is essential to include this "boring" utility early to provide value beyond visualization.

### **4.1 Base Resources Table \[v2\]**

A simple, flat ledger for tracking the party's headquarters or mobile base (e.g., Starship, Castle).

**Data Structure (Y.Map "BaseState"):**

* **Resources (Y.Map):**  
  * RU (Resource Units): Integer.  
  * PWH (Power/Work Hours): Integer.  
  * Morale: Integer (0-100).  
* **Inventory (Y.Array of Rows):**  
  * Item Name: String.  
  * Category: String (e.g., "Spare Parts", "Ammunition").  
  * Quantity: Integer.  
  * Notes: Text.

**UI Requirements:**

* **Display:** Simple HTML Table (React Table component).  
* **Editing:** Inline editing (click cell to edit).  
* **History:** Right-click cell \-\> "View History" (Show who changed value from X to Y and when).  
* **Export:** Button to download table as .csv.

### **4.2 Reputation & Standing Table \[v2\]**

A tracker for the party's political standing with various world powers. This data informs the "Reaction" tables in the VTT but lives here for management.14

**Data Structure (Y.Map "ReputationState"):**

* **Factions (Y.Array of Rows):**  
  * FactionID: Link to Graph Node ID (if exists).  
  * Name: String.  
  * Standing: Integer (-100 to \+100).  
  * Tier: String (Computed: Hostile, Cold, Neutral, Warm, Allied).  
  * Heat: Integer (0-10, tracking active aggression).  
  * LastChange: String ("+5 for saving diplomat").  
  * LastChangeTimestamp: ISO Date.

**UI Requirements:**

* **Visual Feedback:** "Standing" cell background color scales from Red (-100) to Green (+100).  
* **Graph Link:** Clicking the Faction Name focuses the camera on the corresponding Faction Node in the Lifepath Graph.

## ---

**5\. GraphRAG & Knowledge Access Control**

**Status:** CORE FEATURE

**Constraint:** Knowledge must be gated. A player cannot retrieve secrets their character does not know.

### **5.1 The "Knowledge Scope" Architecture \[v2\]**

Standard RAG retrieves based on semantic similarity. **Secure RAG** requires a pre-retrieval filtering step. We implement this by tagging every chunk of text with an access\_scope list and filtering query results against the user's current\_scope.3

#### **5.1.1 Document Ingestion & Tagging**

When a document (PDF, Text Note, Lore Entry) is ingested:

1. **Chunking:** Text is split into 500-token chunks to ensure granularity.  
2. **Entity Extraction:** The LLM identifies entities (e.g., "The Crimson King", "Sector 7").  
3. **Scope Tagging:** The GM (or system defaults) assigns visibility tags via a simple UI.  
   * scope:public: Available to everyone.  
   * scope:gm: Only GM.  
   * scope:faction:cabal: Requires knowledge of the "Cabal" faction.  
   * scope:char:garrus: Specific to character "Garrus".

**Vector Metadata Example:**

JSON

{  
  "text": "The Crimson King's weakness is sunlight...",  
  "vector": \[0.12, \-0.45,...\],  
  "metadata": {  
    "source\_id": "doc\_882",  
    "access\_scope": \["scope:gm", "scope:char:garrus", "knowledge:crimson\_weakness"\]  
  }  
}

#### **5.1.2 The "Character Knowledge" Overlay**

We maintain a **Knowledge State** for each character in the database:

* **Table:** CharacterKnowledge  
* **Columns:** CharacterID | KnowledgeTag (e.g., knowledge:crimson\_weakness).

**The Unlock Mechanism:**

* When a player discovers a clue in-game (e.g., reads a book, interrogates a prisoner), the GM clicks "Grant Knowledge" on the relevant Node/Item in the Graph.  
* System adds knowledge:crimson\_weakness to that Character's knowledge set.

#### **5.1.3 Retrieval Pipeline (The "Query Path")**

1. **User Query:** Player (playing Character A) asks: *"How do I kill the Crimson King?"*  
2. **Scope Assembly:** System builds the allowed filter list:  
   * \`\`  
3. **Vector Search:**  
   * Query: "How do I kill the Crimson King?"  
   * Filter: metadata.access\_scope IN \[assembled\_scope\_list\].9  
4. **Ranking:** Only vectors matching the filter are ranked by similarity.  
5. **Generation:** LLM generates answer using only the accessible chunks.

### **5.2 Concrete Examples**

| Content Type | Example | Access Tags | Retrieval Behavior |
| :---- | :---- | :---- | :---- |
| **Public Lore** | "The City of Brass was founded in 2040." | \['public'\] | Retrievable by any player query. |
| **Secret Dossier** | "Senator Vreen is a mole for the Syndicate." | \['gm', 'knowledge:vreen\_secret'\] | Player asks "Is Vreen loyal?" \-\> Returns "No info found" UNLESS they found the dossier (GM unlocked knowledge:vreen\_secret). |
| **Backstory** | "Garrus killed his brother." | \['gm', 'char:garrus'\] | Only Garrus (and GM) can query "What is my darkest secret?". Other players get no result. |

## ---

**6\. Synchronization & Conflict Policy**

**Status:** COMPLEXITY RISK

**Goal:** Deterministic handling of data collisions between the Web App and Foundry VTT.

### **6.1 Sources of Change**

1. **Web App:** Players updating graph nodes, journal notes, or base resources.  
2. **Foundry VTT:** GM updating actor HP, items, or scene data.  
3. **Offline Uploads:** Player submitting a batch of changes after a week offline (Late Submission).

### **6.2 The Conflict Matrix \[v2\]**

We define strict rules for collision handling to avoid "forked realities".4

| Scenario | Conflict Type | Resolution Policy | Mechanism |
| :---- | :---- | :---- | :---- |
| **GM vs Player (Simultaneous)** | Edit Collision | **GM Wins** | Server timestamp check. GM's edit overwrites Player's edit. Notification sent to Player. |
| **Player A vs Player B (Same Field)** | Edit Collision | **Last-Write-Wins (LWW)** | Yjs CRDT logic handles this naturally. The later timestamp prevails.1 |
| **Foundry vs Web (Actor Stats)** | Data Sync | **Foundry Authoritative** | In-session, Foundry VTT is the "Sim Source of Truth". Web App accepts Foundry state for HP/Gold/XP. |
| **Foundry vs Web (Bio/Notes)** | Data Sync | **Merge / Append** | Text fields are merged using CRDT text logic if possible. If widely divergent, Web App creates a "Conflicted Copy" note. |
| **Offline Upload vs Live State** | Stale Data | **Rebase Required** | If user uploads data older than 1 hour vs current state, System rejects auto-merge and opens "Conflict Queue" UI. |

### **6.3 The "Conflict Queue" UX**

When the system cannot determine a safe merge (e.g., Scenario 5 above):

1. The sync pauses for that specific entity.  
2. The Entity is flagged with a **"Sync Conflict"** badge in the UI.  
3. **GM Review Interface:**  
   * **Left Column:** Current Server State.  
   * **Right Column:** Incoming/Conflicted State.  
   * **Actions:** \`\` \[Overwrite with Incoming\] \[Manual Merge\] (Opens text diff).  
   * *Audit Log:* The resolution action is logged: "GM resolved conflict on Actor 'Kael' by keeping Server state."

### **6.4 Edge Case Handling \[v2\]**

1. **The "Session Boundary" Case:** A player edits their inventory on the Web App *while* the GM has the Foundry world open but the sync module is disconnected.  
   * *Result:* Upon reconnection, Foundry pulls the Web App data. If the GM also changed inventory, a Conflict Flag is raised.  
2. **The "Double Delete":** User A deletes a node. User B edits the node.  
   * *Result:* Deletion wins. Node disappears. User B's edits are lost (or preserved in history log).  
3. **Circular Reference:** User A makes Node X child of Y. User B makes Node Y child of X.  
   * *Result:* Graph cycle detection runs post-merge. If cycle detected, the edge with the later timestamp is rejected/removed.  
4. **Mass Import Collision:** GM imports a JSON backup that overwrites 50% of the graph.  
   * *Result:* System snapshots current state to "Backup\_Pre\_Import" before applying. No field-level merging; bulk overwrite is destructive.  
5. **Permission Downgrade:** GM changes a Node from Public to Private while a player is viewing it.  
   * *Result:* Real-time push kicks the player off the node view immediately ("Access Revoked").  
6. **Orphaned Comments:** A node is deleted, but has a thread of comments.  
   * *Result:* Comments are archived in a global "Orphaned Notes" list for GM review, not deleted.

## ---

**7\. Foundry VTT Integration & Manual Fallback**

### **7.1 Integration Architecture (V11+ Compliance)**

Foundry V11+ uses LevelDB, which locks database files while the application is running.6 We cannot simply "read the file" on the disk as was possible in V10 (NeDB).

* **Primary Method:** A custom Foundry Module (plan-shift-bridge) that utilizes the Foundry API game.actors, game.items to read/write data in memory.  
* **Transport:** The module opens a WebSocket connection to the PlaneShift server.

### **7.2 Manual Fallback Mode (The "Runbook") \[v2\]**

If the real-time bridge fails (e.g., Firewall issues, Module bug, API mismatch), the GM must resort to Manual Import/Export to maintain state.

#### **7.2.1 Export from Foundry**

* **Mechanism:** Use the standard "Export to JSON" feature on Folders or Compendiums (or a bulk export macro provided by PlaneShift).16  
* **Format:** Standard Foundry JSON (schema\_version, name, system, items, etc.).  
* **Operation:**  
  1. GM selects "Party Actors" folder.  
  2. Right Click \-\> Export Data.  
  3. Save party-data.json.

#### **7.2.2 Import to PlaneShift**

* **UI:** "Settings \-\> Data Management \-\> Manual Import".  
* **Logic:**  
  1. Upload party-data.json.  
  2. System parses JSON.  
  3. **Matching:** Matches Entities by foundry\_uuid (if present) or Name (fuzzy match).  
  4. **Update:** Updates mapped fields (HP, XP, Inventory).  
  5. **Log:** Displays report "Updated 4 Actors. Created 1 new Actor. Failed to match 'Goblin Slayer'."

#### **7.2.3 Export from PlaneShift (to Foundry)**

* **UI:** "Export Campaign \-\> Format: Foundry JSON".  
* **Output:** A ZIP file containing individual JSON files for Actors and Journal Entries.  
* **Import in Foundry:**  
  1. GM creates a Compendium or Folder.  
  2. Uses "Adventure Import" or "Import Data" module to ingest the JSONs.17

## ---

**8\. Roadmap & Milestones**

The roadmap has been aggressively reordered to prioritize the **Lifepath Graph** (the differentiator) and **Core Data** (the utility) before the complex integrations.

### **Phase 1: The Core Engine (Weeks 1-4)**

*Goal: A working multi-user graph editor.*

| Week | Milestone | Deliverables & Acceptance Criteria |
| :---- | :---- | :---- |
| **W1** | **Project Init & Yjs Setup** | Repo setup, Yjs/Websocket server running. Basic "Whiteboard" where users can spawn rectangles. |
| **W2** | **Graph Data Model** | Implementation of Node/Edge types. Nodes have labels and metadata. Edges connect nodes. Persistence to DB. |
| **W3** | **Real-Time UX** | Presence (cursors). Selection halos. Live updates (drag node \-\> moves on other screens) \[LG-01 to LG-04\]. |
| **W4** | **Graph Polish (Milestone 1\)** | Pan/Zoom canvas. Node styling (colors/icons). Locking mechanism. **Release Alpha 0.1.** |

### **Phase 2: Campaign State & MVP Data (Weeks 5-6)**

*Goal: Playable "Spreadsheet" functionality.*

| Week | Milestone | Deliverables & Acceptance Criteria |
| :---- | :---- | :---- |
| **W5** | **Base & Faction Tables** | Grid views for Resources and Reputation. Inline editing. Sorting/Filtering. |
| **W6** | **Linkage** | Linking Table Rows to Graph Nodes. Clicking "Syndicate" in table centers Graph on Syndicate Node. |

### **Phase 3: GraphRAG & Knowledge (Weeks 7-9)**

*Goal: The "Brain" of the system.*

| Week | Milestone | Deliverables & Acceptance Criteria |
| :---- | :---- | :---- |
| **W7** | **Ingestion Pipeline** | Upload PDF/Text. Chunking. Vectorization (Pinecone/Milvus). |
| **W8** | **Access Control Logic** | Metadata tagging (scope). User role definition. Character knowledge table. |
| **W9** | **Chat Interface** | RAG Query UI. "Ask the Lore". Responses filtered by permissions. **Release Alpha 0.2.** |

### **Phase 4: Integration & Hardening (Weeks 10-12)**

*Goal: Connecting to the VTT and stabilizing.*

| Week | Milestone | Deliverables & Acceptance Criteria |
| :---- | :---- | :---- |
| **W10** | **Manual Import/Export** | JSON parsers for Foundry data. Backup/Restore UI. |
| **W11** | **Sync Logic** | The Foundry Module prototype. Conflict resolution queue. |
| **W12** | **Beta Launch** | End-to-end testing. Load testing (20 concurrent users). **Release Beta 1.0.** |

## ---

**9\. Future Extensions / Nice-to-Haves (Blue-Booking)**

These features are explicitly **deferred** from the MVP to reduce scope risk. They are documented here to preserve the design intent for v2.0, ensuring that current architectural decisions do not preclude them.

### **9.1 The "Hacking" Minigame \[v2\]**

* **Concept:** A visual puzzle representing cyber-warfare or magical lock-picking, utilizing the Graph engine logic.18  
* **Design:**  
  * **Input:** GM sets "Security Rating" (Difficulty).  
  * **Mechanics:** A network graph of "Server Nodes". Player must trace a path from Entry to Data Core without triggering "ICE" nodes (alarms).  
  * **Action:** Player spends "Processing Cycles" (Resource from Base Table) to reveal hidden nodes or suppress alarms.  
  * **Output:** Success grants access to a specific **Knowledge Node** (adding tag to Character Knowledge).  
* **Prerequisite:** Robust Graph interactions (Phase 1\) and Knowledge System (Phase 3).

### **9.2 The "Negotiation" Minigame \[v2\]**

* **Concept:** Social combat tracked like a health bar, inspired by *Draw Steel* and *Blades in the Dark*.20  
* **Design:**  
  * **Input:** NPC "Patience" (HP) and "Interest" (Threshold).  
  * **Mechanics:** "Card-based" or "Move-based" dialogue. Player selects approach (Intimidate, Flatter, Logic).  
  * **Resolution:** Compare Player Skill vs NPC Resistance. Success lowers Patience or raises Interest.  
  * **Output:** If Interest \> Threshold before Patience \< 0, NPC agrees to deal. Updates **Reputation Table**.

### **9.3 The "Research" Workflow**

* **Concept:** Long-term project tracking (Blades in the Dark style clocks).22  
* **Design:**  
  * **UI:** A circular progress bar on a Graph Node.  
  * **Mechanic:** Players allocate "Downtime Actions" to fill segments.  
  * **Output:** When full, unlocks a new Graph Node or Document.

## ---

**10\. Operational & Technical Standards**

### **10.1 Quality Assurance**

* **Unit Tests:** Required for all CRDT merge logic and Conflict Resolution helpers. *Reasoning:* These are the most mathematically complex parts of the system and prone to regression.  
* **Integration Tests:** Required for the RAG pipeline (e.g., "Ensure Character A cannot query Secret B").  
* **Performance:** Graph must render 500+ nodes at 60fps. Sync latency \< 200ms.

### **10.2 Security \[v2\]**

* **Auth:** OAuth2 via Discord/Google.  
* **Role Enforcement:** Server-side validation of all CRDT operations (e.g., if User is Player, reject writes to locked: true nodes). Even though Yjs is P2P-friendly, the Server acts as the gatekeeper.  
* **Data Isolation:** Campaign data strictly segregated by CampaignID in Postgres RLS (Row Level Security) to prevent cross-campaign leakage.

**(End of PROJECT\_BRIEF\_v2.md)**

# ---

**ADDENDUM: Deep Technical Detail (Appendix to Brief)**

The following sections provide the exhaustive technical detail required to implement the decisions outlined above, serving as the Engineering Handbook for the development team.

## **A1. Detailed Data Schema: The Lifepath Graph**

To ensure the Yjs implementation is robust, we define the exact property schema for every entity type. This schema is critical for type safety in the collaborative environment.

### **A1.1 Node Properties (Extended)**

Every node in the nodes Y.Map follows this Typescript interface structure:

TypeScript

interface GraphNode {  
  // Core Identity  
  id: string; // UUID v4  
  type: 'actor' | 'faction' | 'location' | 'event' | 'item' | 'clue';  
  created\_at: number; // Unix timestamp  
  created\_by: string; // UserID

  // Visuals  
  label: Y.Text; // Collaborative text object for real-time label editing  
  x: number;  
  y: number;  
  width?: number; // Optional, default 100  
  height?: number; // Optional, default 50  
  color: string; // Hex code  
  icon?: string; // URL to SVG/PNG  
  style\_variant: 'default' | 'outline' | 'ghost' | 'highlighted';

  // Logic & State  
  locked: boolean; // If true, requires GM permission to move  
  hidden: boolean; // Fog of War: if true, invisible to Players  
    
  // Metadata (Flexible Payload)  
  meta: {  
    description?: string;  
    foundry\_uuid?: string; // Link to VTT entity  
    tags: string;  
    hp\_current?: number; // For Actors  
    hp\_max?: number;  
    faction\_allegiance?: string; // ID of Faction Node  
  }  
}

### **A1.2 Edge Properties (Extended)**

Edges are stored in a Y.Array to allow ordering (though order rarely matters for graphs, it helps with Z-indexing rendering).

TypeScript

interface GraphEdge {  
  id: string;  
  source\_id: string;  
  target\_id: string;  
    
  // Semantic Relationship  
  relation\_label: string; // e.g., "Hates", "Owns", "Located In"  
  type: 'directional' | 'bi-directional' | 'undirected';  
    
  // Visuals  
  weight: number; // Line thickness (1-5)  
  style: 'solid' | 'dashed' | 'dotted';  
  color: string;  
    
  // Logic  
  hidden: boolean;  
}

## **A2. GraphRAG Implementation Details**

The GraphRAG system combines Vector Search with Graph Traversal. This section details the hybrid retrieval algorithm.9

### **A2.1 The Retrieval Algorithm (Pseudocode)**

Python

def retrieve\_knowledge(user\_query, user\_role, character\_id):  
    \# Step 1: Identify Access Scope  
    allowed\_scopes \= \["public"\]  
    if user\_role \== "GM":  
        allowed\_scopes.append("gm\_secret")  
    else:  
        \# Fetch character specific knowledge from SQL/Postgres  
        char\_knowledge \= db.get\_knowledge\_tags(character\_id)  
        allowed\_scopes.extend(char\_knowledge)

    \# Step 2: Vector Embedding of Query  
    query\_vector \= embedding\_model.encode(user\_query)

    \# Step 3: Vector Search with Pre-Filtering  
    \# Using Pinecone/Milvus syntax to filter BEFORE similarity search  
    results \= vector\_db.query(  
        vector=query\_vector,  
        top\_k=20,  
        filter\={  
            "access\_scope": {"$in": allowed\_scopes}  
        }  
    )

    \# Step 4: Reranking (Optional but recommended)  
    \# Rerank results based on exact keyword matches or entity links  
    reranked\_results \= cross\_encoder.rank(user\_query, results)

    \# Step 5: Context Assembly  
    context\_text \= "\\n".join(\[r.text for r in reranked\_results\[:5\]\])

    \# Step 6: LLM Generation  
    prompt \= f"""  
    You are an AI Lorekeeper. Answer the query based ONLY on the context provided.  
    If the answer is not in the context, state "You do not recall any information about that."  
      
    Context:  
    {context\_text}  
      
    Query: {user\_query}  
    """  
      
    return llm.generate(prompt)

### **A2.2 Knowledge Propagation**

When a "Parent" node (e.g., a Faction) is unlocked, how does knowledge flow?

* **Decision:** Knowledge is **Node-Atomic**. Unlocking a Faction Node does *not* automatically unlock all its Member Nodes.  
* **Reasoning:** Prevents accidental spoilers. Players might know the "Thieves Guild" exists without knowing "The Innkeeper" is a member.  
* **GM Tool:** The UI must provide a "Cascade Unlock" feature: "Unlock this node and all direct children?" for convenience.

## **A3. Synchronization Protocol: Detailed Steps**

This section breaks down the handshake between the Foundry Module and the Web App.

### **A3.1 The "Handshake"**

1. **GM launches Foundry VTT.**  
2. **Module Startup:** plane-shift-bridge module initializes.  
3. **Auth:** Module sends API Key to PlaneShift Server POST /api/bridge/auth.  
4. **Connection:** Server validates key, upgrades connection to WebSocket (separate channel from Yjs graph sync).  
5. **State Check:**  
   * Module sends checksum of critical actors.  
   * Server compares with DB.  
   * If mismatch, Server requests specific Entity IDs.

### **A3.2 The "Push" (Foundry \-\> Web)**

Trigger: GM modifies Actor HP in Foundry.

1. **Hook:** Hooks.on('updateActor', (actor, data) \=\> {... })  
2. **Filter:** Check if actor is tracked (in the synced\_actors list).  
3. **Payload Construction:**  
   JSON  
   {  
     "event": "update\_entity",  
     "type": "actor",  
     "foundry\_id": "8d9a8s9d",  
     "changes": {  
       "system.attributes.hp.value": 45  
     },  
     "timestamp": 1678889222  
   }

4. **Transmission:** Send via WebSocket.  
5. **Ingestion:** PlaneShift Server receives payload \-\> updates SQL DB \-\> Updates Y.Doc (if applicable) \-\> Broadcasts to web clients.

### **A3.3 The "Pull" (Web \-\> Foundry)**

Trigger: Player updates Inventory in Web App.

1. **Web Client:** Yjs update propagates to Server.  
2. **Server Hook:** Server detects change in mapped field.  
3. **Forwarding:** Server pushes payload to Foundry Bridge Socket.  
   JSON  
   {  
     "command": "update\_actor",  
     "id": "8d9a8s9d",  
     "data": { "items": \[...new inventory... \] }  
   }

4. **Execution:** Foundry Module receives command \-\> calls actor.update(data).  
5. **Feedback:** Foundry sends back "Success" or "Error" (e.g., Actor locked).

## **A4. Manual Fallback Runbook**

**Scenario:** The WebSocket bridge is down. The campaign starts in 10 minutes.

### **A4.1 Pre-Session Import**

1. **GM Action:** Open PlaneShift Web App.  
2. **Navigate:** Campaign Settings \-\> **"Import from Foundry JSON"**.  
3. **Upload:** Select the actors.json file exported from Foundry (via "Export Data" on the Actors directory).  
4. **Processing:**  
   * System reads all Actor entries.  
   * Updates HP, AC, XP, and Inventory for any actor where name matches a Node Label.  
   * **Safeguard:** If a Node is locked in PlaneShift, the import skips it unless "Force Overwrite" is checked.  
5. **Result:** Web App reflects current stats for the session start.

### **A4.2 Post-Session Export**

1. **GM Action:** Navigate Campaign Settings \-\> **"Export to Foundry"**.  
2. **Selection:** Choose "Session Notes" and "New NPCs".  
3. **Download:** Gets session\_export\_2023-10-27.zip.  
4. **Foundry Action:**  
   * Unzip file.  
   * Use "Adventure Importer" or drag-and-drop JSONs into a Compendium.  
5. **Result:** Session notes and new NPCs created in PlaneShift are now available in VTT for the next session.

## **A5. Edge Case Analysis: Sync Conflicts**

Detailed rules for the "Edge Cases" mentioned in Section 6.4.

**Case 1: The Offline Divergence**

* **Situation:** Player A is offline for 2 weeks and writes 10 journal entries. Meanwhile, the GM renames the location those entries reference.  
* **Resolution:**  
  1. Player A reconnects.  
  2. Local Yjs Doc attempts to merge.  
  3. **Reference Check:** The "Location ID" links remain valid (UUIDs don't change), so the journals link to the *new* name correctly.  
  4. **Content Conflict:** If Player A edited the *Description* of the Location, and GM also edited it:  
     * Text Merge (Y.Text) occurs. Result is likely a garbled mix of both sentences.  
     * **Detection:** System detects high "edit distance" collision.  
     * **Flagging:** The Location Node is marked "Review Needed". GM sees both versions side-by-side in the "Conflict Queue".

**Case 2: The "Permission Race"**

* **Situation:** GM toggles a Node to hidden: true. 500ms later, Player A attempts to move that Node.  
* **Resolution:**  
  1. GM's hidden: true operation propagates.  
  2. Player's "Move" operation arrives at Server.  
  3. **Server Validation:** Server checks current state. Node is Hidden.  
  4. **Rejection:** Server rejects the "Move" op.  
  5. **Client Correction:** Player A's client receives the "Hidden" update. The node vanishes. The "Move" is effectively voided.

**Case 3: The "Inventory Overfill"**

* **Situation:** Player A adds "Plate Armor" in Web App. Player A also adds "Plate Armor" in Foundry (forgot they were syncing).  
* **Resolution:**  
  1. Foundry syncs "+1 Plate Armor".  
  2. Web App syncs "+1 Plate Armor".  
  3. **Result:** Character now has 2 Plate Armors.  
  4. **Fix:** This is a logical duplicate, not a data conflict. The system allows it. The player must manually delete one. (System does not assume duplicates are errors).

## **A6. Performance Targets & Limits**

To ensure the "Exhaustive" nature of this report, we define the scaling limits.

1. **Graph Complexity:**  
   * Tested up to **1,000 Nodes** and **2,500 Edges** without rendering lag (Target: 60fps on modern Desktop).  
   * Canvas renderer: HTML5 Canvas (2D Context) or WebGL (Pixi.js) if node count \> 500\. *Decision: Start with React-Flow (DOM based) for ease of MVP. If perf drops \> 300 nodes, migrate to Pixi.js.*  
2. **Concurrent Users:**  
   * Target: **10 active editors** (typical D\&D group size \+ observers).  
   * Hard Limit: **50 users** (beyond this, Yjs broadcast traffic might saturate standard WebSocket bandwidth without optimizations).  
3. **Storage:**  
   * Vector Store: Up to 10,000 text chunks (approx 5MB text) included in standard tier.  
   * Asset Storage: Images capped at 5MB per upload. Total campaign storage 1GB.

## **A7. Accessibility & UI Standards**

* **Color Blindness:** All semantic colors (Red/Green for Reputation) must be accompanied by Icons (Up Arrow/Down Arrow) or Text Labels.  
* **Contrast:** UI must pass WCAG AA standards.  
* **Input Methods:** Graph must be navigable via Keyboard (Tab to cycle nodes, Arrow keys to pan).

**(End of Addendum)**

# ---

**Note to Developers**

This document (PROJECT\_BRIEF\_v2.md) serves as the authoritative source of truth for the PlaneShift engineering effort. Any deviation from the **Authoritative Decisions** (Section 1\) or **Conflict Policies** (Section 6\) requires a formal Request for Comment (RFC) and sign-off from the Lead Architect. The preservation of the "Blue-booking" features in Section 9 is intentional to guide architectural modularity, even though those features are not in the MVP build pipeline. Implement the **Lifepath Graph** first.

### **References & Research Basis**

* **CRDT/Yjs:** Selected based on performance metrics against Automerge and proven offline-first capabilities.1  
* **Foundry V11+:** Architecture adapted for LevelDB constraints, necessitating the API-based bridge over direct file access.6  
* **GraphRAG:** Access control pattern derived from "Metadata Filtering" best practices in vector search.3  
* **Conflict Resolution:** Strategy aligns with "Last-Write-Wins" for scalar data and "Manual Merge" for complex semantic collisions, a standard pattern in distributed data systems.4

#### **Works cited**

1. Building real-time collaboration applications: OT vs CRDT \- TinyMCE, accessed on January 24, 2026, [https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)  
2. Building Collaborative Interfaces: Operational Transforms vs. CRDTs \- DEV Community, accessed on January 24, 2026, [https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)  
3. RAG with Access Control \- Pinecone, accessed on January 24, 2026, [https://www.pinecone.io/learn/rag-access-control/](https://www.pinecone.io/learn/rag-access-control/)  
4. Offline vs. Real-Time Sync: Managing Data Conflicts | Adalo Blog, accessed on January 24, 2026, [https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts)  
5. Conflict Resolution in Real-Time Collaborative Editing \- Hoverify, accessed on January 24, 2026, [https://tryhoverify.com/blog/conflict-resolution-in-real-time-collaborative-editing/](https://tryhoverify.com/blog/conflict-resolution-in-real-time-collaborative-editing/)  
6. Version 11 Content Packaging Changes | Foundry Virtual Tabletop, accessed on January 24, 2026, [https://foundryvtt.com/article/v11-leveldb-packs/](https://foundryvtt.com/article/v11-leveldb-packs/)  
7. Diagram Visualization With JavaScript \- yWorks, accessed on January 24, 2026, [https://www.yworks.com/pages/diagram-visualization-with-javascript](https://www.yworks.com/pages/diagram-visualization-with-javascript)  
8. accessed on January 24, 2026, [https://news.ycombinator.com/item?id=40976731\#:\~:text=Automerge%20stores%20the%20entire%20history,Yjs%20for%20large%20text%20documents.](https://news.ycombinator.com/item?id=40976731#:~:text=Automerge%20stores%20the%20entire%20history,Yjs%20for%20large%20text%20documents.)  
9. How does applying boolean filters or metadata-based pre-filtering alongside vector similarity search influence the overall query performance? \- Milvus, accessed on January 24, 2026, [https://milvus.io/ai-quick-reference/how-does-applying-boolean-filters-or-metadatabased-prefiltering-alongside-vector-similarity-search-influence-the-overall-query-performance](https://milvus.io/ai-quick-reference/how-does-applying-boolean-filters-or-metadatabased-prefiltering-alongside-vector-similarity-search-influence-the-overall-query-performance)  
10. A Design Guide for Building Offline First Apps \- Hasura, accessed on January 24, 2026, [https://hasura.io/blog/design-guide-to-offline-first-apps](https://hasura.io/blog/design-guide-to-offline-first-apps)  
11. Collaborators Visualization & Conflict Prevention | Altium Designer Technical Documentation, accessed on January 24, 2026, [https://www.altium.com/documentation/altium-designer/collaborators-visualization-conflict-prevention](https://www.altium.com/documentation/altium-designer/collaborators-visualization-conflict-prevention)  
12. Y.UndoManager \- Yjs Docs, accessed on January 24, 2026, [https://docs.yjs.dev/api/undo-manager](https://docs.yjs.dev/api/undo-manager)  
13. Automerge: A library of data structures for building collaborative applications | Hacker News, accessed on January 24, 2026, [https://news.ycombinator.com/item?id=40976731](https://news.ycombinator.com/item?id=40976731)  
14. Any sheets for tracking factions? : r/rpg \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/rpg/comments/kgbrff/any\_sheets\_for\_tracking\_factions/](https://www.reddit.com/r/rpg/comments/kgbrff/any_sheets_for_tracking_factions/)  
15. Offline-First Mobile App Architecture: Syncing, Caching, and Conflict Resolution, accessed on January 24, 2026, [https://dev.to/odunayo\_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-518n](https://dev.to/odunayo_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-518n)  
16. 04\. template.json \- Foundry VTT Community Wiki, accessed on January 24, 2026, [https://foundryvtt.wiki/en/development/guides/SD-tutorial/SD04-templatejson](https://foundryvtt.wiki/en/development/guides/SD-tutorial/SD04-templatejson)  
17. How can you export worlds? : r/FoundryVTT \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/FoundryVTT/comments/m17lol/how\_can\_you\_export\_worlds/](https://www.reddit.com/r/FoundryVTT/comments/m17lol/how_can_you_export_worlds/)  
18. Computer Hacking in RPGs \- A Knight at the Opera, accessed on January 24, 2026, [https://knightattheopera.blogspot.com/2022/08/computer-hacking-in-rpgs.html](https://knightattheopera.blogspot.com/2022/08/computer-hacking-in-rpgs.html)  
19. Need a quick "Hacking" minigame : r/rpg \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/rpg/comments/1jal0o/need\_a\_quick\_hacking\_minigame/](https://www.reddit.com/r/rpg/comments/1jal0o/need_a_quick_hacking_minigame/)  
20. Negotiation in TTRPGs : r/rpg \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/rpg/comments/kxvasp/negotiation\_in\_ttrpgs/](https://www.reddit.com/r/rpg/comments/kxvasp/negotiation_in_ttrpgs/)  
21. Social Mechanic System \- Draw Steel : r/Solo\_Roleplaying \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/Solo\_Roleplaying/comments/1qkpm0g/social\_mechanic\_system\_draw\_steel/](https://www.reddit.com/r/Solo_Roleplaying/comments/1qkpm0g/social_mechanic_system_draw_steel/)  
22. Progress Clocks | Blades in the Dark RPG, accessed on January 24, 2026, [https://bladesinthedark.com/progress-clocks](https://bladesinthedark.com/progress-clocks)  
23. Foundry LevelDB : r/FoundryVTT \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/FoundryVTT/comments/17swx98/foundry\_leveldb/](https://www.reddit.com/r/FoundryVTT/comments/17swx98/foundry_leveldb/)  
24. Authorizing access to data with RAG implementations | AWS Security Blog, accessed on January 24, 2026, [https://aws.amazon.com/blogs/security/authorizing-access-to-data-with-rag-implementations/](https://aws.amazon.com/blogs/security/authorizing-access-to-data-with-rag-implementations/)