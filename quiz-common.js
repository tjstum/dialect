(function () {
  "use strict";

  var QUIZ_MODE = 'quick';
  var answers = {};
  var projection = null, pathGen = null, mapReady = false;
  var anchors = [];               // {st, px, py, score} — continental kernel anchors
  var insetFeatureByState = {};   // AK / HI map shapes, filled by their own score
  var BW = 46;                    // gaussian bandwidth in px (tuned for 51 anchors)
  var GRID_STEP = 6;
  var nx, ny;
  var ACTIVE = [];                // the shuffled subset of questions shown this run

  // representative cities for the ranking panels
  var CITIES = [
    { name: "Boston, MA", lat: 42.36, lon: -71.06 }, { name: "Portland, ME", lat: 43.66, lon: -70.26 },
    { name: "New York, NY", lat: 40.71, lon: -74.01 }, { name: "Buffalo, NY", lat: 42.89, lon: -78.88 },
    { name: "Philadelphia, PA", lat: 39.95, lon: -75.16 }, { name: "Pittsburgh, PA", lat: 40.44, lon: -79.99 },
    { name: "Baltimore, MD", lat: 39.29, lon: -76.61 }, { name: "Washington, DC", lat: 38.91, lon: -77.04 },
    { name: "Atlanta, GA", lat: 33.75, lon: -84.39 }, { name: "Charlotte, NC", lat: 35.23, lon: -80.84 },
    { name: "Nashville, TN", lat: 36.16, lon: -86.78 }, { name: "Miami, FL", lat: 25.76, lon: -80.19 },
    { name: "New Orleans, LA", lat: 29.95, lon: -90.07 }, { name: "Houston, TX", lat: 29.76, lon: -95.37 },
    { name: "Dallas, TX", lat: 32.78, lon: -96.80 }, { name: "Oklahoma City, OK", lat: 35.47, lon: -97.52 },
    { name: "Chicago, IL", lat: 41.88, lon: -87.63 }, { name: "Detroit, MI", lat: 42.33, lon: -83.05 },
    { name: "Cleveland, OH", lat: 41.50, lon: -81.69 }, { name: "Milwaukee, WI", lat: 43.04, lon: -87.91 },
    { name: "Minneapolis, MN", lat: 44.98, lon: -93.27 }, { name: "Omaha, NE", lat: 41.26, lon: -95.93 },
    { name: "St. Louis, MO", lat: 38.63, lon: -90.20 }, { name: "Kansas City, MO", lat: 39.10, lon: -94.58 },
    { name: "Denver, CO", lat: 39.74, lon: -104.99 }, { name: "Salt Lake City, UT", lat: 40.76, lon: -111.89 },
    { name: "Phoenix, AZ", lat: 33.45, lon: -112.07 }, { name: "Albuquerque, NM", lat: 35.08, lon: -106.65 },
    { name: "Los Angeles, CA", lat: 34.05, lon: -118.24 }, { name: "San Francisco, CA", lat: 37.77, lon: -122.42 },
    { name: "Seattle, WA", lat: 47.61, lon: -122.33 }, { name: "Portland, OR", lat: 45.52, lon: -122.68 }
  ];

  // ---------- Build the quiz (random subset, shuffled, each run) ----------
  var quizEl = document.getElementById("quiz");
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  
  function saveProgress() {
    try {
      var active_qids = ACTIVE.map(function (q) { return q.id; });
      localStorage.setItem("dialect_quiz_progress_" + QUIZ_MODE, JSON.stringify({
        answers: answers,
        active_qids: active_qids
      }));
    } catch (e) {
      console.error("Failed to save progress to localStorage", e);
    }
  }

  function buildQuiz(forceNewShuffle) {
    var questionsPool;
    if (QUIZ_MODE === 'quick') {
      questionsPool = QUESTIONS.slice(0, 24);
    } else if (QUIZ_MODE === 'standard') {
      questionsPool = QUESTIONS.filter(function (q) { return q.hq !== undefined; }).slice(0, 60);
    } else if (QUIZ_MODE === 'full') {
      questionsPool = QUESTIONS.filter(function (q) { return q.hq !== undefined; });
    } else { // extended
      questionsPool = QUESTIONS;
    }

    var saved = null;
    if (!forceNewShuffle) {
      try {
        var raw = localStorage.getItem("dialect_quiz_progress_" + QUIZ_MODE);
        if (raw) {
          saved = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Failed to load progress from localStorage", e);
      }
    }

    if (saved && saved.active_qids && saved.active_qids.length) {
      var poolById = {};
      questionsPool.forEach(function (q) { poolById[q.id] = q; });
      ACTIVE = [];
      saved.active_qids.forEach(function (qid) {
        if (poolById[qid]) {
          ACTIVE.push(poolById[qid]);
        }
      });
      if (ACTIVE.length === 0) {
        ACTIVE = shuffle(questionsPool.slice());
        answers = {};
      } else {
        answers = saved.answers || {};
      }
    } else {
      ACTIVE = shuffle(questionsPool.slice());
      answers = {};
    }

    saveProgress();

    quizEl.innerHTML = "";
    document.getElementById("progress-text").textContent = "0 of " + ACTIVE.length + " answered";
    document.getElementById("progress-fill").style.width = "0%";
    ACTIVE.forEach(function (q, i) {
      var card = document.createElement("div"); card.className = "question";
      card.id = "q-card-" + i;
      var num = document.createElement("div"); num.className = "qnum";
      num.textContent = "Question " + (i + 1) + " of " + ACTIVE.length; card.appendChild(num);
      var h = document.createElement("h3"); h.innerHTML = q.text; card.appendChild(h);
      var opts = document.createElement("div"); opts.className = "options";
      var savedAnswer = answers[q.id];
      q.options.forEach(function (o) {
        var lab = document.createElement("label"); lab.className = "opt";
        lab.setAttribute("data-q", q.id); lab.setAttribute("data-o", o.id);
        var input = document.createElement("input"); input.type = "radio"; input.name = q.id; input.value = o.id;
        if (savedAnswer === o.id) {
          input.checked = true;
          lab.classList.add("selected");
        }
        input.addEventListener("change", function () {
          answers[q.id] = o.id;
          markSelected(q.id, o.id);
          update();
          saveProgress();
          setTimeout(function () {
            var nextIndex = i + 1;
            var nextCard = document.getElementById("q-card-" + nextIndex);
            if (nextCard) {
              nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        });
        var span = document.createElement("span"); span.textContent = o.label;
        lab.appendChild(input); lab.appendChild(span); opts.appendChild(lab);
      });
      card.appendChild(opts); quizEl.appendChild(card);
    });
  }
  
  function markSelected(qid, oid) {
    document.querySelectorAll('label.opt[data-q="' + qid + '"]').forEach(function (l) {
      l.classList.toggle("selected", l.getAttribute("data-o") === oid);
    });
  }

  // ---------- Scoring ----------
  function stateScore(st) {
    var answered = Object.keys(answers);
    if (answered.length === 0) return 0;
    var sum = 0, n = 0;
    answered.forEach(function (qid) {
      var d = stateDist(st, qid);
      if (Object.keys(d).length) { sum += (d[answers[qid]] || 0); n++; }
    });
    return n ? sum / n : 0;
  }

  // ---------- Map ----------
  var svg = d3.select("#usmap");

  function loadMap() {
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(function (us) {
      var fc = topojson.feature(us, us.objects.states);
      var contGeoms = us.objects.states.geometries.filter(function (g) {
        return g.id !== "02" && g.id !== "15";
      });
      var outline = topojson.merge(us, contGeoms);
      projection = d3.geoAlbersUsa().fitSize([960, 600], fc);
      pathGen = d3.geoPath(projection);

      var defs = svg.append("defs");
      defs.append("clipPath").attr("id", "us-clip").append("path").attr("d", pathGen(outline));

      svg.append("g").attr("class", "heat").attr("clip-path", "url(#us-clip)");
      svg.append("g").attr("class", "insets");

      svg.append("g").attr("class", "borders")
        .selectAll("path").data(fc.features).enter().append("path")
        .attr("class", "state-border").attr("d", pathGen);

      svg.append("g").attr("class", "cities");

      fc.features.forEach(function (f) {
        if (f.properties.name === "Alaska") insetFeatureByState.AK = f;
        if (f.properties.name === "Hawaii") insetFeatureByState.HI = f;
      });

      anchors = STATE_KEYS.filter(function (st) {
        return STATE_DATA[st] && st !== "AK" && st !== "HI";
      }).map(function (st) {
        var xy = projection(STATE_CENTROID[st]);
        return { st: st, px: xy[0], py: xy[1], score: 0 };
      });

      nx = Math.ceil(960 / GRID_STEP) + 1;
      ny = Math.ceil(600 / GRID_STEP) + 1;
      mapReady = true;
      if (Object.keys(answers).length) update();
    }).catch(function (err) {
      document.getElementById("map-empty").textContent =
        "Could not load the U.S. map (an internet connection is needed the first time). City rankings still work below.";
      console.error(err);
    });
  }

  function valueAt(x, y) {
    var num = 0, den = 0;
    for (var k = 0; k < anchors.length; k++) {
      var dx = x - anchors[k].px, dy = y - anchors[k].py;
      var w = Math.exp(-(dx * dx + dy * dy) / (2 * BW * BW));
      num += w * anchors[k].score; den += w;
    }
    return den > 0 ? num / den : 0;
  }

  function colorScale(min, max) {
    if (min === max) { min -= 0.01; max += 0.01; }
    return d3.scaleLinear().domain([min, (min + max) / 2, max])
      .range(["#2457b5", "#f4f4c3", "#b5403a"]).clamp(true);
  }

  function drawHeat() {
    var values = new Array(nx * ny);
    for (var j = 0; j < ny; j++)
      for (var i = 0; i < nx; i++)
        values[j * nx + i] = valueAt(i * GRID_STEP, j * GRID_STEP);

    var min = d3.min(values), max = d3.max(values);
    var color = colorScale(min, max);
    var thresholds = d3.range(min, max, (max - min) / 12 || 1);
    var contours = d3.contours().size([nx, ny]).thresholds(thresholds)(values);
    var gp = d3.geoPath(d3.geoIdentity().scale(GRID_STEP));

    var heat = svg.select("g.heat");
    var sel = heat.selectAll("path").data(contours);
    sel.enter().append("path").merge(sel)
      .attr("d", gp).attr("fill", function (d) { return color(d.value); }).attr("stroke", "none");
    sel.exit().remove();
    return color;
  }

  function drawInsets(color) {
    var g = svg.select("g.insets"); g.selectAll("*").remove();
    ["AK", "HI"].forEach(function (st) {
      var f = insetFeatureByState[st]; if (!f) return;
      g.append("path").attr("d", pathGen(f)).attr("fill", color(stateScore(st))).attr("stroke", "none");
    });
  }

  // ---------- Update ----------
  function update() {
    var answered = ACTIVE.map(function (q) { return q.id; }).filter(function (qid) {
      return answers[qid] !== undefined;
    });
    var total = ACTIVE.length;
    document.getElementById("progress-text").textContent = answered.length + " of " + total + " answered";
    document.getElementById("progress-fill").style.width = (100 * answered.length / total) + "%";

    if (answered.length === 0) {
      document.getElementById("map-empty").style.display = "block";
      document.getElementById("map-empty").textContent = "Answer a question to reveal your map.";
      svg.style("display", "none");
      ["legend", "cities-panel", "giveaway-panel", "headline", "share-wrap"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
      return;
    }

    anchors.forEach(function (a) { a.score = stateScore(a.st); });

    if (mapReady) {
      document.getElementById("map-empty").style.display = "none";
      svg.style("display", "block");
      document.getElementById("legend").style.display = "flex";
      drawInsets(drawHeat());
    }

    var scored = CITIES.map(function (c) {
      var xy = projection ? projection([c.lon, c.lat]) : null;
      var s = xy ? valueAt(xy[0], xy[1]) : 0;
      return { name: c.name, score: s, xy: xy };
    }).sort(function (a, b) { return b.score - a.score; });

    var top = scored.slice(0, 3), bottom = scored.slice(-3).reverse();
    renderCityList("top-cities", top); renderCityList("bottom-cities", bottom);
    document.getElementById("cities-panel").style.display = "block";

    var best = anchors.slice().sort(function (a, b) { return b.score - a.score; })[0];
    if (best) {
      var hl = document.getElementById("headline");
      hl.style.display = "block";
      hl.innerHTML = "You talk most like someone from <b>" + STATE_NAMES[best.st] + "</b> — about " +
        Math.round(best.score * 100) + "% of your answers match a typical resident.";
    }

    if (mapReady) drawCityMarkers(top, bottom);
    renderGiveaway(answered);

    var shareWrap = document.getElementById("share-wrap");
    if (shareWrap) {
      shareWrap.style.display = (answered.length === total) ? "block" : "none";
    }
  }

  function renderCityList(elId, arr) {
    var ol = document.getElementById(elId); ol.innerHTML = "";
    arr.forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML = c.name + ' <span class="pct">(' + Math.round(c.score * 100) + "%)</span>";
      ol.appendChild(li);
    });
  }

  function drawCityMarkers(top, bottom) {
    var g = svg.select("g.cities"); g.selectAll("*").remove();
    function plot(arr, cls) {
      arr.forEach(function (c) {
        if (!c.xy) return;
        g.append("circle").attr("class", "city-dot " + cls).attr("cx", c.xy[0]).attr("cy", c.xy[1]).attr("r", 4.5);
        g.append("text").attr("class", "city-label").attr("x", c.xy[0] + 6).attr("y", c.xy[1] + 3)
          .text(c.name.replace(/,.*/, ""));
      });
    }
    plot(top, "top"); plot(bottom, "bottom");
  }

  function renderGiveaway(answered) {
    var best = anchors.slice().sort(function (a, b) { return b.score - a.score; })[0];
    if (!best) return;
    document.getElementById("top-state-name").textContent = STATE_NAMES[best.st];
    var rows = answered.map(function (qid) {
      var oid = answers[qid];
      var pState = stateDist(best.st, qid)[oid] || 0;
      var pNat = nationalProb(qid, oid) || 0.0001;
      var label = ""; QUESTIONS_BY_ID[qid].options.forEach(function (o) { if (o.id === oid) label = o.label; });
      return { q: QUESTIONS_BY_ID[qid].text, ans: label, lift: pState / pNat };
    }).filter(function (r) { return r.lift > 1.08; })
      .sort(function (a, b) { return b.lift - a.lift; }).slice(0, 4);

    var box = document.getElementById("giveaway"); box.innerHTML = "";
    if (rows.length === 0) {
      box.innerHTML = '<div class="row" style="color:#6b6b6b">Your answers are regionally neutral so far — keep going.</div>';
    } else {
      rows.forEach(function (r) {
        var div = document.createElement("div"); div.className = "row";
        div.innerHTML = "<span>" + r.q + '</span><span class="ans">' + r.ans + "</span>";
        box.appendChild(div);
      });
    }
    document.getElementById("giveaway-panel").style.display = "block";
  }

  // ---------- PNG Export ----------
  function downloadPNG() {
    var svgEl = document.getElementById("usmap");
    if (!svgEl) return;

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgEl);

    var svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    var DOMURL = window.URL || window.webkitURL || window;
    var blobURL = DOMURL.createObjectURL(svgBlob);

    var image = new Image();
    image.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 600;
      var context = canvas.getContext("2d");
      
      // Draw background color (#fbfbf9) to prevent transparency issues
      context.fillStyle = "#fbfbf9";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.drawImage(image, 0, 0, 960, 600);

      // Draw Legend overlay
      var legendWidth = 280;
      var legendHeight = 10;
      var legendX = (canvas.width - legendWidth) / 2;
      var legendY = canvas.height - 30;

      // Draw background panel for the legend
      context.fillStyle = "rgba(251, 251, 249, 0.9)";
      if (typeof context.roundRect === "function") {
        context.beginPath();
        context.roundRect(legendX - 110, legendY - 8, legendWidth + 220, legendHeight + 16, 13);
        context.fill();
      } else {
        context.fillRect(legendX - 110, legendY - 8, legendWidth + 220, legendHeight + 16);
      }

      // Draw gradient bar
      var grad = context.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
      grad.addColorStop(0, "#2457b5");
      grad.addColorStop(0.5, "#f4f4c3");
      grad.addColorStop(1, "#b5403a");
      
      context.fillStyle = grad;
      if (typeof context.roundRect === "function") {
        context.beginPath();
        context.roundRect(legendX, legendY, legendWidth, legendHeight, 5);
        context.fill();
      } else {
        context.fillRect(legendX, legendY, legendWidth, legendHeight);
      }

      // Draw labels
      context.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      context.fillStyle = "#6b6b6b";
      context.textBaseline = "middle";

      context.textAlign = "right";
      context.fillText("Least like you", legendX - 10, legendY + legendHeight / 2);

      context.textAlign = "left";
      context.fillText("Most like you", legendX + legendWidth + 10, legendY + legendHeight / 2);

      canvas.toBlob(function (pngBlob) {
        var url = DOMURL.createObjectURL(pngBlob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "dialect-map.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        DOMURL.revokeObjectURL(url);
      }, "image/png");

      DOMURL.revokeObjectURL(blobURL);
    };
    image.onerror = function(err) {
      console.error("Failed to load SVG image for canvas rendering:", err);
    };
    image.src = blobURL;
  }

  // ---------- Controls ----------
  var clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      try {
        localStorage.removeItem("dialect_quiz_progress_" + QUIZ_MODE);
      } catch (e) {
        console.error("Failed to clear progress from localStorage", e);
      }
      answers = {};
      buildQuiz(true);
      update();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.getElementById("reset-btn").addEventListener("click", function () {
    answers = {};
    buildQuiz(true);
    update();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("random-btn").addEventListener("click", function () {
    ACTIVE.forEach(function (q) {
      var pick = q.options[Math.floor(Math.random() * q.options.length)];
      answers[q.id] = pick.id;
      var input = document.querySelector('input[name="' + q.id + '"][value="' + pick.id + '"]');
      if (input) {
        input.checked = true;
      }
      markSelected(q.id, pick.id);
    });
    update();
    saveProgress();
  });

  var shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", downloadPNG);
  }

  window.initQuiz = function (mode) {
    QUIZ_MODE = mode;
    buildQuiz();
    loadMap();
    update();
  };
})();
