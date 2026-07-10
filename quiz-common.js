(function () {
    "use strict";

    let QUIZ_MODE = 'quick';
    let answers = {};
    let projection = null, pathGen = null, mapReady = false;
    let anchors = [];               // {st, px, py, score} — continental kernel anchors
    const insetFeatureByState = {};   // AK / HI map shapes, filled by their own score
    const BW = 46;                    // gaussian bandwidth in px (tuned for 51 anchors)
    const GRID_STEP = 6;
    let nx, ny;
    let ACTIVE = [];                // the shuffled subset of questions shown this run
    let completionEventFired = false;
    let startEventFired = false;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // representative cities for the ranking panels
    const CITIES = [
        {name: "Boston, MA", lat: 42.36, lon: -71.06}, {
            name: "Portland, ME",
            lat: 43.66,
            lon: -70.26
        },
        {name: "New York, NY", lat: 40.71, lon: -74.01}, {
            name: "Buffalo, NY",
            lat: 42.89,
            lon: -78.88
        },
        {name: "Philadelphia, PA", lat: 39.95, lon: -75.16}, {
            name: "Pittsburgh, PA",
            lat: 40.44,
            lon: -79.99
        },
        {name: "Baltimore, MD", lat: 39.29, lon: -76.61}, {
            name: "Washington, DC",
            lat: 38.91,
            lon: -77.04
        },
        {name: "Atlanta, GA", lat: 33.75, lon: -84.39}, {
            name: "Charlotte, NC",
            lat: 35.23,
            lon: -80.84
        },
        {name: "Nashville, TN", lat: 36.16, lon: -86.78}, {
            name: "Miami, FL",
            lat: 25.76,
            lon: -80.19
        },
        {name: "New Orleans, LA", lat: 29.95, lon: -90.07}, {
            name: "Houston, TX",
            lat: 29.76,
            lon: -95.37
        },
        {name: "Dallas, TX", lat: 32.78, lon: -96.80}, {
            name: "Oklahoma City, OK",
            lat: 35.47,
            lon: -97.52
        },
        {name: "Chicago, IL", lat: 41.88, lon: -87.63}, {
            name: "Detroit, MI",
            lat: 42.33,
            lon: -83.05
        },
        {name: "Cleveland, OH", lat: 41.50, lon: -81.69}, {
            name: "Milwaukee, WI",
            lat: 43.04,
            lon: -87.91
        },
        {name: "Minneapolis, MN", lat: 44.98, lon: -93.27}, {
            name: "Omaha, NE",
            lat: 41.26,
            lon: -95.93
        },
        {name: "St. Louis, MO", lat: 38.63, lon: -90.20}, {
            name: "Kansas City, MO",
            lat: 39.10,
            lon: -94.58
        },
        {name: "Denver, CO", lat: 39.74, lon: -104.99}, {
            name: "Salt Lake City, UT",
            lat: 40.76,
            lon: -111.89
        },
        {name: "Phoenix, AZ", lat: 33.45, lon: -112.07}, {
            name: "Albuquerque, NM",
            lat: 35.08,
            lon: -106.65
        },
        {name: "Los Angeles, CA", lat: 34.05, lon: -118.24}, {
            name: "San Francisco, CA",
            lat: 37.77,
            lon: -122.42
        },
        {name: "Seattle, WA", lat: 47.61, lon: -122.33}, {
            name: "Portland, OR",
            lat: 45.52,
            lon: -122.68
        }
    ];

    // ---------- Build the quiz (random subset, shuffled, each run) ----------
    const quizEl = document.getElementById("quiz");

    const shuffle = a => {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    function saveProgress() {
        try {
            const active_qids = ACTIVE.map(q => q.id);
            localStorage.setItem(`dialect_quiz_progress_${QUIZ_MODE}`, JSON.stringify({
                answers,
                active_qids
            }));
        } catch (e) {
            console.error("Failed to save progress to localStorage", e);
        }
    }

    function buildQuiz(forceNewShuffle) {
        let questionsPool;
        if (QUIZ_MODE === 'quick') {
            questionsPool = QUESTIONS.slice(0, 24);
        } else if (QUIZ_MODE === 'standard') {
            questionsPool = QUESTIONS.filter(q => q.hq !== undefined).slice(0, 60);
        } else if (QUIZ_MODE === 'full') {
            questionsPool = QUESTIONS.filter(q => q.hq !== undefined);
        } else { // extended
            questionsPool = QUESTIONS;
        }

        let saved = null;
        if (!forceNewShuffle) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlState = urlParams.get('state');
                if (urlState) {
                    const decoded = atob(urlState);
                    saved = JSON.parse(decoded);
                    // Clean the query string in the address bar
                    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            } catch (e) {
                console.error("Failed to parse state from URL parameter", e);
            }

            if (!saved) {
                try {
                    const raw = localStorage.getItem(`dialect_quiz_progress_${QUIZ_MODE}`);
                    if (raw) {
                        saved = JSON.parse(raw);
                    }
                } catch (e) {
                    console.error("Failed to load progress from localStorage", e);
                }
            }
        }

        if (saved && saved.active_qids && saved.active_qids.length) {
            const poolById = {};
            questionsPool.forEach(q => {
                poolById[q.id] = q;
            });
            ACTIVE = [];
            saved.active_qids.forEach(qid => {
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

        startEventFired = (Object.keys(answers).length > 0);
        saveProgress();

        quizEl.innerHTML = "";
        document.getElementById("progress-text").textContent = `0 of ${ACTIVE.length} answered`;
        document.getElementById("progress-fill").style.width = "0%";

        ACTIVE.forEach((q, i) => {
            const card = document.createElement("div");
            card.className = "question";
            card.id = `q-card-${i}`;

            const num = document.createElement("div");
            num.className = "qnum-row";
            num.innerHTML = `<span class="qnum">Question ${i + 1} of ${ACTIVE.length}</span>` +
                `<a href="explore.html?q=${q.id}" target="_blank" class="explore-q-link">🔎</a>`;
            card.appendChild(num);

            const h = document.createElement("h3");
            h.innerHTML = q.text;
            card.appendChild(h);

            const opts = document.createElement("div");
            opts.className = "options";

            const savedAnswer = answers[q.id];
            q.options.forEach(o => {
                const lab = document.createElement("label");
                lab.className = "opt";
                lab.setAttribute("data-q", q.id);
                lab.setAttribute("data-o", o.id);

                const input = document.createElement("input");
                input.type = "radio";
                input.name = q.id;
                input.value = o.id;

                if (savedAnswer === o.id) {
                    input.checked = true;
                    lab.classList.add("selected");
                }

                input.addEventListener("change", async () => {
                    answers[q.id] = o.id;
                    markSelected(q.id, o.id);
                    if (window.gtag) {
                        window.gtag('event', 'select_answer', {
                            'question_id': q.id,
                            'option_id': o.id,
                            'quiz_mode': QUIZ_MODE
                        });
                    }
                    update();
                    saveProgress();
                    await sleep(100);
                    const nextIndex = i + 1;
                    const nextCard = document.getElementById(`q-card-${nextIndex}`);
                    if (nextCard) {
                        nextCard.scrollIntoView({behavior: 'smooth', block: 'center'});
                    }
                });

                const span = document.createElement("span");
                span.textContent = o.label;
                lab.appendChild(input);
                lab.appendChild(span);
                opts.appendChild(lab);
            });
            card.appendChild(opts);
            quizEl.appendChild(card);
        });
    }

    function markSelected(qid, oid) {
        document.querySelectorAll(`label.opt[data-q="${qid}"]`).forEach(l => {
            l.classList.toggle("selected", l.getAttribute("data-o") === oid);
        });
    }

    // ---------- Scoring ----------
    function stateScore(st) {
        const answered = Object.keys(answers);
        if (answered.length === 0) return 0;
        let sum = 0, n = 0;
        answered.forEach(qid => {
            const d = stateDist(st, qid);
            if (Object.keys(d).length) {
                sum += (d[answers[qid]] || 0);
                n++;
            }
        });
        return n ? sum / n : 0;
    }

    // ---------- Map ----------
    const svg = d3.select("#usmap");

    async function loadMap() {
        try {
            const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
            const fc = topojson.feature(us, us.objects.states);
            const contGeoms = us.objects.states.geometries.filter(g => g.id !== "02" && g.id !== "15");
            const outline = topojson.merge(us, contGeoms);
            projection = d3.geoAlbersUsa().fitSize([960, 600], fc);
            pathGen = d3.geoPath(projection);

            const defs = svg.append("defs");
            defs.append("clipPath").attr("id", "us-clip").append("path").attr("d", pathGen(outline));

            svg.append("g").attr("class", "heat").attr("clip-path", "url(#us-clip)");
            svg.append("g").attr("class", "insets");

            svg.append("g").attr("class", "borders")
                .selectAll("path").data(fc.features).enter().append("path")
                .attr("class", "state-border").attr("d", pathGen);

            svg.append("g").attr("class", "cities");

            fc.features.forEach(f => {
                if (f.properties.name === "Alaska") insetFeatureByState.AK = f;
                if (f.properties.name === "Hawaii") insetFeatureByState.HI = f;
            });

            anchors = STATE_KEYS.filter(st => STATE_DATA[st] && st !== "AK" && st !== "HI").map(st => {
                const xy = projection(STATE_CENTROID[st]);
                return {st, px: xy[0], py: xy[1], score: 0};
            });

            nx = Math.ceil(960 / GRID_STEP) + 1;
            ny = Math.ceil(600 / GRID_STEP) + 1;
            mapReady = true;
            if (Object.keys(answers).length) update();
        } catch (err) {
            document.getElementById("map-empty").textContent =
                "Could not load the U.S. map (an internet connection is needed the first time). City rankings still work below.";
            console.error(err);
        }
    }

    function valueAt(x, y) {
        let num = 0, den = 0;
        for (let k = 0; k < anchors.length; k++) {
            const dx = x - anchors[k].px, dy = y - anchors[k].py;
            const w = Math.exp(-(dx * dx + dy * dy) / (2 * BW * BW));
            num += w * anchors[k].score;
            den += w;
        }
        return den > 0 ? num / den : 0;
    }

    function colorScale(min, max) {
        if (min === max) {
            min -= 0.01;
            max += 0.01;
        }
        return d3.scaleLinear().domain([min, (min + max) / 2, max])
            .range(["#2457b5", "#f4f4c3", "#b5403a"]).clamp(true);
    }

    function drawHeat() {
        const values = new Array(nx * ny);
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                values[j * nx + i] = valueAt(i * GRID_STEP, j * GRID_STEP);
            }
        }

        const min = d3.min(values), max = d3.max(values);
        const color = colorScale(min, max);
        const thresholds = d3.range(min, max, (max - min) / 12 || 1);
        const contours = d3.contours().size([nx, ny]).thresholds(thresholds)(values);
        const gp = d3.geoPath(d3.geoIdentity().scale(GRID_STEP));

        const heat = svg.select("g.heat");
        const sel = heat.selectAll("path").data(contours);

        sel.enter().append("path").merge(sel)
            .attr("d", gp).attr("fill", d => color(d.value)).attr("stroke", "none");
        sel.exit().remove();
        return color;
    }

    function drawInsets(color) {
        const g = svg.select("g.insets");
        g.selectAll("*").remove();
        ["AK", "HI"].forEach(st => {
            const f = insetFeatureByState[st];
            if (!f) return;
            g.append("path").attr("d", pathGen(f)).attr("fill", color(stateScore(st))).attr("stroke", "none");
        });
    }

    // ---------- Update ----------
    function update() {
        const answered = ACTIVE.map(q => q.id).filter(qid => answers[qid] !== undefined);
        const total = ACTIVE.length;

        // Trigger quiz_start event when the user answers their first question
        if (answered.length === 1 && !startEventFired) {
            startEventFired = true;
            if (window.gtag) {
                window.gtag('event', 'quiz_start', {'quiz_mode': QUIZ_MODE});
            }
        }

        document.getElementById("progress-text").textContent = `${answered.length} of ${total} answered`;
        document.getElementById("progress-fill").style.width = `${(100 * answered.length) / total}%`;

        const resultsEl = document.querySelector(".results");
        const hasAnswers = answered.length > 0;
        resultsEl.classList.toggle("has-answers", hasAnswers);
        resultsEl.classList.toggle("map-ready", mapReady);

        if (!hasAnswers) {
            return;
        }

        anchors.forEach(a => {
            a.score = stateScore(a.st);
        });

        if (mapReady) {
            drawInsets(drawHeat());
        }

        const scored = CITIES.map(c => {
            const xy = projection ? projection([c.lon, c.lat]) : null;
            const s = xy ? valueAt(xy[0], xy[1]) : 0;
            return {name: c.name, score: s, xy};
        }).sort((a, b) => b.score - a.score);

        const top = scored.slice(0, 3), bottom = scored.slice(-3).reverse();
        renderCityList("top-cities", top);
        renderCityList("bottom-cities", bottom);

        const best = anchors.slice().sort((a, b) => b.score - a.score)[0];
        if (best) {
            const hl = document.getElementById("headline");
            hl.innerHTML = `You talk most like someone from <b>${STATE_NAMES[best.st]}</b> — about ${Math.round(best.score * 100)}% of your answers match a typical resident.`;
        }

        if (mapReady) drawCityMarkers(top, bottom);
        renderGiveaway(answered);

        const isComplete = (answered.length === total);
        resultsEl.classList.toggle("quiz-complete", isComplete);

        if (isComplete && !completionEventFired) {
            completionEventFired = true;
            if (window.gtag) {
                window.gtag('event', 'quiz_complete', {
                    'quiz_mode': QUIZ_MODE,
                    'result_state': best ? STATE_NAMES[best.st] : 'unknown'
                });
            }
        } else if (!isComplete) {
            completionEventFired = false;
        }
    }

    function renderCityList(elId, arr) {
        const ol = document.getElementById(elId);
        ol.innerHTML = "";
        arr.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `${c.name} <span class="pct">(${Math.round(c.score * 100)}%)</span>`;
            ol.appendChild(li);
        });
    }

    function drawCityMarkers(top, bottom) {
        const g = svg.select("g.cities");
        g.selectAll("*").remove();
        const plot = (arr, cls) => {
            arr.forEach(c => {
                if (!c.xy) return;
                g.append("circle").attr("class", `city-dot ${cls}`).attr("cx", c.xy[0]).attr("cy", c.xy[1]).attr("r", 4.5);
                g.append("text").attr("class", "city-label").attr("x", c.xy[0] + 6).attr("y", c.xy[1] + 3)
                    .text(c.name.replace(/,.*/, ""));
            });
        };
        plot(top, "top");
        plot(bottom, "bottom");
    }

    function renderGiveaway(answered) {
        const best = anchors.slice().sort((a, b) => b.score - a.score)[0];
        if (!best) return;
        document.getElementById("top-state-name").textContent = STATE_NAMES[best.st];
        const rows = answered.map(qid => {
            const oid = answers[qid];
            const pState = stateDist(best.st, qid)[oid] || 0;
            const pNat = nationalProb(qid, oid) || 0.0001;
            const label = QUESTIONS_BY_ID[qid].options.find(o => o.id === oid)?.label || "";
            return {q: QUESTIONS_BY_ID[qid].text, ans: label, lift: pState / pNat};
        }).filter(r => r.lift > 1.08)
            .sort((a, b) => b.lift - a.lift).slice(0, 4);

        const box = document.getElementById("giveaway");
        box.innerHTML = "";
        if (rows.length === 0) {
            box.innerHTML = '<div class="row" style="color:#6b6b6b">Your answers are regionally neutral so far — keep going.</div>';
        } else {
            rows.forEach(r => {
                const div = document.createElement("div");
                div.className = "row";
                div.innerHTML = `<span>${r.q}</span><span class="ans">${r.ans}</span>`;
                box.appendChild(div);
            });
        }
    }

    // Helper to load images asynchronously as promises
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    // ---------- PNG Export ----------
    async function downloadPNG() {
        if (window.gtag) {
            window.gtag('event', 'save_map_png', {'quiz_mode': QUIZ_MODE});
        }
        const svgEl = document.getElementById("usmap");
        if (!svgEl) return;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgEl);

        const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
        const DOMURL = window.URL || window.webkitURL || window;
        const blobURL = DOMURL.createObjectURL(svgBlob);

        try {
            const image = await loadImage(blobURL);
            const canvas = document.createElement("canvas");
            canvas.width = 960;
            canvas.height = 700;
            const context = canvas.getContext("2d");

            // Draw background color (#fbfbf9) to prevent transparency issues
            context.fillStyle = "#fbfbf9";
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Title: mydialect - [Mode]
            const modeLabel = QUIZ_MODE.charAt(0).toUpperCase() + QUIZ_MODE.slice(1);
            context.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            context.fillStyle = "#1a1a1a";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(`mydialect — ${modeLabel}`, canvas.width / 2, 35);

            // Draw SVG map shifted down by 60px
            context.drawImage(image, 0, 60, 960, 600);

            // Draw Legend overlay
            const legendWidth = 280;
            const legendHeight = 10;
            const legendX = (canvas.width - legendWidth) / 2;
            const legendY = 630; // 60 + 600 - 30

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
            const grad = context.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
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

            // Draw URL at the very bottom
            context.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            context.fillStyle = "#8a8a82";
            context.textAlign = "center";
            context.fillText("https://mydialect.us", canvas.width / 2, canvas.height - 20);

            const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
            const url = DOMURL.createObjectURL(pngBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "dialect-map.png";
            document.body.appendChild(a);
            a.click();
            a.remove();
            DOMURL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to load SVG image for canvas rendering:", err);
        } finally {
            DOMURL.revokeObjectURL(blobURL);
        }
    }

    // ---------- Controls ----------
    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (window.gtag) {
                window.gtag('event', 'clear_progress', {'quiz_mode': QUIZ_MODE});
            }
            try {
                localStorage.removeItem(`dialect_quiz_progress_${QUIZ_MODE}`);
            } catch (e) {
                console.error("Failed to clear progress from localStorage", e);
            }
            answers = {};
            buildQuiz(true);
            update();
            window.scrollTo({top: 0, behavior: "smooth"});
        });
    }

    document.getElementById("reset-btn").addEventListener("click", () => {
        if (window.gtag) {
            window.gtag('event', 'new_questions', {'quiz_mode': QUIZ_MODE});
        }
        answers = {};
        buildQuiz(true);
        update();
        window.scrollTo({top: 0, behavior: "smooth"});
    });

    document.getElementById("random-btn").addEventListener("click", () => {
        if (window.gtag) {
            window.gtag('event', 'answer_randomly', {'quiz_mode': QUIZ_MODE});
        }
        ACTIVE.forEach(q => {
            const pick = q.options[Math.floor(Math.random() * q.options.length)];
            answers[q.id] = pick.id;
            const input = document.querySelector(`input[name="${q.id}"][value="${pick.id}"]`);
            if (input) {
                input.checked = true;
            }
            markSelected(q.id, pick.id);
        });
        update();
        saveProgress();
    });

    const shareLinkBtn = document.getElementById("share-link-btn");
    if (shareLinkBtn) {
        shareLinkBtn.addEventListener("click", async () => {
            if (window.gtag) {
                window.gtag('event', 'copy_progress_link', {'quiz_mode': QUIZ_MODE});
            }
            try {
                const active_qids = ACTIVE.map(q => q.id);
                const stateObj = {answers, active_qids};
                const encoded = btoa(JSON.stringify(stateObj));
                const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?state=${encoded}`;

                try {
                    await navigator.clipboard.writeText(shareUrl);
                    const origText = shareLinkBtn.textContent;
                    shareLinkBtn.textContent = "Copied!";
                    shareLinkBtn.classList.add("success");
                    await sleep(2000);
                    shareLinkBtn.textContent = origText;
                    shareLinkBtn.classList.remove("success");
                } catch (err) {
                    console.error("Failed to copy link to clipboard", err);
                    alert(`Here is your shareable link:\n\n${shareUrl}`);
                }
            } catch (e) {
                console.error("Failed to generate share link", e);
            }
        });
    }

    const shareBtn = document.getElementById("share-btn");
    if (shareBtn) {
        shareBtn.addEventListener("click", downloadPNG);
    }

    window.initQuiz = async mode => {
        QUIZ_MODE = mode;
        buildQuiz();
        await loadMap();
        update();
    };
})();
