import os
from dataclasses import dataclass

@dataclass
class QuizConfig:
    name: str  # e.g., "Quick", "Standard", "Full", "Extended"
    q_count: int
    dek: str
    disclaimer: str = ""

    @property
    def mode(self) -> str:
        return self.name.lower()

    @property
    def filename(self) -> str:
        return f"quiz-{self.mode}.html"

    @property
    def heading(self) -> str:
        return f"{self.name} Language Quiz"

    @property
    def title(self) -> str:
        return f"{self.heading} — Dialect Map Quiz"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="wrap">
  <nav class="nav-header">
    <a href="index.html" class="nav-brand">Dialect Map Quiz</a>
    <div class="nav-links">
      {nav_links}
    </div>
  </nav>

  <header class="masthead">
    <h1>{heading}</h1>
    <p class="dek">{dek}</p>
  </header>{disclaimer}
  <div class="progress-bar" id="progress-bar">
    <span id="progress-text">0 of {q_count} answered</span>
    <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
  </div>

  <div class="toolbar" id="toolbar">
    <button class="btn" id="clear-btn">Clear progress</button>
    <button class="btn" id="reset-btn">New questions</button>
    <button class="btn" id="random-btn">Answer randomly (demo)</button>
  </div>

  <div class="layout">
    <div class="quiz" id="quiz"></div>

    <div class="results">
      <div class="panel">
        <h2>Your dialect map</h2>
        <p class="sub">Redder areas talk more like you; bluer areas least.</p>
        <p class="headline" id="headline" style="display:none"></p>
        <div id="map-wrap">
          <div class="empty" id="map-empty">Answer a question to reveal your map.</div>
          <svg class="usmap" id="usmap" viewBox="0 0 960 600" style="display:none">
            <style>
              .state-border {{ fill: none; stroke: rgba(255,255,255,0.55); stroke-width: 0.7px; }}
              .city-dot.top {{ fill: #1a7f37; stroke: #fff; stroke-width: 1px; }}
              .city-dot.bottom {{ fill: #2457b5; stroke: #fff; stroke-width: 1px; }}
              .city-label {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; fill: #1a1a1a; paint-order: stroke; stroke: #fff; stroke-width: 2.5px; stroke-linejoin: round; }}
            </style>
          </svg>
        </div>
        <div class="legend" id="legend" style="display:none">
          <span>Least like you</span><span class="grad"></span><span>Most like you</span>
        </div>
        <div id="share-wrap" style="display:none; text-align:center; margin-top:16px;">
          <button class="btn primary" id="share-btn" style="width: 100%;">Save map as PNG</button>
        </div>
      </div>

      <div class="panel" id="cities-panel" style="display:none">
        <h2>Cities most &amp; least like you</h2>
        <p class="sub">Interpolated from the nearest survey responses.</p>
        <div class="citygrid">
          <div><h4 class="most">Most similar</h4><ol id="top-cities"></ol></div>
          <div><h4 class="least">Least similar</h4><ol id="bottom-cities"></ol></div>
        </div>
      </div>

      <div class="panel" id="giveaway-panel" style="display:none">
        <h2>What gave you away</h2>
        <p class="sub">Answers that point most strongly to <span id="top-state-name"></span>.</p>
        <div class="giveaway" id="giveaway"></div>
      </div>
    </div>
  </div>

  <section class="longform" id="methodology">
    <h2>How your map is calculated</h2>
    <p>This map runs on the <strong>Harvard Dialect Survey</strong>, a study of American English by
      Bert Vaux and Scott Golder. For each question, the survey recorded the percentage of respondents in every U.S. state who chose each answer.</p>

    <p><span class="lead">1. Scoring each state.</span> Your similarity to a state is the average probability that a resident of that state matches your answers:</p>
    <span class="formula">similarity(state) = average over your answers of&nbsp; P( resident of state gives your answer )</span>

    <p><span class="lead">2. Drawing the smooth map.</span> We use <strong>Gaussian kernel smoothing</strong> to turn the 51 state scores into a continuous surface, stretched to your range so contrast remains visible.</p>

    <p><span class="lead">3. Cities &amp; giveaway.</span> Cities are scored by evaluating the smoothed surface at their locations. The "what gave you away" panel highlights choices that are far more common in your top state than nationwide.</p>
  </section>

  <footer class="foot">
    <span class="badge">All 50 states + D.C.</span><br/>
    Built on the Harvard Dialect Survey (Bert Vaux &amp; Scott Golder), © its authors under
    CC&nbsp;BY-NC-SA&nbsp;3.0. Map geometry: us-atlas.
  </footer>
</div>

<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
<script src="dialect-data-survey.js"></script>
<script src="dialect-data-extended.js"></script>
<script src="quiz-common.js"></script>
<script>
  initQuiz('{mode}');
</script>
</body>
</html>
"""

QUIZZES: list[QuizConfig] = [
    QuizConfig(
        name="Quick",
        q_count=24,
        dek="Answer 24 core dialect questions. Watch the map update in real-time to find where in the United States people speak the most like you."
    ),
    QuizConfig(
        name="Standard",
        q_count=60,
        dek="Answer 60 high-value, representative survey questions for a balanced and accurate dialect map."
    ),
    QuizConfig(
        name="Full",
        q_count=122,
        dek="Answer all 122 questions from the original Harvard Dialect Survey to capture subtle regional speech nuances."
    ),
    QuizConfig(
        name="Extended",
        q_count=148,
        dek="Answer all 148 questions. Watch the map update in real-time to find where in the United States people speak the most like you.",
        disclaimer="""
  <div class="disclaimer-box">
    <strong>Note on sources:</strong> This extended quiz contains all 122 questions from the official Harvard Dialect Survey, plus 26 extra dialect and pronunciation questions (such as &ldquo;coyote,&rdquo; &ldquo;theater,&rdquo; or &ldquo;genuine&rdquo;) modeled from other linguistic sources and studies.
  </div>
"""
    )
]

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, '..')

    nav_items = [
        ("index.html", "Home", "home"),
        ("quiz-quick.html", "Quick Quiz", "quick"),
        ("quiz-standard.html", "Standard Quiz", "standard"),
        ("quiz-full.html", "Full Quiz", "full"),
        ("quiz-extended.html", "Extended Quiz", "extended"),
        ("explore.html", "Explore", "explore")
    ]

    for quiz in QUIZZES:
        # Build navigation HTML
        nav_links = []
        for href, label, m in nav_items:
            active_class = ' class="active"' if m == quiz.mode else ''
            nav_links.append(f'<a href="{href}"{active_class}>{label}</a>')
        nav_links_str = "\n      ".join(nav_links)

        html_content = HTML_TEMPLATE.format(
            title=quiz.title,
            heading=quiz.heading,
            dek=quiz.dek,
            q_count=quiz.q_count,
            disclaimer=quiz.disclaimer,
            mode=quiz.mode,
            nav_links=nav_links_str
        )

        output_path = os.path.join(project_root, quiz.filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"Generated {quiz.filename} ({quiz.mode}) successfully!")

if __name__ == '__main__':
    main()
