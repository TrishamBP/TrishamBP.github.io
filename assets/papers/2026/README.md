# Research Papers PDFs

## Adding New Papers

To add a new research paper:

1. **Add PDF to appropriate year folder:**
   ```
   /assets/papers/YYYY/paper-slug.pdf
   ```

2. **Create Markdown file in `_papers/` collection:**
   ```
   _papers/YYYY-MM-DD-paper-slug.md
   ```

3. **Use this template:**
   ```yaml
   ---
   title: "Your Paper Title"
   authors: "Author Name(s)"
   author_email: "email@example.com"
   date: YYYY-MM-DD
   venue: "Conference/Journal Name"
   paper_type: "Research Paper | Technical Report | Whitepaper"
   keywords:
     - keyword1
     - keyword2
   abstract: |
     Full abstract here...
   abstract_short: |
     Shortened abstract for card display (2-3 sentences)...
   pdf: "/assets/papers/YYYY/paper-slug.pdf"
   featured: true
   doi: ""
   arxiv: ""
   citation_apa: "APA citation"
   citation_ieee: "IEEE citation"
   bibtex: |
     @article{...}
   ---
   ```

4. The paper will automatically appear on `/research-articles/` page

---

## Folder Structure

```
/assets/papers/
├── 2026/
│   ├── [paper-slug].pdf
│   └── README.md (this file)
├── 2025/
│   └── [future papers]
└── supplements/
    └── [supplemental materials, slides, datasets]
```

---

## Future Features (Infrastructure Ready)

The paper metadata supports:
- DOI badges
- arXiv badges
- Conference/Journal badges
- Citation counts
- BibTeX download
- Multiple citation formats (APA, IEEE, ACM)
- Supplemental materials
- Code repositories
- Datasets
- Presentation slides
- Video recordings

Simply add the appropriate field to the paper's front matter when ready.
