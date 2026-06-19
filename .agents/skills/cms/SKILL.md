# SKILL: CMS & Website Builder — Skolr Platform

> Reference this file for all CMS / website builder related work.
> This is the #1 differentiator feature of Skolr. Quality bar is highest here.

---

## Concept

The Skolr CMS gives every school a **modern, auto-generated public website** managed entirely from the admin panel. Think Squarespace-quality output, school-ERP data integration, zero developer needed.

---

## Architecture

```
Admin Panel (React)
    │
    ├── Template Picker         → Choose from 12 templates
    ├── Page Manager            → Create / edit pages
    ├── Section Editor          → Add/reorder/config sections
    ├── Content Pane (right)    → Edit content for selected section
    ├── Media Library           → Upload & manage images
    └── Publish Button          → Triggers SSR build
            │
            ▼
    FastAPI CMS Service
            │
    PostgreSQL (cms_pages JSONB)
            │
    Static Site Generator (Python Jinja2 / Next.js ISR)
            │
    CDN (CloudFront / BunnyCDN)
            │
    school.skolr.in or custom domain
```

---

## Template Structure

Each template lives in `cms-templates/<template-id>/`:
```
template-001-prestige/
├── template.json          ← Manifest
├── index.html             ← Base layout
├── sections/
│   ├── hero.html
│   ├── about.html
│   ├── stats.html
│   ├── gallery.html
│   ├── testimonials.html
│   ├── faculty.html
│   ├── admissions.html
│   ├── contact.html
│   └── footer.html
├── styles/
│   ├── main.css
│   └── variables.css      ← Color scheme vars
└── preview/
    └── thumb.png
```

### template.json Manifest
```json
{
  "id": "template-001-prestige",
  "name": "Prestige",
  "description": "Elegant and professional. Perfect for established institutions.",
  "thumbnail": "preview/thumb.png",
  "color_schemes": [
    { "name": "Navy & Gold", "primary": "#1E3A5F", "accent": "#F5A623", "bg": "#FFFFFF" },
    { "name": "Forest & Cream", "primary": "#1B4332", "accent": "#D4A853", "bg": "#FAFAF7" }
  ],
  "sections": {
    "hero":          { "required": true,  "max": 1 },
    "about":         { "required": false, "max": 1 },
    "stats":         { "required": false, "max": 1 },
    "gallery":       { "required": false, "max": 2 },
    "testimonials":  { "required": false, "max": 1 },
    "faculty":       { "required": false, "max": 1 },
    "admissions":    { "required": false, "max": 1 },
    "contact":       { "required": true,  "max": 1 }
  },
  "fonts": {
    "display": "Playfair Display",
    "body": "Source Sans Pro"
  }
}
```

---

## Section Content Schema (stored as JSONB)

Each page's `sections` field is an array of section configs:

```json
[
  {
    "id": "sec_abc123",
    "type": "hero",
    "order": 1,
    "visible": true,
    "content": {
      "tagline": "Excellence in Education Since 1985",
      "headline": "Shaping Tomorrow's Leaders",
      "subheadline": "CBSE Affiliated | Grades K–12 | Pune, Maharashtra",
      "cta_primary": { "label": "Apply for Admission", "url": "/admissions" },
      "cta_secondary": { "label": "Virtual Tour", "url": "#gallery" },
      "background_image_id": "media_xyz789",
      "overlay_opacity": 0.5
    }
  },
  {
    "id": "sec_def456",
    "type": "stats",
    "order": 2,
    "visible": true,
    "content": {
      "stats": [
        { "label": "Students", "value": "1,200+", "icon": "users" },
        { "label": "Teachers", "value": "85", "icon": "graduation-cap" },
        { "label": "Years of Excellence", "value": "38", "icon": "star" },
        { "label": "Board Result %", "value": "98.5", "icon": "trophy" }
      ]
    }
  },
  {
    "id": "sec_ghi789",
    "type": "gallery",
    "order": 3,
    "visible": true,
    "content": {
      "heading": "Life at Our School",
      "media_ids": ["media_1", "media_2", "media_3", "media_4", "media_5", "media_6"],
      "layout": "masonry"  // grid | masonry | carousel
    }
  }
]
```

---

## Admin CMS Editor — UI Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ CMS Editor                                    [Preview] [Publish] │
├──────────────────┬──────────────────────────────────────────┤
│ LEFT PANEL       │ CENTER (Live Preview - iframe)            │
│                  │                                           │
│ Pages            │  ┌─────────────────────────────────┐    │
│ • Home ●         │  │     HERO SECTION                 │    │
│ • About          │  │  [selected - blue outline]       │    │
│ • Admissions     │  ├─────────────────────────────────┤    │
│ • Contact        │  │     STATS SECTION                │    │
│                  │  ├─────────────────────────────────┤    │
│ [+ New Page]     │  │     GALLERY SECTION              │    │
│                  │  ├─────────────────────────────────┤    │
│ Sections         │  │   [+ Add Section]                │    │
│ ≡ Hero     👁    │  └─────────────────────────────────┘    │
│ ≡ Stats    👁    │                                           │
│ ≡ Gallery  👁    ├──────────────────────────────────────────┤
│ [+ Section]      │ RIGHT PANEL (Content Editor)             │
│                  │                                           │
│                  │ Hero Section                              │
│                  │ ─────────────                             │
│                  │ Tagline: [Excellence in Education...]     │
│                  │ Headline: [Shaping Tomorrow's Leaders]   │
│                  │ Background: [Upload Image] [Choose Media]│
│                  │ CTA Button: [Apply for Admission] [url]  │
│                  │ Overlay: [━━━━●━━━━] 50%                 │
└──────────────────┴──────────────────────────────────────────┘
```

---

## React Components for CMS Builder

```
src/modules/cms/
├── pages/
│   ├── TemplatePickerPage.tsx    ← First-time setup
│   ├── CMSEditorPage.tsx         ← Main editor
│   └── MediaLibraryPage.tsx
├── components/
│   ├── TemplateCard.tsx
│   ├── SectionList.tsx           ← Left panel, dnd-kit sortable
│   ├── PreviewFrame.tsx          ← Center iframe
│   ├── ContentEditor.tsx         ← Right panel, dynamic per section type
│   └── editors/                  ← Section-specific editors
│       ├── HeroEditor.tsx
│       ├── GalleryEditor.tsx
│       ├── StatsEditor.tsx
│       └── TestimonialsEditor.tsx
├── hooks/
│   ├── useCMSSite.ts
│   ├── useCMSPages.ts
│   └── usePublish.ts
└── api/
    └── cmsApi.ts
```

---

## Publish Workflow

```
Admin clicks "Publish"
       │
       ▼
POST /api/v1/cms/publish
       │
       ▼
Celery Task: generate_static_site(school_id)
       │
       ├── Fetch all cms_pages from DB
       ├── Resolve media URLs (S3 signed → public CDN)
       ├── Pull live ERP data (fee structure, academic calendar)
       ├── Render Jinja2 templates → HTML files
       ├── Minify CSS/JS
       ├── Upload to S3 bucket (school-specific prefix)
       └── Invalidate CloudFront cache
       │
       ▼
Site live at school.skolr.in within ~30 seconds
```

---

## ERP Data Auto-Sync to Website

The school's public website automatically pulls from ERP:

| Website Section | Auto-pulled ERP Data |
|---|---|
| Admissions banner | `admissions_open` flag from settings |
| Academic Calendar | Events from `calendar_events` table |
| Fee Structure | `fee_structures` (if school enables public display) |
| Staff/Faculty | `employees` where `show_on_website = true` |
| Testimonials | `cms_testimonials` table |
| Gallery | `cms_media` tagged with `show_on_website = true` |

---

## Domains

- Default: `{subdomain}.skolr.in` — provisioned on school onboarding
- Custom domain: School adds CNAME `school.com → cdn.skolr.in`
- SSL: Auto-provisioned via Let's Encrypt (Certbot) or AWS ACM

---

## Quality Standards for Templates

Templates MUST:
- Score 90+ on Google PageSpeed (mobile)
- Be fully responsive (mobile, tablet, desktop)
- Include proper SEO meta tags (OG, Twitter card, structured data)
- Use `prefers-reduced-motion` media query
- Have WCAG AA color contrast
- Load in under 2 seconds on 4G

---

## 12 Planned Templates

| # | Name | Style | Best For |
|---|---|---|---|
| 01 | Prestige | Classic serif, navy | Established senior schools |
| 02 | Modern | Clean sans, blue | Urban CBSE schools |
| 03 | Vibrant | Bold colors, playful | Primary/junior schools |
| 04 | Scholar | Academic, structured | Coaching institutes |
| 05 | Nature | Earthy, warm | Eco/Montessori schools |
| 06 | Elite | Minimal, luxury | Premium IB/IGCSE schools |
| 07 | Heritage | Traditional, ornate | Old established schools |
| 08 | Digital | Dark mode, tech feel | STEM/technology schools |
| 09 | Warm | Friendly, pastel | Preschool/Nursery |
| 10 | Bold | High contrast, impact | Sports academies |
| 11 | Culture | Arts-forward, creative | Art/music schools |
| 12 | Community | Open, welcoming | Government/aided schools |
