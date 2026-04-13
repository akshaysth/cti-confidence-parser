# CTI Confidence Parser - Feature Roadmap

A comprehensive tracker for potential new features, enhancements, and improvements to the CTI Confidence Parser application.

---

## 📋 Feature Categories

- 🎯 **Core Analysis** - Core WEL detection and analysis features
- 🤖 **AI Enhancements** - LLM-powered intelligent features
- 📊 **Data & Export** - Export formats, integrations, and data handling
- 👥 **Collaboration** - Team features and sharing
- 🎨 **UI/UX** - Interface improvements and quality of life
- 🔒 **Security** - Enterprise and security-focused features

---

## 🎯 Core Analysis Features

### 1. WEL Consistency Analysis
**Status:** 🔮 Planned | **Priority:** High | **Effort:** Medium

Detect when multiple WEL phrases in the same document suggest conflicting confidence levels.

**User Value:** Helps analysts identify logical inconsistencies in their assessments.

**Implementation Notes:**
- Compare kentRange values across all matches
- Flag when tiers differ by more than 1 level for related concepts
- Add "Consistency Report" panel in ResultsDashboard
- Highlight contradictions with warning icons

**Mock Output:**
```
⚠️ Consistency Warning: "certain" (97%) and "likely" (65%) used 
   to describe related assessments without justification
```

---

### 2. Comparison Mode
**Status:** 🔮 Planned | **Priority:** High | **Effort:** High

Side-by-side diff view showing WEL changes between two analysis sessions.

**User Value:** Track how confidence evolved from draft to final report.

**Implementation Notes:**
- Add "Compare" button to HistoryPanel
- New route/view for comparison
- Show added/removed/changed WEL terms
- Color-code changes (green=added, red=removed, yellow=changed)

**Dependencies:**
- Requires storing sourceText in database (currently not saved)

---

### 3. Bulk Analysis / Watch Folder
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** High

Process multiple documents in batch with progress tracking.

**User Value:** Analysts often need to process many reports at once.

**Implementation Notes:**
- Add file drop zone supporting multiple files
- Queue system for processing
- Aggregate results view showing summary across all docs
- Export combined results

**UI Components:**
- Batch upload area
- Progress bar with queue status
- Results table with per-document stats

---

### 4. WEL Heatmap Visualization
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Visual representation of WEL distribution across documents.

**User Value:** Quick visual assessment of confidence patterns.

**Implementation Notes:**
- Use existing Recharts dependency
- Charts to include:
  - Pie chart: Distribution by tier
  - Bar chart: Confidence distribution
  - Timeline: If dates extracted from text
- Add new tab in WorkspaceView for "Visualizations"

---

## 🤖 AI Enhancements

### 5. Smart WEL Suggestions
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Suggest new WEL phrases when model detects potential candidates not in database.

**User Value:** Expand WEL database based on real usage.

**Implementation Notes:**
- When model confidence is high but phrase not in WEL_DATABASE
- Use embeddings to find semantic similarity to known WEL terms
- Show suggestion banner: "Add 'presumably' as WEL term?"
- Requires embedding model or simple string similarity

---

### 6. Reasoning Quality Score
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Low

Evaluate if the text provides evidence supporting the confidence level.

**User Value:** Helps analysts improve their justification quality.

**Implementation Notes:**
- Additional LLM call after WEL detection
- Prompt: "Does this sentence provide evidence for the confidence stated?"
- Score: 1-5 or Good/Fair/Poor
- Display as badge on WELCard

---

### 7. Extract Intelligence Claims
**Status:** 🔮 Planned | **Priority:** High | **Effort:** High

Beyond WEL detection, extract structured intelligence claims.

**User Value:** Transform unstructured reports into actionable intelligence.

**Implementation Notes:**
- New analysis mode: "Claim Extraction"
- Output structured as:
  ```json
  {
    "claim": "APT29 will target healthcare sector",
    "confidence": "probable",
    "timeframe": "next 6 months",
    "evidence": ["observed reconnaissance", "historical pattern"],
    "source_references": ["report section 3.2"]
  }
  ```
- Requires more sophisticated LLM prompting
- New export format for structured claims

---

## 📊 Data & Export Features

### 8. Enhanced Export Formats
**Status:** 🔮 Planned | **Priority:** High | **Effort:** Low

Currently only exports JSON. Add multiple formats.

**Formats to Add:**
- [ ] **Markdown** - Formatted report with highlights
- [ ] **CSV** - Spreadsheet-friendly data
- [ ] **STIX 2.1** - Threat intelligence standard format
- [ ] **MISP** - Direct integration with MISP platforms
- [ ] **PDF Report** - Professional formatted output

**Implementation Notes:**
- Add format selector dropdown in export button
- Use libraries: papaparse (CSV), jsPDF (PDF)

---

### 9. MITRE ATT&CK Integration
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Validate and link MITRE ATT&CK technique tags.

**Implementation Notes:**
- Technique ID validation (T1234 format)
- Auto-complete for technique names
- Link to attack.mitre.org pages
- Suggest techniques based on text context using LLM

**UI Changes:**
- Enhanced tag input with autocomplete
- Technique preview card on hover

---

### 10. Analysis Templates
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** Medium

Save and reuse analysis configurations.

**Implementation Notes:**
- Save common model settings as templates
- Pre-defined templates for different analysis types:
  - "Quick Scan" (fast, lower accuracy)
  - "Deep Analysis" (thorough, higher accuracy)
  - "Custom Organization" (user-defined)

---

## 👥 Collaboration Features

### 11. Team Collaboration
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** High

Share analysis sessions and collaborate in real-time.

**Features:**
- [ ] Share analysis via unique URL
- [ ] Real-time collaborative annotations (WebSocket)
- [ ] Threaded comments on specific WEL matches
- [ ] User presence indicators

**Implementation Notes:**
- Requires backend with WebSocket support
- User authentication system
- Permission model (view/comment/edit)

---

### 12. Review Workflow
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** High

Multi-stage review process for intelligence reports.

**Workflow:**
1. Analyst runs analysis
2. Peer reviewer adds comments
3. Approver signs off
4. Final report generated with audit trail

---

## 🎨 UI/UX Enhancements

### 13. Keyboard Shortcuts
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Low

Full keyboard navigation support.

**Shortcuts to Implement:**
| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Enter` | Analyze |
| `j` / `k` | Navigate between matches |
| `n` | Create note on selected match |
| `e` | Export results |
| `f` | Focus search/filter |
| `?` | Show shortcut help |
| `Esc` | Close modal/cancel |

**Implementation:**
- Add keyboard event listeners in App.tsx
- Shortcut help modal

---

### 14. Advanced Search & Filter
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Filter and search within analysis results.

**Filters:**
- By tier (Certain, Probable, etc.)
- By model confidence range
- By validation status (confirmed/rejected/error)
- Full-text search in sentences

**UI:**
- Filter bar above results
- Search input with autocomplete
- Filter chips showing active filters

---

### 15. Auto-Save & Recovery
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Never lose work due to crashes.

**Implementation:**
- Auto-save draft notes every 30 seconds
- Save analysis state to sessionStorage
- Recovery dialog on app load
- Clear auto-saves on explicit save

---

### 16. Context Expansion
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** Low

View more context around detected matches.

**Features:**
- Click to expand paragraph view
- Show +/- 500 characters around match
- Collapse back to sentence view

---

### 17. Dark Mode
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** Low

Toggle between light and dark themes.

**Implementation:**
- Theme toggle in header
- CSS variables for colors
- Respect system preference
- Persist preference in localStorage

**Note:** Design system already supports dark colors via tokens.

---

### 18. Onboarding Tour
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** Low

First-time user guide.

**Features:**
- Step-by-step tour highlighting features
- Sample document for first analysis
- Tutorial tooltips
- "What's this?" help icons

---

## 🔒 Security & Enterprise Features

### 19. PII Detection & Redaction
**Status:** 🔮 Planned | **Priority:** High | **Effort:** Medium

Scan for and handle sensitive information.

**Implementation:**
- Regex patterns for common PII (emails, phones, SSNs, etc.)
- Optional: LLM-based PII detection
- Pre-analysis warning with redaction options
- Automatic redaction in exports

---

### 20. Classification Labels
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Low

Handle classified documents appropriately.

**Features:**
- Dropdown for classification level
  - UNCLASSIFIED
  - CONFIDENTIAL
  - SECRET
  - TOP SECRET
- Watermark exports with classification
- Warning banners in UI
- Automatic handling caveats (NOFORN, etc.)

---

### 21. Audit Logging
**Status:** 🔮 Planned | **Priority:** Medium | **Effort:** Medium

Track all actions for compliance.

**Logged Events:**
- Analysis created
- Note saved/edited/deleted
- Export generated
- Settings changed
- Historical analysis accessed

**Implementation:**
- Audit log table in SQLite
- Viewable audit trail in UI
- Export for compliance reviews

---

### 22. SAML/SSO Authentication
**Status:** 🔮 Planned | **Priority:** Low | **Effort:** High

Enterprise authentication integration.

**Providers:**
- SAML 2.0
- OAuth 2.0 (Google, Microsoft)
- LDAP/Active Directory

---

## 🐛 Bug Fixes

See [BUGS.md](./BUGS.md) for existing bugs. High priority fixes:

1. **Session Notes Lost on History Load** (Critical) - Fixed in App.tsx
2. **Sequential API Calls** (Medium) - Now uses Promise.all
3. **No Error Handling in dbClient** (Medium) - Added response.ok checks

---

## 📈 Success Metrics

Track these metrics to prioritize features:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis Speed | < 2s per match | Timing logs |
| User Retention | 70% return weekly | Session tracking |
| Export Usage | 50% of sessions | Event logging |
| Error Rate | < 1% | Error boundary tracking |

---

## 🗓️ Release Planning

### v0.2.0 - Core Enhancements
- [ ] Enhanced Export Formats (Markdown, CSV)
- [ ] Keyboard Shortcuts
- [ ] Advanced Search & Filter
- [ ] Bug fixes from BUGS.md

### v0.3.0 - Analysis Power
- [ ] WEL Consistency Analysis
- [ ] Context Expansion
- [ ] Auto-Save & Recovery
- [ ] MITRE ATT&CK Integration

### v0.4.0 - Visualization
- [ ] WEL Heatmap Visualization
- [ ] Comparison Mode
- [ ] Dark Mode
- [ ] Onboarding Tour

### v0.5.0 - Enterprise
- [ ] PII Detection & Redaction
- [ ] Classification Labels
- [ ] Audit Logging
- [ ] Analysis Templates

### v1.0.0 - Collaboration
- [ ] Team Collaboration
- [ ] Real-time Annotations
- [ ] SSO Authentication
- [ ] Review Workflow

---

## 🤝 Contributing

To propose a new feature:
1. Check if it exists in this document
2. Open an issue with the `feature-request` label
3. Include:
   - User story
   - Expected behavior
   - Mockups (if applicable)
   - Priority suggestion

---

## 📝 Changelog

| Date | Changes |
|------|---------|
| 2025-04-13 | Initial feature roadmap created |

---

*Last updated: April 13, 2025*
