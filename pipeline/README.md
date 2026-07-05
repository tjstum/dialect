# Data Pipeline Tools

This folder contains the scripts used to scrape, parse, extend, and compile the Harvard Dialect Survey data and pages for the Dialect Map application.

## Directory Structure

*   `scrape_and_generate.py`: Scrapes the raw HTML files from the Harvard Dialect Survey site, parses the dialect percentages, and generates the `dialect-data-survey.js` file.
*   `extend_data.py`: A Python script that generates the `dialect-data-extended.js` file containing extra modeled regional dialect questions (e.g. pronunciations of "coyote", "theater", etc.) with deterministic regional probability distributions.
*   `generate_quiz_html.py`: Compiles the four HTML quiz pages (`quiz-quick.html`, `quiz-standard.html`, `quiz-full.html`, and `quiz-extended.html`) dynamically from a shared template, setting correct navigation states and parameterized initialization calls.
*   `html_cache/`: A local directory containing cached HTML pages for each U.S. state. This prevents re-downloading the pages on every run.

---

## Instructions: Regenerating Data & Pages

To completely regenerate the dataset and rebuild the quiz pages:

### Step 1: Run the scraper & base parser
Run the base generation script to download the survey pages (if not cached) and output the base 122-question dataset:
```bash
python3 scrape_and_generate.py
```
*   **What this does:**
    *   Downloads 51 state pages (if they don't already exist under `html_cache/`) from `http://dialect.redlog.net/staticmaps/state_XX.html`.
    *   Parses the percentages for all 122 questions.
    *   Writes `dialect-data-survey.js` in the parent folder.

### Step 2: Run the extension script
Run the extension script to output the modeled regional dialect questions:
```bash
python3 extend_data.py
```
*   **What this does:**
    *   Calculates deterministic regional distributions for the additional questions.
    *   Writes `dialect-data-extended.js` in the parent folder, which automatically merges survey and extended data dynamically in the browser.

### Step 3: Compile the quiz HTML pages
Run the compiler script to regenerate all four quiz HTML files in the project root:
```bash
python3 generate_quiz_html.py
```
*   **What this does:**
    *   Generates `quiz-quick.html`, `quiz-standard.html`, `quiz-full.html`, and `quiz-extended.html` from a shared template.
    *   Injects titles, descriptions, and navigation links, and parameterizes the `initQuiz(mode)` calls dynamically.

---

## Path Resolution Notes

All scripts use **portable relative path resolution** (using `__file__` in Python). This means:
*   You can execute them from any working directory (e.g., from the project root or from inside this `pipeline/` directory).
*   They will always correctly write `dialect-data-survey.js` and `dialect-data-extended.js` in the parent folder.
*   They will always download/cache the HTML pages inside the `pipeline/html_cache/` directory.
