# **Architecting the Psychohistory Engine: A Comprehensive Technical and Design Framework for AI-Augmented Traveller Campaigns**

## **1\. Executive Summary**

### **1.1 The Vision of Parallel Narrative**

The convergence of tabletop role-playing games (TTRPGs) and Large Language Models (LLMs) offers a paradigm shift in how campaigns are prepared and executed. The proposed project—a suite of AI-enabled tools for a _Mongoose Traveller 2nd Edition_ campaign—represents a move from static "digital character sheets" to a dynamic, "Parallel Narrative" engine. In this model, the Game Master (Referee) does not merely retrieve information; they co-create with a system that understands the lore, tracks the geopolitical simulation, and generates valid narrative extensions in real-time.

The _Pirates of Drinax_ campaign, with its sandbox nature and empire-building mechanics, is the ideal testbed for this architecture. By drawing inspiration from Isaac Asimov’s _Foundation_ series, specifically the concept of Psychohistory, we can elevate the campaign from a series of skirmishes to a simulation of sociological and economic trends. The tools proposed herein will act as the "Prime Radiant"—the device used by Hari Seldon to visualize the future—allowing the Referee to see not just where the players are, but where the universe is heading.

### **1.2 Architectural Thesis: The Hybrid Command Center**

While _Foundry VTT_ is a robust platform for tactical visualization, its architecture is inherently insular, relying on local databases and client-side processing that resists external integration. To satisfy the requirement for "advanced vibe coding" (rapid, modern web development) and "heavy AI API usage," this report argues against building complex logic _inside_ Foundry.

Instead, we propose a **Hybrid Command Center Architecture**. The core logic, simulation engine, and narrative processors will reside in a custom, external web application (built on a modern stack like Next.js and Python/FastAPI). This "Command Center" will serve as the single source of truth for the campaign's state—tracking base construction, faction turns, and character relationships. _Foundry VTT_ will be relegated to a "Viewer" role: a high-fidelity display engine for tactical combat and dungeon crawling, updated dynamically by the Command Center via the _Highport_ API.1

This separation of concerns allows for the development of rich, collaborative features—such as the "Lifepath Graph" and "Offline Text Quests"—without the constraints of the VTT’s legacy code structure. It enables a "Blue-Booking" style of play where the game continues asynchronously on mobile devices during the week, synchronizing with the VTT for the Friday night session.

## ---

**2\. Platform Strategy and Technical Architecture**

### **2.1 Critical Assessment of Foundry VTT**

For a _Traveller_ campaign, the choice of Virtual Tabletop (VTT) is pivotal. _Foundry VTT_ is currently the market leader for self-hosted, highly customizable play. However, for a project intending to leverage "heavy AI APIs" and external web apps, it presents specific challenges.

**Strengths:**

- **Tactical Fidelity:** Foundry excels at dynamic lighting, fog of war, and tactical movement. For _Traveller’s_ boarding actions or planetary explorations, this visual feedback is superior to abstract "theater of the mind".2
- **System Implementation:** The _Mongoose Traveller 2e_ system for Foundry (currently in beta) provides necessary automation for dice rolls and character sheet management, handling the specific 2d6 mechanics and effect chains.3
- **Ecosystem:** Modules like _Monk’s Active Tile Triggers_ allow for local automation within a scene.4

**Weaknesses & Constraints:**

- **Data Siloing:** Foundry stores data in embedded databases (NeDB/LevelDB) on the host machine. Accessing this data from an external "AI Tool" requires either direct file system parsing (risky while the server is running) or a dedicated API bridge.5
- **Closed Loop:** Foundry is designed as a synchronous experience. It does not natively support "offline" play where a player might update their inventory or base stats from a mobile web app while the server is down.
- **UI Limitations:** While Foundry’s UI is customizable, building complex management dashboards (like a _SimCity_\-style base builder for Drinax) inside its Handlebars/HTML/CSS framework is significantly slower and more restrictive than building a React-based web app.2

### **2.2 The "Headless" Integration Strategy**

To resolve these constraints, we propose a **Sidecar Architecture**. The "Command Center" web app is the master controller, and Foundry is the specialized client.

**The Tech Stack:**

- **Frontend (The "Datapad"):** Built with **Next.js (React)**. This allows for rapid development ("vibe coding") of complex interfaces like the Character Graph and Base Manager. It is mobile-responsive, enabling the "offline" play requirement.
- **Backend (The "Psychohistory Core"):** A **Python (FastAPI)** service. Python is the native language of AI. This service handles:
  - **Orchestration:** Calls to OpenAI/Anthropic/DeepSeek APIs.
  - **Simulation:** Running the _Stars Without Number_ faction logic.
  - **Data Persistence:** A **Supabase (PostgreSQL)** database that stores the "True State" of the campaign.
- **The Bridge (API Layer):** We utilize the **Highport** module for Foundry VTT. _Highport_ exposes a REST API that allows external applications to query and update Foundry data (Actors, Items, Journals).1

**Operational Workflow:**

1. **Sync Down:** When a session starts, the Command Center pushes the latest "Offline Play" results (e.g., items gained, wounds taken) to Foundry via _Highport_.
2. **Play Session:** Tactical combat happens in Foundry.
3. **Sync Up:** At the end of the session, the Command Center pulls the updated Actor data and Chat Logs from Foundry to update its internal simulation state.

| Feature             | Foundry VTT (Native)   | Command Center (Custom Web App) | Integration Method        |
| :------------------ | :--------------------- | :------------------------------ | :------------------------ |
| **Tactical Combat** | Primary Engine         | None                            | N/A                       |
| **Character Sheet** | Display / Rolling      | Creation / Management / AI      | Sync via Highport API     |
| **Narrative Gen**   | Basic Chat Macros      | Advanced RAG / LLM Co-Pilot     | Injection via Chat API    |
| **Base Building**   | Static Journal Entries | Interactive Dashboard           | Read-Only View in Journal |
| **Offline Play**    | Impossible             | Primary Interface               | Asynchronous State Update |

## ---

**3\. The "Parallel Narrative" AI Engine**

### **3.1 Concept: The AI as Co-Pilot, Not Autopilot**

The user request emphasizes a "parallel" process where the human retains control. This distinguishes the system from "AI GMs" that attempt to run the game autonomously. Here, the AI acts as a **Contextual Augmenter**.

This requires a sophisticated implementation of **Retrieval-Augmented Generation (RAG)**. The AI cannot simply "make things up"; it must generate content that is consistent with the established _Traveller_ lore, the _Pirates of Drinax_ campaign specifics, and the history of the player group.

### **3.2 The Knowledge Graph Architecture**

Standard RAG (vector search) often fails at maintaining relationships (e.g., remembering that NPC X hates NPC Y). To support the "Foundation" level of political complexity, we recommend a **GraphRAG** approach.7

**Implementation:**

- **Ingestion:** The _Pirates of Drinax_ PDFs, _Traveller Core Rulebook_, and _High Guard_ are ingested.
- **Graph Construction:** The system builds a Knowledge Graph (using Neo4j or a graph-structured SQL schema) where nodes represent **Entities** (Planets, NPCs, Ships, Factions) and edges represent **Relationships** (Controls, At War With, Trade Route).
  - _Example Node:_ Planet: Theev
  - _Example Edge:_ Theev \--(HAS_TRAIT)--\> Pirate Haven
  - _Example Edge:_ Widow (NPC) \--(RULES)--\> Theev

**The "Co-Pilot" Workflow:**

1. **Trigger:** The GM types a partial sentence: _"The players approach the Widow's fortress..."_
2. **Retrieval:** The AI queries the Graph. It sees:
   - The Widow is paranoid.
   - The players have a "Standing" of \-2 with the Widow (from previous sessions).
   - Theev has a "High Law Level" locally within the fortress.
3. **Augmentation:** The AI injects a suggested description into the editor:
   - _Suggestion:_ "...Sensors detect active targeting locks from hidden defense batteries (Tech Level 12). A comms channel opens, audio only, voice distorted. 'The Widow does not welcome debts unpaid, Captain. Hold position or be fired upon.'"
4. **Human Review:** The GM can accept, edit, or reject this suggestion.

### **3.3 Prompt Engineering Strategy: The "Three-Mode" System**

To support the user's request for different levels of AI intervention ("augment," "revise," "autonomous"), the UI should offer a "Mode Toggle" for the narrative engine.

1. **Mode 1: The Editor (Augment):**
   - _Input:_ "Bar scene. Smoky. Alien contact in corner."
   - _Prompt:_ "Expand the following shorthand into a descriptive paragraph suitable for a Sci-Fi Noir setting. Use sensory details. Maintain the user's core facts."
   - _Output:_ "The air in the rec-deck is recycled and stale, hanging heavy with blue smoke from herbal cigarettes. In the far corner, obscured by the haze, a solitary Hiver manipulates a datapad with restless limbs..."
2. **Mode 2: The Consultant (Suggest):**
   - _Input:_ "I need a plot hook for this planet. It's an Industrial world."
   - _Prompt:_ "Based on the UWP code Industrial and the current campaign phase Restoration of Drinax, suggest three plot hooks involving labor unions, resource scarcity, or ancient Sindalian tech."
   - _Output:_ "1. A wildcat strike has paralyzed the orbital docks; the strikers demand off-world water imports. 2\. A factory AI has uncovered a Sindalian encryption key..."
3. **Mode 3: The Director (Autonomous):**
   - _Input:_ "Generate a random space encounter."
   - _Prompt:_ "Consult the _Traveller_ encounter tables. Roll a result. Generate the ship details, captain's name, and immediate intent. Calculate the relative naval strength compared to the players' _Harrier_."
   - _Output:_ "Encounter: Imperial Customs Cutter. Captain: Lt. Vane. Intent: Routine Inspection. Threat Level: Low (unless contraband is found)."

## ---

**4\. Module 1: The Collaborative Character Creation "Minigame"**

### **4.1 The Traveller Lifepath as a Network Graph**

_Traveller’s_ character creation is unique: it is a procedural minigame where players roll through 4-year "Terms" of service (Navy, Scout, Merchant, etc.). A key mechanic is the **Connection Rule**: if two players link their events, they gain a Skill benefit.9 This is often done ad-hoc; the proposed tool will systematize it into a visual, collaborative game.

**Design Concept:** The interface is a shared, real-time "Mind Map" (powered by React Flow or D3.js 11).

- **Nodes:** Each "Term" for each player is a node (e.g., "Player A \- Term 1 \- Navy").
- **Edges:** Events are potential edges.
- **Visuals:** As players roll their terms, nodes appear. When an "Event" is rolled (e.g., "Involved in a mutiny"), the node pulses.

### **4.2 The "Connection" Gameplay Loop**

1. **Simultaneous Terms:** All players roll Term 1 simultaneously. The App displays their Events on the shared screen.
2. **AI Matchmaking:** The AI analyzes the events semantic similarity.
   - _Player A Event:_ "Space battle with pirates."
   - _Player B Event:_ "Ship damaged by raiders."
   - _AI Suggestion:_ "Probability Match: 85%. Suggestion: Player A's Navy patrol arrived to rescue Player B's merchant ship from the same pirate attack."
3. **Linkage:** If players accept the link, they draw a line between nodes. The App automatically adds the "Connection Skill" to their character sheet JSON.

### **4.3 Data Structure for Export**

To ensure these characters are usable in Foundry, the Command Center must maintain a strict Actor Schema that maps to the _Mongoose 2e_ system fields.

**Actor Schema (JSON Snippet):**

JSON

{  
 "name": "Captain Jali",  
 "species": "Human",  
 "characteristics": {  
 "strength": 8,  
 "dexterity": 9,  
 "endurance": 7,  
 "intellect": 10,  
 "education": 8,  
 "social_standing": 11  
 },  
 "history":,  
 "skills": {  
 "Gun Combat": { "level": 1, "specialty": "Slug" },  
 "Pilot": { "level": 2, "specialty": "Small Craft" }  
 }  
}

The App allows export of this JSON, which is then pushed to Foundry via the Actor.create() method in the _Highport_ API.

## ---

**5\. Module 2: The "Psychohistory" Engine (World Simulation)**

### **5.1 Adapting Asimov’s Psychohistory**

In _Foundation_, Psychohistory uses statistical mechanics to predict the fall of empires. In this RPG context, we will implement this as a **Faction Turn Simulation** running in the background. This transforms the campaign from a static setting to a living universe.

**The Mechanics:** We adapt the _Stars Without Number_ (SWN) faction rules 12, which are highly compatible with _Traveller’s_ hex-map structure.

- **Factions:** The Kingdom of Drinax, Aslan Hierate, Imperial Navy, GeDeCo Corporation, The Pirate Lords.
- **Stats:** Force (Military), Cunning (Espionage), Wealth (Economic).
- **Assets:** Specific units (e.g., "Strike Fleet," "Spy Network," "Trade Monopoly").

### **5.2 The Turn Algorithm**

Between sessions, the GM clicks "Process Turn" in the Command Center. The Python backend executes the following logic:

1. **Goal Selection:** Each faction has an AI-driven goal (e.g., "Expand Borders," "Accumulate Wealth").
2. **Move Resolution:** Factions deploy Assets.
   - _Example:_ The Aslan Hierate uses a "Colonial Fleet" (Force 6\) to attack a "Drinaxian Outpost" (Force 2).
   - _Calculation:_ The AI rolls 2d6 \+ Stat vs. Difficulty.
3. **The "News Feed" Generator:** The AI translates the abstract turn result into a narrative news blurb for the players.
   - _Result:_ Aslan Success.
   - _Generated News:_ "Subsector Alert: Ihatei squatters have seized control of the comms buoy in the Pourne system. Trade traffic is advised to reroute."

### **5.3 Trade Route & Economic Simulation**

A key part of _Traveller_ is trade. The system should automate the _PyRoute_ trade logic.13

- **WTN (World Trade Number):** Calculated from UWP Population and Tech Level.
- **BTN (Bilateral Trade Number):** Calculated between every pair of systems within Jump-2 range.
- **Visualization:** The Command Center renders a "Trade Map" overlay. Thick lines indicate high-volume routes (High BTN).
  - _Gameplay Use:_ Players use this map to hunt for piracy targets. "The route between Theev and Palindrome has a BTN of 5.0—high traffic, low law. We hunt there."

### **5.4 The "Seldon Crisis" Dashboard**

To visualize the "Foundation" theme, the dashboard includes a **Probability Graph**.

- **Metric:** "Probability of Kingdom Restoration."
- **Inputs:** Number of Allied Systems, Total Fleet Strength, Economic Output (RU).
- **Visual:** A line graph that fluctuates based on player actions and faction turns. If the line drops below a threshold (e.g., 20%), a "Seldon Crisis" (a major scripted event) is triggered by the AI to shake up the campaign.

## ---

**6\. Module 3: The "Blue-Booking" Engine (Offline Play)**

### **6.1 Concept: Asynchronous Text Quests**

The user referenced _Space Rangers_, a game famous for its text-based adventures that blend narrative with logic puzzles and resource management.15 In a TTRPG context, this allows players to pursue side goals (research, training, minor trading) during the week without the GM's direct supervision.

**Use Cases:**

- **The Broker:** Spending 3 days on a station haggling for cargo prices.
- **The Spy:** Infiltrating a corporate database (a logic puzzle minigame).
- **The Engineer:** Repairing the Jump Drive (a resource management minigame).

### **6.2 The "Space Rangers" Logic Adaptation**

_Space Rangers_ quests are not simple branching trees; they are **State Machines**. They track variables like Time, Health, Money, and Reputation.

**Technical Implementation:** We utilize **Ink (inkjs)** for the narrative scripting logic 17, wrapped in the Next.js app.

- **State Management:** The Ink engine tracks variables.
  - VAR time_remaining \= 10
  - VAR guard_alertness \= 0
- **The AI Layer:** The LLM does not write the logic (which must be fair and consistent); it writes the **Flavor Text**.
  - _Ink Logic:_ Player chooses "Bribe Guard". Roll vs. Streetwise. Success.
  - _Ink Output:_ "Bribe Successful. Cost 50cr."
  - _LLM Decoration:_ "You slide the credit chip across the sticky bar counter. The guard grunts, checking the amount with a skeptical eye before nodding toward the service hatch. 'Didn't see you, spacer.'"

### **6.3 Mechanics of "Taking Time"**

The user requested mechanics where actions "take time" while travelling.

- **Jump Space Integration:** A jump takes 1 week (168 hours). This is the perfect window for Blue-Booking.
- **The Loop:**
  1. **Jump Start:** GM initiates Jump in Foundry.
  2. **Notification:** Players receive a push notification on the Web App: "Jump Initiated. 168 Hours available."
  3. **Action Selection:** Players select "Activities" (Training, Repair, Research).
  4. **Text Quest:** If "Research" is chosen, the player enters a text quest to dig through the ship's library.
  5. **Cost:** Each step in the quest consumes hours. When hours \== 0, the quest locks until arrival.

### **6.4 Mini-Game Examples**

- **The Encryption Puzzle (Hacking):** A simple "Mastermind" style game (guess the sequence of 4 colors) implemented in React. Success grants a narrative clue or credit code.15
- **The Trade Deal:** A "High-Low" game where the player tries to guess the merchant's reserve price based on AI-generated dialogue clues (tone analysis).

## ---

**7\. Module 4: Drinaxian Logistics (Base Building & Management)**

### **7.1 The Ruleset Challenge**

_Pirates of Drinax_ involves managing a "Pocket Empire." The rules for this in the _Drinaxian Companion_ and _High Guard_ can be complex, involving calculations of "Resource Units" (RU) and "Person-Weeks of Heavy Work" (PWH).20

**The "House Ruled" Standard:** The research indicates contradictions in published PWH costs (e.g., Underground Construction listed as 25 PWH/ton in text but 500 PWH/ton in examples).20

- **Recommendation:** The software must enforce a consistent standard. We recommend adopting the **Example Values** (Higher Cost) to prevent the campaign from becoming too easy.
  - _Surface Structure:_ 300 PWH/dt.
  - _Underground:_ 500 PWH/dt.

### **7.2 The Base Building Dashboard**

This module serves as the "SimCity" interface for the players.

- **Visual Interface:** A top-down grid view of the Floating Palace or captured asteroid bases.
- **Modules:** Players drag-and-drop modules (e.g., "Defense Battery," "Luxury Suites," "Hydroponics").
- **Cost Calculator:** The app automatically calculates the PWH and RU cost based on the selected module's tonnage and the "House Ruled" standard.
  - _Input:_ 100 dTon Hangar.
  - _Calc:_ ![][image1].
  - _Time:_ With 50 workers, time \= ![][image2].

### **7.3 Asset Tracking and Piracy ROI**

To answer the user's need for "believable characters" and "links to events," the asset tracker monitors the **Human Terrain** of the base.

- **Crew Manifest:** Every crew member has a name, generated by the AI, and a "Morale" stat.
- **Piracy ROI Calculator:** When players return with loot, the tool calculates the "Net Profit" after repairs, crew shares, and Drinaxian Tithes.
  - _Mechanic:_ Implementing the _Drinax_ "share system" (e.g., 50% to ship/maintenance, 50% to crew).
  - _AI Analysis:_ If the players skimp on the crew share, the AI flags a "Mutiny Risk" event for the next Faction Turn.

### **7.4 Faction Standing Matrix**

The campaign hinges on balancing the Imperium and the Aslan Hierate.

- **The Dashboard:** A visual radar chart showing "Standing" with all major factions (-10 to \+10).
- **Dynamic Updates:**
  - _Event:_ Players destroy an Imperial convoy.
  - _Input:_ GM logs "Destruction of Imperial Commerce Raider" in the Command Center.
  - _Logic:_ Imperium_Standing \-= 2, Aslan_Standing \+= 1, Drinax_Standing \+= 1\.
  - _AI Prediction:_ "Warning: Imperium Standing is now \-8 ('Enemy of the State'). Probability of Subsector Fleet Intervention: 90%."

## ---

**8\. Technical Implementation & Data Integration**

### **8.1 Database Schema (Supabase/PostgreSQL)**

To support the interconnected nature of these tools, a relational database is essential.

**Table: actors**

| Column      | Type   | Description                  |
| :---------- | :----- | :--------------------------- |
| id          | UUID   | Primary Key                  |
| foundry_id  | String | Link to Foundry Actor ID     |
| name        | String | Character Name               |
| attributes  | JSONB  | STR, DEX, END, INT, EDU, SOC |
| skills      | JSONB  | Skill list and levels        |
| inventory   | JSONB  | List of item UUIDs           |
| connections | JSONB  | Graph edges to other actors  |

**Table: world_state (Psychohistory)**

| Column        | Type    | Description                                    |
| :------------ | :------ | :--------------------------------------------- |
| id            | UUID    | Primary Key                                    |
| turn_number   | Integer | Current Faction Turn                           |
| factions      | JSONB   | Current stats (Force, Cunning, Wealth)         |
| planet_states | JSONB   | Map of System IDs to current controller/status |
| chaos_metric  | Float   | The "Seldon Crisis" probability                |

### **8.2 API Endpoints (FastAPI)**

**1\. The "Narrative Injection" Endpoint**

- **Method:** POST /api/ai/narrate
- **Input:** { "context": "Players enter Theev", "mode": "augment" }
- **Process:**
  1. Retrieve "Theev" lore from Vector DB (RAG).
  2. Retrieve Player Standing with "Theev Pirates" from SQL.
  3. Construct Prompt.
  4. Call OpenAI API.
- **Output:** { "text": "The airlock hisses open..." }

**2\. The "Foundry Sync" Endpoint**

- **Method:** POST /api/sync/to-foundry
- **Process:**
  1. Fetch latest actors from SQL.
  2. Loop through actors.
  3. Call Highport API: PUT {foundry_url}/api/actor/{foundry_id} with updated Inventory/Bio.

### **8.3 The AI Stack: Latency and Cost Optimization**

- **Models:**
  - **Orchestration/Logic:** GPT-4o or Claude 3.5 Sonnet for complex reasoning (Faction Turns, Narrative Augmentation).
  - **Flavor Text:** GPT-4o-mini or Claude 3 Haiku for high-volume, low-stakes text (Text Quest descriptions) to save cost.
- **Caching:**
  - _Planet Descriptions:_ Static descriptions (e.g., physical geography) should be generated once and cached in Redis/Supabase. Only "dynamic" descriptions (e.g., current crowd mood) need real-time generation.
- **Vector DB:** Use **pgvector** within Supabase to keep the tech stack consolidated. This avoids the need for a separate Pinecone/Weaviate instance.

## ---

**9\. Campaign Playflow: Putting It All Together**

### **9.1 Phase 1: Pre-Campaign (Session 0\)**

- **Tool:** The "Lifepath Graph" Web App.
- **Action:** Players join a lobby. They roll terms on their phones. The main screen shows the growing network of connections. The AI suggests links.
- **Result:** A fully populated database of characters with deep lore connections, synced to Foundry as Actors.

### **9.2 Phase 2: The Weekly Cycle (Asynchronous)**

- **Day 1-4 (The Jump):** Players receive a notification. They log into the "Blue-Book" app.
  - _Player A_ plays a "Repair" minigame to fix the Jump Drive (logic puzzle).
  - _Player B_ engages in a text dialogue with a captured prisoner (AI Persona).
- **Day 5 (The Turn):** The GM runs the "Psychohistory" simulation. The AI processes faction moves and generates a "News Feed."
- **Day 6 (Prep):** The GM uses the "Co-Pilot" editor to draft scenes for the upcoming session, using RAG to pull in details about the destination system.

### **9.3 Phase 3: The Session (Synchronous)**

- **Friday Night:** Players log into Foundry VTT.
- **Sync:** The Command Center pushes the results of the week's "Blue-Booking" (items, info, health) to the Foundry sheets.
- **Play:** Tactical combat and roleplay occur in Foundry. The GM uses the "Co-Pilot" sidebar to generate descriptions on the fly.
- **End:** Session logs are exported/parsed back to the Command Center to update the "World State."

## ---

**10\. Conclusion and Recommendation**

The ambition to run a _Foundation_\-inspired _Pirates of Drinax_ campaign requires tools that go beyond standard character sheets. By adopting a **Hybrid Command Center** architecture, you leverage the best of both worlds: _Foundry VTT_ for its tactical excellence, and a modern, AI-enhanced web stack for the "Psychohistory" simulation and narrative depth.

This approach transforms the "Work" of the GM—tracking economics, faction moves, and lore consistency—into the "Play" of the AI. The system handles the inertia of the galaxy, allowing you and your players to focus on the moments that change it.

### **Action Plan**

1. **Week 1:** Set up the Next.js/Supabase skeleton and build the UWP Parser.
2. **Week 2:** Implement the "Lifepath Graph" using D3.js.
3. **Week 3:** Build the Python Faction Turn engine using _Stars Without Number_ rules.
4. **Week 4:** Deploy _Highport_ and build the Foundry Sync bridge.

This roadmap ensures that even as you build, you have usable tools (Character Creator, then World Map, then Simulation) ready for your campaign.

#### **Works cited**

1. cclloyd/highport: A REST API for FoundryVTT \- GitHub, accessed on January 24, 2026, [https://github.com/cclloyd/highport](https://github.com/cclloyd/highport)
2. Traveller for FoundryVTT \- Gaming Chronicles, accessed on January 24, 2026, [https://blog.notasnark.net/2024/07/traveller-for-foundryvtt.html](https://blog.notasnark.net/2024/07/traveller-for-foundryvtt.html)
3. Mongoose Traveller 2e | Foundry Virtual Tabletop, accessed on January 24, 2026, [https://foundryvtt.com/packages/mgt2e](https://foundryvtt.com/packages/mgt2e)
4. Mongoose Traveller 2e \- Any suggestions for modules to use? : r/FoundryVTT \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/FoundryVTT/comments/192ttds/mongoose_traveller_2e_any_suggestions_for_modules/](https://www.reddit.com/r/FoundryVTT/comments/192ttds/mongoose_traveller_2e_any_suggestions_for_modules/)
5. Are there any Tools / Workflows that push content into FoundryVTT via API? \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/FoundryVTT/comments/1msh7a9/are_there_any_tools_workflows_that_push_content/](https://www.reddit.com/r/FoundryVTT/comments/1msh7a9/are_there_any_tools_workflows_that_push_content/)
6. Introducing Highport, a REST Api for FoundryVTT. \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/FoundryVTT/comments/1m4yshx/introducing_highport_a_rest_api_for_foundryvtt/](https://www.reddit.com/r/FoundryVTT/comments/1m4yshx/introducing_highport_a_rest_api_for_foundryvtt/)
7. From RAG to GraphRAG: Knowledge Graphs, Ontologies and Smarter AI \- GoodData, accessed on January 24, 2026, [https://www.gooddata.com/blog/from-rag-to-graphrag-knowledge-graphs-ontologies-and-smarter-ai/](https://www.gooddata.com/blog/from-rag-to-graphrag-knowledge-graphs-ontologies-and-smarter-ai/)
8. Enhancing RAG-based application accuracy by constructing and leveraging knowledge graphs \- LangChain Blog, accessed on January 24, 2026, [https://blog.langchain.com/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs/](https://blog.langchain.com/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs/)
9. Character Generation CheckList \- Mongoose Publishing Forum, accessed on January 24, 2026, [https://forum.mongoosepublishing.com/threads/character-generation-checklist.48749/](https://forum.mongoosepublishing.com/threads/character-generation-checklist.48749/)
10. Pre-Career education and the Connections Rule \- Mongoose Publishing Forum, accessed on January 24, 2026, [https://forum.mongoosepublishing.com/threads/pre-career-education-and-the-connections-rule.114179/](https://forum.mongoosepublishing.com/threads/pre-career-education-and-the-connections-rule.114179/)
11. d3-force | D3 by Observable \- D3.js, accessed on January 24, 2026, [https://d3js.org/d3-force](https://d3js.org/d3-force)
12. Faction Turn Flowchart for SWN | PDF | Entertainment | Gaming, accessed on January 24, 2026, [https://www.scribd.com/document/683641295/Stars-Without-Number-Turn-Flowchart](https://www.scribd.com/document/683641295/Stars-Without-Number-Turn-Flowchart)
13. makhidkarun/traveller_pyroute: Traveller trade route ... \- GitHub, accessed on January 24, 2026, [https://github.com/makhidkarun/traveller_pyroute](https://github.com/makhidkarun/traveller_pyroute)
14. What are the best trade routes in Traveller in 1105? \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/traveller/comments/1maqnkz/what_are_the_best_trade_routes_in_traveller_in/](https://www.reddit.com/r/traveller/comments/1maqnkz/what_are_the_best_trade_routes_in_traveller_in/)
15. Guide :: Guide for all textbased planetary ... \- Steam Community, accessed on January 24, 2026, [https://steamcommunity.com/sharedfiles/filedetails/?id=3484784064](https://steamcommunity.com/sharedfiles/filedetails/?id=3484784064)
16. Weekly /r/Games Game Discussion \- Space Rangers 2: Dominators \- Reddit, accessed on January 24, 2026, [https://www.reddit.com/r/Games/comments/392cqp/weekly_rgames_game_discussion_space_rangers_2/](https://www.reddit.com/r/Games/comments/392cqp/weekly_rgames_game_discussion_space_rangers_2/)
17. Chapter 5: Variables and Logic – Creating Playable Stories with Ink and Inky, accessed on January 24, 2026, [https://pressbooks.library.torontomu.ca/playablestoriesink/chapter/chapter-5-variables-and-logic/](https://pressbooks.library.torontomu.ca/playablestoriesink/chapter/chapter-5-variables-and-logic/)
18. Teach Me How to Ink — Lesson 4 — Lists and the Dungeon of Functions \- YouTube, accessed on January 24, 2026, [https://www.youtube.com/watch?v=\_XlyShbWpGc](https://www.youtube.com/watch?v=_XlyShbWpGc)
19. Space Rangers 2 Text Quest solutions. \- Stardock Forums, accessed on January 24, 2026, [https://forums.stardock.com/479758/space-rangers-2-text-quest-solutions](https://forums.stardock.com/479758/space-rangers-2-text-quest-solutions)
20. Drinaxian Companion Errors | Mongoose Publishing, accessed on January 24, 2026, [https://forum.mongoosepublishing.com/threads/drinaxian-companion-errors.123021/](https://forum.mongoosepublishing.com/threads/drinaxian-companion-errors.123021/)

[image1]: data:image/png;base64,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
[image2]: data:image/png;base64,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
