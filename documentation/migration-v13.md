# Coffee Pub Crier - FoundryVTT v13 Migration Plan

> **Status:** Planning Phase  
> **Target Version:** v13.0.0  
> **Current Version:** v12.1.3  
> **Last Updated:** 2025-01-XX

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Audit](#pre-migration-audit)
3. [Migration Tasks](#migration-tasks)
4. [Testing Strategy](#testing-strategy)
5. [Risk Assessment](#risk-assessment)
6. [Timeline](#timeline)
7. [Resources](#resources)

---

## Overview

### Module Summary

**Coffee Pub Crier** is a FoundryVTT module that enhances combat turn announcements with rich visual and audio features. The module:
- Posts turn and round cards to chat when combat changes occur
- Integrates with Coffee Pub Blacksmith for shared resources
- Uses Handlebars templates for card rendering
- Modifies chat messages via `renderChatMessage` hook
- Tracks combat state and initiative

### Migration Scope

This migration plan addresses the three major v13 breaking changes:
1. **jQuery Removal** - Convert jQuery selectors and DOM manipulation to native DOM APIs
2. **Font Awesome Migration** - Update FA5 class prefixes to FA6 equivalents
3. **Hook Parameter Changes** - Ensure `html` parameters are handled as native DOM elements

**Note:** This module does NOT use `getSceneControlButtons`, so that breaking change does not apply.

---

## Pre-Migration Audit

### Current Codebase Analysis

#### ✅ Files Reviewed
- `scripts/crier.js` (1,424 lines)
- `scripts/settings.js` (414 lines)
- `scripts/common.js` (38 lines)
- `templates/turns.hbs` (150 lines)
- `templates/rounds.hbs` (6 lines)
- `styles/module.css` (1,440+ lines)

#### 🔍 Issues Found

**1. jQuery Usage (1 instance)**
- **Location:** `scripts/crier.js:632`
- **Code:** `msgb.append(missedIcon, ' ', missedName, ' ', missedText);`
- **Issue:** Uses jQuery `.append()` method
- **Fix:** Convert to native DOM `appendChild()` or `append()` (native method)

**2. Font Awesome 5 Class Prefixes (7 instances)**
- **Templates:**
  - `templates/turns.hbs:6` - `<i class="fas {{turnIconStyle}}">`
  - `templates/turns.hbs:52` - `<i class="fas fa-solid fa-skull">` (mixed FA5/FA6)
  - `templates/turns.hbs:112` - `<i class="fas {{turnIconStyle}}">`
  - `templates/turns.hbs:134` - `<i class="fas {{turnIconStyle}}">`
- **JavaScript:**
  - `scripts/crier.js:584` - `icon.classList.add('fas', strRoundIcon);`
  - `scripts/crier.js:729` - `<i class="fas fa-fire"></i>`
- **CSS Selectors:**
  - `styles/module.css:910` - `#crier-cards-wrapper-cardsdark .fas`
  - `styles/module.css:1052` - `#crier-cards-wrapper-cardsred .fas`
  - `styles/module.css:1195` - `#crier-cards-wrapper-cardsgreen .fas`
  - `styles/module.css:1338` - `#crier-cards-wrapper-cardsblue .fas`
- **Issue:** FA5 `fas` prefix will fail in v13
- **Fix:** Update to FA6 `fa-solid` prefix

**3. Hook Parameter Handling (Potential Issue)**
- **Location:** `scripts/crier.js:656`
- **Code:** `function chatMessageEvent(cm, [html], _options)`
- **Issue:** The destructuring `[html]` suggests the hook may receive an array or jQuery object
- **Fix:** Add jQuery detection pattern per migration-global.md Pattern 10

**4. Module Configuration**
- **Current:** `module.json` specifies `"minimum": "12"`
- **Fix:** Update to `"minimum": "13.0.0"` and version to `"13.0.0"`

#### ✅ No Issues Found
- No `getSceneControlButtons` hooks (not applicable)
- No Font Awesome 5 family references in CSS (good)
- No deprecated `Token#target` usage
- No deprecated `FilePicker` usage
- Hooks properly registered via BlacksmithHookManager (good)

---

## Migration Tasks

### Phase 1: Module Configuration

#### Task 1.1: Update module.json
**Priority:** Critical  
**Estimated Time:** 5 minutes

**Changes:**
```json
{
  "version": "13.0.0",
  "compatibility": {
    "minimum": "13.0.0",
    "verified": "13.0.0",
    "maximum": "14"
  }
}
```

**Files:**
- `module.json`

**Validation:**
- [ ] Module loads in FoundryVTT v13
- [ ] No compatibility warnings

---

### Phase 2: jQuery Removal

#### Task 2.1: Fix jQuery `.append()` Usage
**Priority:** Critical  
**Estimated Time:** 10 minutes

**Location:** `scripts/crier.js:632`

**Current Code:**
```javascript
msgb.append(missedIcon, ' ', missedName, ' ', missedText);
```

**Fixed Code:**
```javascript
// Native DOM append() method (supports multiple arguments)
msgb.append(missedIcon, ' ', missedName, ' ', missedText);
// OR if append() not available, use:
// msgb.appendChild(missedIcon);
// msgb.appendChild(document.createTextNode(' '));
// msgb.appendChild(missedName);
// msgb.appendChild(document.createTextNode(' '));
// msgb.appendChild(missedText);
```

**Note:** Native DOM `append()` method supports multiple arguments, so this may work as-is. Verify in v13.

**Files:**
- `scripts/crier.js`

**Validation:**
- [ ] Missed turn messages render correctly
- [ ] No console errors

---

#### Task 2.2: Add jQuery Detection for Hook Parameters
**Priority:** High  
**Estimated Time:** 15 minutes

**Location:** `scripts/crier.js:656` - `chatMessageEvent` function

**Current Code:**
```javascript
function chatMessageEvent(cm, [html], _options) {
    const isGM = game.user.isGM;
    const cmd = getDocData(cm);
    const flags = cmd.flags?.[MODULE.ID];
    // ... rest of function
}
```

**Fixed Code:**
```javascript
function chatMessageEvent(cm, html, _options) {
    // v13: Detect and convert jQuery to native DOM if needed
    let nativeHtml = html;
    if (html && (html.jquery || typeof html.find === 'function')) {
        nativeHtml = html[0] || html.get?.(0) || html;
    }
    
    // If html was an array, extract first element
    if (Array.isArray(nativeHtml)) {
        nativeHtml = nativeHtml[0] || nativeHtml;
    }
    
    const isGM = game.user.isGM;
    const cmd = getDocData(cm);
    const flags = cmd.flags?.[MODULE.ID];
    
    // Use nativeHtml for all DOM operations
    const main = nativeHtml.closest('[data-message-id]');
    nativeHtml?.classList.add('crier', 'coffee-pub');
    // ... rest of function using nativeHtml
}
```

**Files:**
- `scripts/crier.js`

**Validation:**
- [ ] Chat messages render correctly
- [ ] No `querySelector is not a function` errors
- [ ] Turn cards display properly
- [ ] Round cards display properly

---

### Phase 3: Font Awesome Migration

#### Task 3.1: Update Font Awesome Class Prefixes in Templates
**Priority:** Critical  
**Estimated Time:** 15 minutes

**Location:** `templates/turns.hbs`

**Changes:**
1. Line 6: `<i class="fas {{turnIconStyle}}">` → `<i class="fa-solid {{turnIconStyle}}">`
2. Line 52: `<i class="fas fa-solid fa-skull">` → `<i class="fa-solid fa-skull">` (remove duplicate `fas`)
3. Line 112: `<i class="fas {{turnIconStyle}}">` → `<i class="fa-solid {{turnIconStyle}}">`
4. Line 134: `<i class="fas {{turnIconStyle}}">` → `<i class="fa-solid {{turnIconStyle}}">`

**Files:**
- `templates/turns.hbs`

**Validation:**
- [ ] All icons render correctly in turn cards
- [ ] No missing icons
- [ ] Icon styling matches v12 appearance

---

#### Task 3.2: Update Font Awesome Class Prefixes in JavaScript
**Priority:** Critical  
**Estimated Time:** 10 minutes

**Location:** `scripts/crier.js`

**Changes:**
1. Line 584: `icon.classList.add('fas', strRoundIcon);` → `icon.classList.add('fa-solid', strRoundIcon);`
2. Line 729: `<i class="fas fa-fire"></i>` → `<i class="fa-solid fa-fire"></i>`

**Files:**
- `scripts/crier.js`

**Validation:**
- [ ] Round icons render correctly
- [ ] Missed turn icons render correctly
- [ ] No missing icons

---

#### Task 3.3: Update Font Awesome CSS Selectors
**Priority:** Critical  
**Estimated Time:** 10 minutes

**Location:** `styles/module.css`

**Changes:**
1. Line 910: `#crier-cards-wrapper-cardsdark .fas` → `#crier-cards-wrapper-cardsdark .fa-solid`
2. Line 1052: `#crier-cards-wrapper-cardsred .fas` → `#crier-cards-wrapper-cardsred .fa-solid`
3. Line 1195: `#crier-cards-wrapper-cardsgreen .fas` → `#crier-cards-wrapper-cardsgreen .fa-solid`
4. Line 1338: `#crier-cards-wrapper-cardsblue .fas` → `#crier-cards-wrapper-cardsblue .fa-solid`

**Files:**
- `styles/module.css`

**Validation:**
- [ ] Icon colors match v12 appearance
- [ ] All card themes display icons correctly

---

### Phase 4: Verification and Testing

#### Task 4.1: Code Review
**Priority:** High  
**Estimated Time:** 30 minutes

**Actions:**
- [ ] Review all changes against migration-global.md patterns
- [ ] Verify no jQuery usage remains
- [ ] Verify all Font Awesome references updated
- [ ] Check for any missed edge cases

---

#### Task 4.2: Functional Testing
**Priority:** Critical  
**Estimated Time:** 2 hours

**Test Cases:**

**Combat Turn Cards:**
- [ ] Turn cards display when combat advances
- [ ] All card layouts work (full, small, none)
- [ ] Icons render correctly in all themes
- [ ] Portraits/tokens display correctly
- [ ] Health bars display correctly
- [ ] Ability scores display correctly
- [ ] Death saving throws display correctly
- [ ] Bloody portraits work correctly
- [ ] NPC obfuscation works correctly

**Round Cards:**
- [ ] Round cards display when round advances
- [ ] Round icons render correctly
- [ ] Round sounds play correctly

**Missed Turns:**
- [ ] Missed turn notifications work
- [ ] Missed turn chat messages display correctly
- [ ] Missed turn icons render correctly

**Settings:**
- [ ] All settings load correctly
- [ ] Settings changes apply correctly
- [ ] Blacksmith integration works correctly

**Edge Cases:**
- [ ] Empty combat tracker
- [ ] Combat with no tokens
- [ ] Combat with hidden combatants
- [ ] Multiple GMs
- [ ] Popout windows (if applicable)

---

#### Task 4.3: Compatibility Testing
**Priority:** High  
**Estimated Time:** 1 hour

**Test With:**
- [ ] Coffee Pub Blacksmith (required dependency)
- [ ] Other Coffee Pub modules (if available)
- [ ] Popular v13-compatible modules
- [ ] Different game systems (D&D 5E, etc.)

---

## Testing Strategy

### Test Environment Setup

1. **Create v13 Test Instance**
   - Install FoundryVTT v13
   - Create test world
   - Install Coffee Pub Blacksmith v13
   - Install Coffee Pub Crier v13

2. **Test Data**
   - Create combat encounter with multiple combatants
   - Include PCs and NPCs
   - Test various health states
   - Test death saving throws

3. **Test Scenarios**
   - Normal combat flow
   - Round transitions
   - Turn transitions
   - Missed turns
   - Settings changes
   - Module reload

### Test Checklist

**Critical Path:**
- [ ] Module loads without errors
- [ ] Settings panel opens
- [ ] Combat tracker works
- [ ] Turn cards display
- [ ] Round cards display
- [ ] Icons render correctly
- [ ] No console errors

**Functionality:**
- [ ] All card layouts work
- [ ] All themes work
- [ ] All icons work
- [ ] Sounds play correctly
- [ ] Settings persist
- [ ] Blacksmith integration works

**Visual:**
- [ ] Icons match v12 appearance
- [ ] Card styling matches v12
- [ ] No layout breaks
- [ ] No missing images

---

## Risk Assessment

### Low Risk
- ✅ Font Awesome class prefix updates (straightforward find/replace)
- ✅ CSS selector updates (straightforward find/replace)
- ✅ Module.json version update (standard procedure)

### Medium Risk
- ⚠️ jQuery `.append()` conversion (may need testing to verify native method works)
- ⚠️ Hook parameter jQuery detection (defensive code, should be safe)

### High Risk
- ⚠️ **None identified** - This module has minimal jQuery usage and straightforward changes

### Mitigation Strategies

1. **Incremental Testing**
   - Test after each phase
   - Commit after each successful phase
   - Rollback if issues found

2. **Backup Strategy**
   - Create git branch for migration
   - Tag current v12 version
   - Keep v12 branch available

3. **User Communication**
   - Document breaking changes in CHANGELOG
   - Provide migration notes for users
   - Support rollback instructions

---

## Timeline

### Estimated Timeline

**Phase 1: Module Configuration** - 15 minutes
- Update module.json
- Verify module loads

**Phase 2: jQuery Removal** - 30 minutes
- Fix `.append()` usage
- Add jQuery detection
- Test chat message rendering

**Phase 3: Font Awesome Migration** - 45 minutes
- Update templates (15 min)
- Update JavaScript (10 min)
- Update CSS (10 min)
- Test icons (10 min)

**Phase 4: Verification and Testing** - 3 hours
- Code review (30 min)
- Functional testing (2 hours)
- Compatibility testing (1 hour)

**Total Estimated Time:** ~4.5 hours

### Recommended Schedule

**Day 1: Preparation**
- Review migration plan
- Set up v13 test environment
- Create migration branch

**Day 2: Implementation**
- Complete Phases 1-3
- Initial testing
- Fix any issues

**Day 3: Testing**
- Complete Phase 4
- Document any issues
- Final review

**Day 4: Release Preparation**
- Update CHANGELOG
- Update README
- Create release notes
- Tag and release

---

## Resources

### Official Documentation

- **[API Migration Guides](https://foundryvtt.com/article/migration/)** - Canonical starting point for "what changed and why"
- **[v13 API Reference](https://foundryvtt.com/api/)** - Source of truth for new types, signatures, and class changes
- **[v13 Release Notes](https://foundryvtt.com/releases/13.341)** - Breaking changes, new APIs, and deprecations
- **[ApplicationV2 API](https://foundryvtt.wiki/en/development/api/applicationv2)** - New application framework
- **[ApplicationV2 Conversion Guide](https://foundryvtt.wiki/en/development/guides/applicationV2-conversion-guide)** - Step-by-step conversion guide
- **[Canvas API Documentation](https://foundryvtt.wiki/en/development/api/canvas)** - Scene controls and canvas changes

### Internal Documentation

- **[Migration Global Guide](../documentation/migration-global.md)** - Comprehensive migration patterns and examples
- **[Architecture Documentation](../documentation/architecture-crier.md)** - Module architecture and design

### Community Resources

- **Foundry Discord** `#dev-support` channel
- **Foundry Community Wiki**

### Migration Tools

**Search Commands:**
```bash
# Find remaining jQuery usage
grep -r "\.append\|\.find\|\.each\|\.on\|\.off" scripts/

# Find remaining Font Awesome 5 usage
grep -r "fas \|far \|fal " scripts/ templates/
grep -r "\.fas\|\.far\|\.fal" styles/

# Find hook parameter usage
grep -r "renderChatMessage\|renderCombatTracker\|render.*html" scripts/
```

---

## Post-Migration Tasks

### Documentation Updates

- [ ] Update README.md with v13 compatibility notice
- [ ] Update CHANGELOG.md with migration details
- [ ] Update module.json version and compatibility
- [ ] Document any breaking changes for users

### Release Preparation

- [ ] Create git tag: `v13.0.0`
- [ ] Create GitHub release
- [ ] Update module manifest
- [ ] Test module installation from manifest

### Follow-Up

- [ ] Monitor user feedback
- [ ] Address any reported issues
- [ ] Plan for ApplicationV2 migration (future enhancement)
- [ ] Remove jQuery detection code after confirming stability (technical debt cleanup)

---

## Notes

### Technical Debt

The jQuery detection pattern added in Task 2.2 is **technical debt** and should be removed after confirming all hook call sites pass native DOM elements. See migration-global.md Pattern 10 for details.

### Future Enhancements

- Consider migrating to ApplicationV2 API (optional, not required for v13)
- Consider removing jQuery detection after stability confirmed
- Consider updating to latest Font Awesome 6 icons

### Dependencies

- **Coffee Pub Blacksmith** - Must be v13-compatible
- Verify Blacksmith v13 compatibility before releasing Crier v13

---

**Migration Plan Status:** ✅ Ready for Implementation  
**Next Steps:** Begin Phase 1 - Module Configuration

