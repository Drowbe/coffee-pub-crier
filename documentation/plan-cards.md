# Chat Card Migration Plan: Coffee Pub Crier to Blacksmith Framework

## Overview

This document outlines the plan to migrate Coffee Pub Crier's chat card system from custom CSS to the Coffee Pub Blacksmith chat card framework. This is a **template adaptation** that preserves all internal layout and functionality while adopting the standardized Blacksmith card structure.

**Key Principle:** Preserve internal card layout and functionality; only change the wrapper structure and styling approach.

## Current State

### Existing Card System
- **Turn Cards:** Custom CSS with IDs like `#crier-cards-wrapper-cardsdark`, `#crier-cards-wrapper-cardsgreen`, etc.
- **Round Cards:** Simple structure with `.round-cycling-{{roundCardStyle}}` classes
- **Complex Features:** HP bars, ability scores, death saves, portrait overlays, multiple layouts (full/small/none)
- **Custom Styling:** ~1,440 lines of CSS in `module.css` for card variants
- **Style Options:** `cardsdark`, `cardsgreen`, `cardsred`, `cardsblue`, `cardsminimalred`, `cardsminimalplain`, `cardssimple`

### Target System (Blacksmith)
- **Base Class:** `.blacksmith-card` with theme classes (`theme-default`, `theme-blue`, `theme-green`, `theme-red`, etc.)
- **Semantic Classes:** `.card-header`, `.section-content`, `.section-header`, `.section-table`
- **CSS Variables:** Theme system using CSS variables for easy customization
- **Required:** Hide-header span: `<span style="visibility: hidden">coffeepub-hide-header</span>`

## Level of Effort

**Estimated Time: 4-6 hours**

### Breakdown:
1. **Template Migration:** 2-3 hours
2. **Theme Mapping:** 1 hour
3. **CSS Cleanup:** 1-2 hours
4. **Testing & Refinement:** 1 hour

## Risk Assessment

### Low Risk
- Template-only changes; no JavaScript logic changes required
- Internal layout preserved
- Blacksmith framework is stable and documented

### Medium Risk
- Visual differences may require theme adjustments
- Some custom styling (HP bars, death saves) may need careful scoping
- Theme mapping may not be 1:1 (may need custom theme overrides)

### Mitigation Strategies
- Incremental migration (round cards first, then turn cards)
- Keep old CSS commented during transition for easy rollback
- Test with all existing settings combinations
- Create custom theme overrides if needed

## Dependencies

- Coffee Pub Blacksmith module must be installed and active
- No JavaScript changes required (purely template/CSS)
- Existing Handlebars rendering system works as-is

---

## Migration Phases

### Phase 1: Round Cards Migration (Simplest - Start Here)

**Goal:** Migrate round cards to Blacksmith framework as proof of concept.

#### Step 1.1: Update Round Template (`templates/rounds.hbs`)
- [ ] Add hide-header span at the beginning
- [ ] Wrap content in `.blacksmith-card` with theme class
- [ ] Convert round message to `.card-header` structure
- [ ] Map `roundCardStyle` values to Blacksmith themes:
  - `cardsdark` → `theme-default` (or custom dark theme)
  - `cardsgreen` → `theme-announcement-green` or `theme-green`
  - `cardsred` → `theme-announcement-red` or `theme-red`
  - `cardsminimalred` → `theme-announcement-red`
  - `cardsminimalplain` → `theme-default`
  - `cardssimple` → `theme-default`

#### Step 1.2: Update Round Card CSS (`styles/module.css`)
- [ ] Remove round card-specific CSS (lines ~16-164)
- [ ] Add minimal overrides if needed for theme customization
- [ ] Test round card rendering with all style options

#### Step 1.3: Testing
- [ ] Test round cards with all `roundCardStyle` options
- [ ] Verify hide-header functionality works
- [ ] Verify theme colors match expectations
- [ ] Test with different round numbers

**Deliverable:** Round cards fully migrated and tested.

---

### Phase 2: Turn Cards - Basic Structure

**Goal:** Migrate turn card wrapper structure while preserving all internal content.

#### Step 2.1: Update Turn Template - Wrapper (`templates/turns.hbs`)
- [ ] Add hide-header span at the beginning
- [ ] Wrap entire card in `.blacksmith-card` with theme class
- [ ] Map `turnCardStyle` values to Blacksmith themes:
  - `cardsdark` → `theme-default` (or custom dark theme)
  - `cardsgreen` → `theme-green`
  - `cardsred` → `theme-red`
  - `cardsblue` → `theme-blue`
- [ ] Convert title section to `.card-header` structure
- [ ] Wrap main content in `.section-content`
- [ ] Preserve all internal structure (portraits, HP, abilities, death saves)

#### Step 2.2: Update Turn Card CSS - Remove Wrapper Styles
- [ ] Remove wrapper-level styling (handled by Blacksmith):
  - `#crier-cards-wrapper-*` base styles
  - `#crier-cards-title-*` base styles (keep content-specific)
  - `#crier-cards-description-*` base styles (keep content-specific)
  - `#crier-cards-content-*` base styles (keep content-specific)
- [ ] Comment out removed CSS for reference
- [ ] Test basic card structure renders correctly

**Deliverable:** Turn cards wrapped in Blacksmith structure, basic rendering verified.

---

### Phase 3: Turn Cards - Preserve Custom Features

**Goal:** Ensure all custom features (HP bars, abilities, death saves, portraits) work correctly.

#### Step 3.1: Scope Custom Feature CSS
- [ ] **HP Bars:** Scope `.hp-container-*` and `.hp-progress-*` to `.blacksmith-card` context
- [ ] **Ability Grid:** Scope `.ability-container-*` and `.ability-child-*` to `.blacksmith-card` context
- [ ] **Death Saves:** Scope `.crier-deathsave-*` classes to `.blacksmith-card` context
- [ ] **Portrait Overlays:** Scope `.image-stack` and related classes to `.blacksmith-card` context
- [ ] **Token Backgrounds:** Scope `.crier-token-background-*` to `.blacksmith-card` context
- [ ] **Layout Modes:** Ensure full/small/none layouts still work within Blacksmith structure

#### Step 3.2: Update Template - Preserve Layout Logic
- [ ] Verify all Handlebars conditionals still work:
  - `{{#if blnLayoutFull}}`
  - `{{#if blnLayoutSmall}}`
  - `{{#if blnLayoutNone}}`
  - All hide/show flags (hidePortrait, hideHealth, hideAbilities, etc.)
- [ ] Ensure portrait stacking logic preserved
- [ ] Ensure HP bar conditional rendering preserved
- [ ] Ensure death save indicators preserved

#### Step 3.3: Testing Custom Features
- [ ] Test HP bars with all health states (healthy, hurt, dying, critical, death saving, dead)
- [ ] Test ability scores display correctly
- [ ] Test death save indicators (successes and failures)
- [ ] Test portrait overlays (bloody portrait feature)
- [ ] Test token backgrounds
- [ ] Test all layout modes (full, small, none)
- [ ] Test with NPCs vs Players
- [ ] Test hide/show flags for all features

**Deliverable:** All custom features working correctly within Blacksmith structure.

---

### Phase 4: Theme Refinement

**Goal:** Ensure visual consistency and proper theme mapping.

#### Step 4.1: Theme Color Mapping
- [ ] Compare existing card colors with Blacksmith theme colors
- [ ] Create custom theme overrides if needed (using CSS variables)
- [ ] Map icon styles to work with themes
- [ ] Ensure text readability with all themes

#### Step 4.2: Custom Theme Overrides (if needed)
- [ ] Create `.blacksmith-card.theme-crier-dark` if needed
- [ ] Override CSS variables for color matching:
  - `--blacksmith-card-bg`
  - `--blacksmith-card-border`
  - `--blacksmith-card-header-text`
  - `--blacksmith-card-section-content-text`
- [ ] Test all theme combinations

#### Step 4.3: Visual Consistency Check
- [ ] Compare old vs new card appearance
- [ ] Adjust theme mappings if colors don't match
- [ ] Ensure all card variants look correct
- [ ] Test with different Foundry themes (if applicable)

**Deliverable:** Visual consistency achieved, themes properly mapped.

---

### Phase 5: CSS Cleanup

**Goal:** Remove deprecated CSS and finalize styling.

#### Step 5.1: Remove Deprecated CSS
- [ ] Remove all wrapper-level CSS that's now handled by Blacksmith
- [ ] Remove round card CSS (already done in Phase 1)
- [ ] Remove turn card wrapper CSS (already done in Phase 2)
- [ ] Keep only scoped custom feature CSS
- [ ] Document any remaining custom CSS and why it's needed

#### Step 5.2: Organize Remaining CSS
- [ ] Group remaining CSS by feature:
  - HP bar styles
  - Ability grid styles
  - Death save styles
  - Portrait/background styles
  - Layout-specific styles
- [ ] Add comments explaining custom CSS sections
- [ ] Ensure all selectors are properly scoped to `.blacksmith-card`

#### Step 5.3: Final CSS Review
- [ ] Verify no CSS conflicts with Blacksmith
- [ ] Verify all custom features still styled correctly
- [ ] Check for any unused CSS rules
- [ ] Optimize CSS if possible

**Deliverable:** Clean, organized CSS with only necessary custom styles.

---

### Phase 6: Comprehensive Testing

**Goal:** Ensure everything works correctly across all scenarios.

#### Step 6.1: Settings Combinations Testing
- [ ] Test all `turnCardStyle` options with all layouts (full/small/none)
- [ ] Test all `roundCardStyle` options
- [ ] Test all `turnIconStyle` options
- [ ] Test all `roundIconStyle` options
- [ ] Test all `portraitStyle` options
- [ ] Test all `tokenBackground` options
- [ ] Test all hide/show flags combinations

#### Step 6.2: Feature Testing
- [ ] Test turn cards for players (with all stats)
- [ ] Test turn cards for NPCs (without stats)
- [ ] Test round cards
- [ ] Test missed turn cards (if applicable)
- [ ] Test obfuscation features
- [ ] Test with different permission levels

#### Step 6.3: Edge Cases
- [ ] Test with combatants at 0 HP (death saves)
- [ ] Test with dead combatants
- [ ] Test with hidden combatants
- [ ] Test with multiple combats
- [ ] Test round transitions
- [ ] Test turn transitions

#### Step 6.4: Browser Compatibility
- [ ] Test in Chrome/Edge
- [ ] Test in Firefox
- [ ] Test in Safari (if applicable)
- [ ] Verify responsive behavior

**Deliverable:** All scenarios tested and verified working.

---

### Phase 7: Documentation & Cleanup

**Goal:** Document changes and prepare for release.

#### Step 7.1: Update Documentation
- [ ] Update CHANGELOG.md with migration details
- [ ] Document theme mappings
- [ ] Document any breaking changes (if any)
- [ ] Update README if needed

#### Step 7.2: Code Cleanup
- [ ] Remove commented-out CSS (after verification)
- [ ] Remove any unused template code
- [ ] Verify no console errors
- [ ] Final code review

#### Step 7.3: Release Preparation
- [ ] Version bump if needed
- [ ] Create migration notes for users
- [ ] Note that old chat messages will still use old styling until re-rendered
- [ ] Consider if migration script is needed (optional)

**Deliverable:** Migration complete, documented, and ready for release.

---

## Key Considerations

### Theme Mapping Strategy
Existing colors may not match Blacksmith themes exactly. Options:
1. **Use closest Blacksmith theme** - Simplest, may have slight color differences
2. **Create custom theme overrides** - More work, perfect color matching
3. **Hybrid approach** - Use Blacksmith themes where close, custom overrides where needed

**Recommendation:** Start with option 1, add custom overrides only if visual differences are significant.

### Custom Features Preservation
HP bars, death saves, ability grids are module-specific. These will need:
- Scoped CSS within `.blacksmith-card` context
- Custom classes that work with Blacksmith structure
- Careful testing to ensure they don't conflict with Blacksmith styles

### Layout Modes
The full/small/none layouts are content structure, not styling. These should be preserved as-is within the Blacksmith wrapper.

### Backward Compatibility
Old messages in chat will still use old styling until re-rendered. Consider:
- Migration note in changelog
- Optional one-time migration script (higher effort, may not be necessary)

### Testing Strategy
- Test incrementally after each phase
- Keep old CSS commented during transition for easy rollback
- Test with real game data if possible
- Test all setting combinations

---

## Success Criteria

Migration is successful when:
- [ ] All round cards render correctly with Blacksmith framework
- [ ] All turn cards render correctly with Blacksmith framework
- [ ] All custom features (HP, abilities, death saves, portraits) work correctly
- [ ] All layout modes (full/small/none) work correctly
- [ ] All style options map correctly to themes
- [ ] No JavaScript errors
- [ ] No CSS conflicts
- [ ] Visual appearance is acceptable (matches or improves on original)
- [ ] All existing functionality preserved

---

## Rollback Plan

If issues arise during migration:
1. Keep old CSS commented, not deleted
2. Keep old templates backed up
3. Can revert template changes quickly
4. Can uncomment old CSS if needed
5. Git version control provides additional safety

---

## Notes

- This is a **template adaptation only** - no JavaScript changes required
- Internal card layout and logic are **preserved**
- Only wrapper structure and styling approach change
- Blacksmith framework handles base styling, we keep custom feature styling
- Migration can be done incrementally, testing after each phase

---

**Document Version:** 1.0  
**Created:** 2026-01-25  
**Status:** Ready to Begin
