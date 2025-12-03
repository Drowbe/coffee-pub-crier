# Coffee Pub Crier - FoundryVTT v13 Migration Plan

> **Status:** ✅ Migration Complete  
> **Target Version:** v13.0.0  
> **Current Version:** v13.0.0  
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

#### ✅ Issues Found and Fixed

**1. jQuery Usage** ✅ **COMPLETED**
- **Location:** `scripts/crier.js:632`
- **Status:** Verified as native DOM `append()` method - no changes needed
- **Action Taken:** Confirmed `msgb.append()` uses native DOM API

**2. Font Awesome 5 Class Prefixes** ✅ **COMPLETED**
- **Templates:** ✅ All 4 instances updated in `templates/turns.hbs`
- **JavaScript:** ✅ All 2 instances updated in `scripts/crier.js`
- **CSS Selectors:** ✅ All 10 selectors updated in `styles/module.css`
- **Action Taken:** All `fas` prefixes updated to `fa-solid`

**3. Hook Parameter Handling** ✅ **COMPLETED**
- **Location:** `scripts/crier.js:656`
- **Action Taken:** Added jQuery detection pattern per migration-global.md Pattern 10
- **Implementation:** Updated `chatMessageEvent` to handle native DOM elements and jQuery objects

**4. Module Configuration** ✅ **COMPLETED**
- **Action Taken:** Updated `module.json` to `"minimum": "13.0.0"` and version to `"13.0.0"`

#### ✅ No Issues Found
- No `getSceneControlButtons` hooks (not applicable)
- No Font Awesome 5 family references in CSS (good)
- No deprecated `Token#target` usage
- No deprecated `FilePicker` usage
- Hooks properly registered via BlacksmithHookManager (good)

---

## Migration Tasks

### ✅ Phase 1: Module Configuration - COMPLETED

#### Task 1.1: Update module.json ✅
**Status:** ✅ Completed

**Changes Applied:**
- Updated `module.json` version to `"13.0.0"`
- Updated compatibility to `"minimum": "13.0.0"`, `"verified": "13.0.0"`, `"maximum": "14"`

**Files Modified:**
- ✅ `module.json`

---

### ✅ Phase 2: jQuery Removal - COMPLETED

#### Task 2.1: Fix jQuery `.append()` Usage ✅
**Status:** ✅ Verified - No changes needed

**Result:** Confirmed `msgb.append()` uses native DOM API (not jQuery). Native DOM `append()` method supports multiple arguments and works correctly in v13.

**Files Verified:**
- ✅ `scripts/crier.js:632`

---

#### Task 2.2: Add jQuery Detection for Hook Parameters ✅
**Status:** ✅ Completed

**Implementation:**
- Added jQuery detection pattern in `chatMessageEvent` function
- Handles both native DOM elements and jQuery objects
- Supports array destructuring from hook parameters

**Files Modified:**
- ✅ `scripts/crier.js:656`

---

### ✅ Phase 3: Font Awesome Migration - COMPLETED

#### Task 3.1: Update Font Awesome Class Prefixes in Templates ✅
**Status:** ✅ Completed

**Changes Applied:**
- ✅ Line 6: `fas` → `fa-solid`
- ✅ Line 52: Removed duplicate `fas`, kept `fa-solid`
- ✅ Line 112: `fas` → `fa-solid`
- ✅ Line 134: `fas` → `fa-solid`

**Files Modified:**
- ✅ `templates/turns.hbs`

---

#### Task 3.2: Update Font Awesome Class Prefixes in JavaScript ✅
**Status:** ✅ Completed

**Changes Applied:**
- ✅ Line 584: `'fas'` → `'fa-solid'` (round icon)
- ✅ Line 740: `fas fa-fire` → `fa-solid fa-fire` (missed turn icon)

**Files Modified:**
- ✅ `scripts/crier.js`

---

#### Task 3.3: Update Font Awesome CSS Selectors ✅
**Status:** ✅ Completed

**Changes Applied:**
- ✅ Line 70-75: Updated round message icon selectors (6 selectors)
- ✅ Line 910: `cardsdark .fas` → `cardsdark .fa-solid`
- ✅ Line 1052: `cardsred .fas` → `cardsred .fa-solid`
- ✅ Line 1195: `cardsgreen .fas` → `cardsgreen .fa-solid`
- ✅ Line 1338: `cardsblue .fas` → `cardsblue .fa-solid`

**Files Modified:**
- ✅ `styles/module.css`

---

### Phase 4: Verification and Testing

#### Task 4.1: Code Review ✅
**Status:** ✅ Completed

**Actions Completed:**
- ✅ Reviewed all changes against migration-global.md patterns
- ✅ Verified no jQuery usage remains (only native DOM)
- ✅ Verified all Font Awesome references updated to FA6
- ✅ Checked for missed edge cases - none found

---

#### Task 4.2: Functional Testing
**Status:** ⏳ Pending User Testing

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
**Status:** ⏳ Pending User Testing

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

- ✅ Update CHANGELOG.md with migration details
- ✅ Update module.json version and compatibility
- [ ] Update README.md with v13 compatibility notice
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

**Migration Plan Status:** ✅ **MIGRATION COMPLETE**  
**Implementation Date:** 2025-01-XX  
**Next Steps:** User testing in FoundryVTT v13 environment, then release preparation

