---
name: Nexus Professional
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#454651'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#767682'
  outline-variant: '#c6c5d3'
  surface-tint: '#4b57aa'
  primary: '#142175'
  on-primary: '#ffffff'
  primary-container: '#2e3a8c'
  on-primary-container: '#9ea9ff'
  inverse-primary: '#bcc3ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#412600'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f3a00'
  on-tertiary-container: '#f29c06'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc3ff'
  on-primary-fixed: '#000d60'
  on-primary-fixed-variant: '#333f91'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for a high-efficiency recruitment ecosystem where professional rigour meets AI-driven accessibility. The brand personality is that of a "Sophisticated Partner"—intelligent, reliable, and quietly powerful. It avoids the coldness of traditional enterprise software by utilizing soft background tints and organic spacing, ensuring that both high-stress recruiters and anxious candidates feel supported.

The visual style is **Corporate Modern with Tonal Layering**. It leverages high-quality typography and a structured grid to manage data density, while using subtle color-coded environments to provide instant context for different user roles. The interface prioritizes clarity and speed, ensuring that AI-augmented insights are highlighted without overwhelming the human decision-making process.

## Colors

The palette is anchored by **Deep Indigo** (#2E3A8C), representing stability and institutional trust. **Emerald** (#10B981) is the functional "success" color, used for hiring actions, "qualified" badges, and positive progression. **Amber** (#F59E0B) is reserved for high-attention alerts and pending AI analysis.

A critical component of this design system is **Role-Based Tinting**:
- **Candidate Viewports:** Utilize a very faint Azure tint (#F0F7FF) to create a calm, focused environment.
- **Recruiter Viewports:** Utilize a subtle Lavender tint (#F5F3FF) to distinguish administrative and data-heavy workflows.
- **Surface Neutrals:** Use Slate (#475569) for secondary text and borders to maintain high legibility against white containers.

## Typography

This design system utilizes **Inter** exclusively to achieve a systematic, utilitarian aesthetic that remains highly readable at small sizes. 

- **Hierarchy:** Use bold weights for headlines to anchor the page, especially in data-heavy recruiter dashboards.
- **Tightened Tracking:** Apply negative letter-spacing to larger display type to maintain a premium, editorial feel.
- **Labels:** Use uppercase for `label-sm` when used in table headers or small metadata tags to differentiate them from body copy.
- **Line Height:** Generous line-heights are maintained (1.5x for body) to reduce cognitive load during long reading sessions (e.g., reviewing resumes).

## Layout & Spacing

The layout is built on a **4px baseline grid** within a **12-column fluid system** for desktop. 

- **Data Density:** In Kanban and Table views, use `sm` (12px) padding to maximize information visibility. In marketing or candidate-facing landing pages, use `lg` (24px) or `xl` (32px) padding to create a spacious, premium feel.
- **Grid Alignment:** Content should align to the column grid, but AI-augmented "insights" sidebars can float or slide over the layout to indicate their supportive, non-blocking nature.
- **Mobile:** Transition to a single-column layout with 16px side margins. Horizontal scrolling is permitted only for wide data tables.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers and Soft Shadows**. 

1.  **Level 0 (Background):** The role-specific tinted backgrounds.
2.  **Level 1 (Cards/Tables):** White surfaces with a 1px Slate-200 border. This is the primary work surface.
3.  **Level 2 (Interactive/Hover):** Surfaces that gain a subtle, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)) and a slightly darker border.
4.  **Level 3 (Modals/AI Drawers):** Significant elevation (0px 12px 24px rgba(0,0,0,0.1)) to clearly separate global actions or deep AI insights from the underlying data.

Avoid heavy black shadows; instead, use shadows tinted with the Primary Indigo to keep the UI clean and integrated.

## Shapes

The shape language is consistently **Rounded**, signaling approachability.

- **Standard Elements:** 8px (`rounded-md`) for buttons, input fields, and small cards.
- **Large Containers:** 16px (`rounded-xl`) for main dashboard widgets and modal containers.
- **Interactive Feedback:** When an item is selected in a list, the selection indicator should share the container's corner radius to maintain a nested, harmonious appearance.
- **Pill Shapes:** Reserved exclusively for status tags (e.g., "In Review", "Hired") and AI-generated keyword chips.

## Components

### Buttons
- **Primary:** Solid Indigo background with white text. High contrast for the "Main Action" (e.g., Move to Interview).
- **Secondary:** White background with 1px Indigo border and Indigo text. Used for "Alternative Actions" (e.g., View Profile).
- **Ghost:** No background or border. Used for navigation and low-priority actions to avoid visual clutter.

### Tables & Kanban
- **Table Rows:** Hover states must include a 2px Primary-color left-accent bar to guide the eye across the data.
- **Kanban Cards:** Use a 1px border. Apply a subtle background color-strip at the top of the card to indicate AI-match strength (Emerald to Amber).

### Input Fields
- Use a 1px Slate-200 border that transitions to Indigo on focus. 
- AI-assisted fields (e.g., auto-filling job descriptions) should feature a subtle gradient border or a small "Sparkle" icon to denote machine assistance.

### Chips & Badges
- **Status Badges:** Low-saturation backgrounds with high-saturation text (e.g., Light Emerald background with Dark Emerald text) for maximum legibility without being garish.
- **Filter Chips:** 8px rounded corners, easily dismissible with a trailing "x".