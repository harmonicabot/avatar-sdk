# Elinor Ostrom Corpus

This directory contains the source material for the Elinor Ostrom avatar.

## Source Transparency

All sources are documented in `sources.json` with:
- Title, authors, year
- URL to original source
- License information
- Verification status

## Downloading the Corpus

The actual PDF files are not stored in this repository. To build the corpus locally:

```bash
# Create the open-access directory
mkdir -p open-access/papers

# Download primary sources
curl -o open-access/sustaining-the-commons-v2.pdf \
  "https://sustainingthecommons.org/wp-content/uploads/2019/06/Sustaining-the-Commons-v2.0.pdf"

curl -o open-access/nobel-lecture-2009.pdf \
  "https://www.nobelprize.org/uploads/2018/06/ostrom_lecture.pdf"

curl -o open-access/iad-framework-guide.pdf \
  "https://mcginnis.pages.iu.edu/iad_guide.pdf"
```

## What's Included

### Primary Sources (Open Access)
1. **Sustaining the Commons** - Textbook covering her frameworks
2. **Nobel Prize Lecture (2009)** - Her definitive summary
3. **IAD Framework Guide** - The analytical framework explained

### Secondary Sources (Check Access)
- Papers from Ecology and Society (open access)
- Papers from International Journal of the Commons (open access)
- Working papers from Digital Library of the Commons

## What's NOT Included

The following copyrighted works are not included:
- "Governing the Commons" (1990) - Cambridge University Press
- "Understanding Institutional Diversity" (2005) - Princeton University Press
- "Rules, Games, and Common-Pool Resources" (1994) - University of Michigan Press

If you have legitimate access to these works, you can add them to your local corpus for personal use.

## Verification

Each source in `sources.json` has a `verified` field indicating whether we have confirmed the authenticity and provenance of the document.
