
# Singapore Government Tender Finder - Implementation Plan

## Project Overview

Build a web application that helps users discover government tenders in Singapore by sector. The app uses Mino.ai browser automation agents to search multiple tender websites in parallel, showing live browser previews and real-time results.

## Architecture

```text
+----------------------------------------------------------+
|                    USER INTERFACE                         |
|              (React + Tailwind + Orange/White Theme)      |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|                   SECTOR SELECTION                        |
|    [IT] [Construction] [Healthcare] [Consulting]          |
|         [Logistics] [Education]                           |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|               SUPABASE EDGE FUNCTION                      |
|                (mino-tender-search)                       |
|                                                           |
|  - Receives sector selection                              |
|  - Spawns 7 parallel Mino agents via SSE                  |
|  - Streams status updates back to frontend                |
+----------------------------------------------------------+
            |           |           |           |
            v           v           v           v
    +----------+  +----------+  +----------+  +----------+
    | Mino     |  | Mino     |  | Mino     |  | Mino     |
    | Agent 1  |  | Agent 2  |  | Agent 3  |  | Agent 4  |
    | gebiz    |  | tenders  |  | biddetail|  | ...      |
    +----------+  +----------+  +----------+  +----------+
                            |
                            v
+----------------------------------------------------------+
|              RESULTS + COMPARE DASHBOARD                  |
|  - Real-time tender cards                                 |
|  - Selection checkboxes                                   |
|  - Compare button (always visible)                        |
|  - Side-by-side comparison modal                          |
+----------------------------------------------------------+
```

## Key Features

1. **Sector Selection Page**: 6 clickable sector icons with labels
2. **Parallel Agent Search**: 7 Mino agents running simultaneously
3. **Live Browser Previews**: Grid of preview cards showing agent progress
4. **Real-time Results**: Tenders appear below as they are found
5. **Compare Functionality**: Select multiple tenders and compare side-by-side
6. **Orange/White Theme**: Custom color scheme with Tiny Fish branding

## Implementation Details

### Phase 1: Setup and Configuration

#### 1.1 Enable Lovable Cloud
- Required for storing the Mino API key securely
- Will store `MINO_API_KEY` as an environment variable

#### 1.2 Create Edge Function
- **File**: `supabase/functions/mino-tender-search/index.ts`
- Handles SSE streaming from Mino.ai API
- Spawns parallel agents for all 7 tender URLs
- Returns tender results as they are found

### Phase 2: Design System Updates

#### 2.1 Color Theme (Orange/White)
Update CSS variables in `src/index.css`:
- Primary: Orange (`24 95% 53%`) 
- Background: White (`0 0% 100%`)
- Accent colors for selected states
- Success/Status indicators

### Phase 3: Component Structure

#### 3.1 New Files to Create

```text
src/
  components/
    tender/
      SectorSelector.tsx       # Icon grid for sector selection
      SectorIcon.tsx           # Individual sector icon component
      AgentPreviewGrid.tsx     # Grid of live browser previews
      AgentPreviewCard.tsx     # Single agent preview card
      TenderResultsList.tsx    # List of found tenders
      TenderResultCard.tsx     # Individual tender card (selectable)
      CompareButton.tsx        # Floating compare button
      CompareModal.tsx         # Side-by-side comparison dialog
      Header.tsx               # App header with branding
  hooks/
    useTenderSearch.ts         # Main search orchestration hook
  lib/
    api/
      mino.ts                  # Mino API client functions
  types/
    tender.ts                  # TypeScript interfaces
  pages/
    Index.tsx                  # Main application page (updated)
```

#### 3.2 Component Descriptions

**SectorSelector.tsx**
- 6 sector icons in a responsive grid (2x3 on mobile, 3x2 on desktop)
- Icons: Monitor (IT), HardHat (Construction), Heart (Healthcare), Briefcase (Consulting), Truck (Logistics), GraduationCap (Education)
- Click triggers search with selected sector

**AgentPreviewGrid.tsx**
- 7 cards displayed in a grid layout
- Each card shows:
  - Website name/URL
  - Live browser iframe preview (from Mino streamingUrl)
  - Current status message
  - Loading/searching/complete indicator
- Cards auto-hide when their agent completes

**TenderResultCard.tsx**
- Clickable card to select for comparison
- Displays all tender fields:
  - Tender Title, ID, Issuing Authority
  - Country/Region, Tender Type
  - Publication Date, Submission Deadline
  - Status, Official URL
  - Brief Description, Eligibility, Category
- Visual selection state (orange border when selected)

**CompareModal.tsx**
- Full-screen dialog for comparing selected tenders
- Side-by-side table layout
- Highlights differences between tenders
- "Powered by Tiny Fish Web Agent" footer

### Phase 4: Edge Function Implementation

#### 4.1 Mino Integration Edge Function

The edge function will:
1. Accept sector parameter from frontend
2. Build the goal prompt with sector-specific search terms
3. Launch 7 parallel Mino agent requests
4. Aggregate SSE streams and forward to frontend
5. Parse and normalize tender results

**Tender Source URLs:**
1. https://www.gebiz.gov.sg/
2. https://www.tendersontime.com/singapore-tenders/
3. https://www.biddetail.com/singapore-tenders
4. https://www.tendersinfo.com/global-singapore-tenders.php
5. https://www.globaltenders.com/government-tenders-singapore
6. https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=menu
7. https://www.tenderboard.biz/vendor/tender-opportunities/

**Goal Prompt Template:**
```text
TASK: Extract tenders in Singapore for the field of {SECTOR}.

RULES:
1) Focus only on relevant tender information for {SECTOR}
2) Stay on the page and minimize navigation
3) Open links only to read detailed information
4) Be fast and efficient
5) Find tenders with upcoming deadlines

Return JSON:
{
  "tenderdetails": [
    {
      "Tender Title": "...",
      "Tender ID": "...",
      "Issuing Authority": "...",
      "Country / Region": "...",
      "Tender Type": "...",
      "Publication Date": "...",
      "Submission Deadline": "...",
      "Tender Status": "...",
      "Official Tender URL": "...",
      "Brief Description": "...",
      "Eligibility Criteria": "...",
      "Industry / Category": "..."
    }
  ]
}
```

### Phase 5: State Management and Hooks

#### 5.1 useTenderSearch Hook

```typescript
interface UseTenderSearchReturn {
  // State
  isSearching: boolean;
  agents: AgentState[];        // 7 agents with status/preview
  tenders: Tender[];           // Found tenders
  selectedTenders: Set<string>; // Selected for comparison
  
  // Actions
  startSearch: (sector: Sector) => void;
  toggleTenderSelection: (tenderId: string) => void;
  clearSelection: () => void;
}
```

### Phase 6: User Experience Flow

1. **Landing Page**: User sees header + 6 sector icons
2. **Select Sector**: User clicks an icon (e.g., "Healthcare")
3. **Agents Launch**: 7 preview cards appear in grid, showing live browser sessions
4. **Results Stream In**: As tenders are found, they appear below with "Scroll down to see results" message
5. **Agents Complete**: Preview cards fade out/collapse when done
6. **Selection**: User clicks anywhere on tender cards to select (orange border appears)
7. **Compare**: User clicks "Compare Selected" button
8. **Modal**: Side-by-side comparison opens
9. **Reset**: User can return to sector selection

### Phase 7: Visual Design Specifications

**Color Palette:**
- Primary Orange: `#f97316` (Tailwind orange-500)
- Light Orange: `#fed7aa` (Tailwind orange-200)
- Background: Pure white `#ffffff`
- Text: Dark gray `#1f2937`
- Borders: Light gray `#e5e7eb`
- Success: Green `#22c55e`
- Selected: Orange border + light orange background

**Branding:**
- Header: "Tiny Fish" logo/text + "Government Tender Finder"
- Footer in compare modal: "Powered by Tiny Fish Web Agent"
- Fish icon or wave graphic element

### Technical Considerations

1. **API Key Security**: Mino API key stored as Supabase secret, only accessed in edge function
2. **SSE Handling**: Frontend uses EventSource or fetch with ReadableStream
3. **Error Handling**: Graceful degradation if some agents fail
4. **Performance**: Agents run in parallel, results stream in real-time
5. **Mobile Responsive**: Grid adapts to screen size
6. **Accessibility**: Proper ARIA labels, keyboard navigation

### Dependencies to Install

- `framer-motion` - For smooth animations (preview cards, selection states)

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/index.css` | Modify | Add orange theme colors |
| `src/pages/Index.tsx` | Modify | Main app layout |
| `src/types/tender.ts` | Create | TypeScript interfaces |
| `src/lib/api/mino.ts` | Create | Mino API client |
| `src/hooks/useTenderSearch.ts` | Create | Search orchestration |
| `src/components/tender/SectorSelector.tsx` | Create | Sector icon grid |
| `src/components/tender/SectorIcon.tsx` | Create | Individual sector icon |
| `src/components/tender/AgentPreviewGrid.tsx` | Create | Live preview grid |
| `src/components/tender/AgentPreviewCard.tsx` | Create | Single preview card |
| `src/components/tender/TenderResultsList.tsx` | Create | Results list |
| `src/components/tender/TenderResultCard.tsx` | Create | Tender card |
| `src/components/tender/CompareButton.tsx` | Create | Compare action button |
| `src/components/tender/CompareModal.tsx` | Create | Comparison dialog |
| `src/components/tender/Header.tsx` | Create | App header |
| `supabase/functions/mino-tender-search/index.ts` | Create | Edge function |

