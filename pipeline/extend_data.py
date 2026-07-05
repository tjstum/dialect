import re
import json
import os
from dataclasses import dataclass, field


STATE_REGION = {
    'ME': 'NE', 'NH': 'NE', 'VT': 'NE', 'MA': 'NE', 'RI': 'NE', 'CT': 'NE',
    'NY': 'MA', 'NJ': 'MA', 'PA': 'MA', 'DE': 'MA', 'MD': 'MA', 'DC': 'MA',
    'VA': 'SO', 'NC': 'SO', 'SC': 'SO', 'GA': 'SO', 'FL': 'SO', 'AL': 'SO', 'MS': 'SO', 'TN': 'SO', 'KY': 'SO', 'AR': 'SO', 'LA': 'SO', 'WV': 'SO',
    'MI': 'MW', 'OH': 'MW', 'IN': 'MW', 'IL': 'MW', 'WI': 'MW', 'MN': 'MW', 'ND': 'MW', 'SD': 'MW', 'IA': 'MW', 'NE': 'MW', 'KS': 'MW', 'MO': 'MW',
    'TX': 'SW', 'OK': 'SW', 'NM': 'SW', 'AZ': 'SW',
    'CO': 'WE', 'WY': 'WE', 'MT': 'WE', 'ID': 'WE', 'UT': 'WE', 'NV': 'WE', 'CA': 'WE', 'OR': 'WE', 'WA': 'WE', 'AK': 'WE', 'HI': 'WE'
}

@dataclass
class Option:
    id: str
    label: str
    region_weights: dict[str, float] = field(default_factory=dict)

@dataclass
class ModeledQuestion:
    id: str
    text: str
    options: list[Option]

new_questions: list[ModeledQuestion] = [
    ModeledQuestion(
        id="mirror",
        text="How do you pronounce 'mirror'?",
        options=[
            Option('two', 'Meer-er (two syllables)', {'NE': 65.0, 'MA': 65.0, 'WE': 65.0}),
            Option('one', 'Mere (one syllable)', {'SO': 65.0, 'SW': 65.0, 'MW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="coyote",
        text="How do you pronounce 'coyote'?",
        options=[
            Option('three', 'Ki-o-tee (three syllables)', {'NE': 65.0, 'MA': 65.0, 'SO': 65.0, 'MW': 65.0}),
            Option('two', 'Ki-oat (two syllables)', {'WE': 65.0, 'SW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="theater",
        text="How do you pronounce 'theater'?",
        options=[
            Option('thee_a_ter', 'Thee-a-ter', {'WE': 70.0, 'MW': 70.0, 'SO': 70.0, 'SW': 70.0, 'MA': 70.0}),
            Option('thee_a_tre', 'Thee-a-tre', {'NE': 50.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="sherbet",
        text="How do you pronounce 'sherbet'?",
        options=[
            Option('two', 'Sher-bet (two syllables)', {'NE': 65.0, 'MA': 65.0, 'WE': 65.0}),
            Option('bert', 'Sher-bert (with an extra r)', {'MW': 65.0, 'SO': 65.0, 'SW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="apricot",
        text="How do you pronounce 'apricot'?",
        options=[
            Option('ay', 'Ay-pri-cot', {'WE': 65.0, 'NE': 65.0, 'MA': 65.0}),
            Option('ah', 'Ah-pri-cot', {'MW': 65.0, 'SO': 65.0, 'SW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="trailer",
        text="What is your term for a tractor-trailer?",
        options=[
            Option('semi', 'Semi', {'MW': 65.0, 'WE': 65.0}),
            Option('tractor_trailer', 'Tractor-trailer', {'NE': 65.0, 'MA': 65.0}),
            Option('eighteen_wheeler', '18-wheeler', {'SO': 60.0, 'SW': 60.0}),
            Option('rig', 'Rig'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="toilet",
        text="What is your term for a public toilet?",
        options=[
            Option('restroom', 'Restroom', {'WE': 60.0, 'SO': 60.0, 'SW': 60.0}),
            Option('bathroom', 'Bathroom', {'NE': 60.0, 'MA': 60.0}),
            Option('washroom', 'Washroom', {'MW': 60.0}),
            Option('john', 'John'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="hotdog",
        text="What is your term for the food that consists of a frankfurter in a bun?",
        options=[
            Option('hot_dog', 'Hot dog', {'WE': 70.0, 'MA': 70.0, 'SW': 70.0}),
            Option('coney', 'Coney', {'MW': 50.0, 'SO': 40.0}),
            Option('wiener', 'Wiener', {'MW': 40.0, 'NE': 45.0}),
            Option('frank', 'Frank'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="river",
        text="What is your term for a small, narrow river?",
        options=[
            Option('creek', 'Creek', {'WE': 50.0, 'MW': 50.0, 'SW': 50.0}),
            Option('brook', 'Brook', {'NE': 70.0}),
            Option('run', 'Run', {'MA': 65.0}),
            Option('branch', 'Branch', {'SO': 60.0}),
            Option('stream', 'Stream'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="tap",
        text="What do you call the device you use to turn on the water in a sink?",
        options=[
            Option('faucet', 'Faucet', {'WE': 65.0, 'MW': 65.0}),
            Option('tap', 'Tap', {'NE': 65.0, 'MA': 65.0}),
            Option('spigot', 'Spigot', {'SO': 60.0, 'SW': 60.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="car_pron",
        text="How do you pronounce 'car'?",
        options=[
            Option('cahr', 'Cahr (rhotic, with r)', {'WE': 80.0, 'MW': 80.0, 'SO': 80.0, 'SW': 80.0, 'MA': 80.0}),
            Option('cah', 'Cah (non-rhotic, drop the r)', {'NE': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="dog_pron",
        text="How do you pronounce 'dog'?",
        options=[
            Option('dawg', 'Dawg (vowel like in caught)', {'SO': 65.0, 'MA': 65.0, 'NE': 65.0}),
            Option('dahg', 'Dahg (vowel like in cot)', {'WE': 65.0, 'MW': 65.0, 'SW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="water_pron",
        text="How do you pronounce 'water'?",
        options=[
            Option('open_water', 'Wah-ter', {'WE': 70.0, 'MW': 70.0, 'SO': 70.0, 'SW': 70.0}),
            Option('wood_er', 'Wood-er', {'MA': 75.0}),
            Option('waw_ter', 'Waw-ter', {'NE': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="coffee_pron",
        text="How do you pronounce 'coffee'?",
        options=[
            Option('caw_fee', 'Caw-fee', {'NE': 65.0, 'MA': 65.0, 'SO': 65.0}),
            Option('cah_fee', 'Cah-fee', {'WE': 65.0, 'MW': 65.0, 'SW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="wash_pron",
        text="How do you pronounce 'wash'?",
        options=[
            Option('wash', 'Wash', {'WE': 75.0, 'NE': 75.0, 'MA': 75.0, 'SW': 75.0}),
            Option('warsh', 'Warsh (with an r sound)', {'MW': 60.0, 'SO': 45.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="screen_porch",
        text="What is your term for a porch that is enclosed with glass or screens?",
        options=[
            Option('sunroom', 'Sunroom', {'NE': 60.0, 'MA': 60.0}),
            Option('screened_porch', 'Screened porch', {'SO': 65.0, 'MW': 65.0}),
            Option('lanai', 'Lanai', {'WE': 45.0, 'SW': 45.0}),
            Option('solarium', 'Solarium'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="half_bath",
        text="What is your term for a small room for washing hands and face?",
        options=[
            Option('half_bath', 'Half bath', {'WE': 65.0, 'MW': 65.0, 'SO': 65.0, 'SW': 65.0}),
            Option('powder_room', 'Powder room', {'NE': 65.0, 'MA': 65.0}),
            Option('lavatory', 'Lavatory'),
            Option('guest_bath', 'Guest bath'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="green_veg",
        text="What do you call the small, round green vegetables that grow in pods?",
        options=[
            Option('peas', 'Peas', {'WE': 75.0, 'MW': 75.0, 'NE': 75.0, 'MA': 75.0, 'SW': 75.0}),
            Option('english_peas', 'English peas', {'SO': 55.0}),
            Option('green_peas', 'Green peas'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="flower_container",
        text="What is your term for a container for flowers?",
        options=[
            Option('vase', 'Vase (rhymes with face)', {'WE': 75.0, 'MW': 75.0, 'SO': 75.0, 'SW': 75.0}),
            Option('vahz', 'Vahz (rhymes with cause)', {'NE': 60.0, 'MA': 60.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="main_dish",
        text="What is your term for the main food served at a meal?",
        options=[
            Option('entree', 'Entree', {'NE': 65.0, 'MA': 65.0, 'WE': 65.0, 'SW': 65.0}),
            Option('dinner', 'Dinner', {'SO': 60.0, 'MW': 60.0}),
            Option('main_course', 'Main course'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="sweet_cake",
        text="What is your term for a small, sweet cake?",
        options=[
            Option('cookie', 'Cookie', {'NE': 80.0, 'MA': 80.0, 'WE': 80.0, 'MW': 80.0, 'SW': 80.0}),
            Option('biscuit', 'Biscuit', {'SO': 45.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="fruit_drink",
        text="What is your term for a cold, sweet drink made with fruit juice?",
        options=[
            Option('punch', 'Punch', {'SO': 60.0, 'SW': 60.0, 'WE': 60.0}),
            Option('cider', 'Cider', {'NE': 60.0, 'MA': 60.0, 'MW': 60.0}),
            Option('juice', 'Juice'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="bread_roll",
        text="What is your term for a small, round bread roll?",
        options=[
            Option('roll', 'Roll', {'NE': 60.0, 'MA': 60.0, 'SW': 60.0}),
            Option('biscuit', 'Biscuit', {'SO': 70.0}),
            Option('bun', 'Bun', {'MW': 55.0, 'WE': 55.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="heavy_blanket",
        text="What is your term for a large, heavy blanket?",
        options=[
            Option('comforter', 'Comforter', {'WE': 50.0, 'SW': 50.0}),
            Option('quilt', 'Quilt', {'SO': 65.0, 'MW': 65.0}),
            Option('duvet', 'Duvet', {'NE': 60.0, 'MA': 60.0}),
            Option('blanket', 'Blanket'),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="milk_curds",
        text="What is your term for the food made from curds of milk?",
        options=[
            Option('cheese', 'Cheese', {'NE': 75.0, 'MA': 75.0, 'WE': 75.0, 'SO': 75.0, 'SW': 75.0}),
            Option('curds', 'Curds', {'MW': 65.0}),
            Option('other', 'Something else')
        ]
    ),
    ModeledQuestion(
        id="fuzzy_fruit",
        text="What is your term for a small, round fruit with a fuzzy skin?",
        options=[
            Option('apricot', 'Apricot', {'NE': 75.0, 'MA': 75.0, 'WE': 75.0, 'MW': 75.0, 'SW': 75.0}),
            Option('peach', 'Peach', {'SO': 65.0}),
            Option('other', 'Something else')
        ]
    )
]

def generate_distribution(question: ModeledQuestion, state: str) -> dict[str, float]:
    region = STATE_REGION.get(state, 'WE')
    
    # Base weights
    weights = {}
    for opt in question.options:
        # Default weight is 15.0 if not specified for this region
        w = opt.region_weights.get(region, 15.0)
        weights[opt.id] = w

    # Add small deterministic noise to make maps look natural and continuous
    hash_val = 0
    seed_str = state + question.id
    for char in seed_str:
        hash_val = ord(char) + ((hash_val << 5) - hash_val)
        
    def pseudo_rand(offset):
        import math
        x = math.sin(hash_val + offset) * 10000
        return x - math.floor(x)

    for i, opt in enumerate(question.options):
        weights[opt.id] += pseudo_rand(7 + i) * 10.0

    # Normalize to 100.00%
    total_w = sum(weights.values())
    dist = {}
    total_percent = 0.0
    for i, opt in enumerate(question.options):
        if i == len(question.options) - 1:
            dist[opt.id] = round(100.0 - total_percent, 2)
        else:
            val = round((weights[opt.id] / total_w) * 100.0, 2)
            dist[opt.id] = val
            total_percent += val
            
    return dist

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dialect_extended_js_path = os.path.join(script_dir, '..', 'dialect-data-extended.js')

    # Convert new_questions to standard dicts for output
    new_questions_dicts = []
    for mq in new_questions:
        options_list = [{"id": o.id, "label": o.label} for o in mq.options]
        new_questions_dicts.append({
            "id": mq.id,
            "text": mq.text,
            "options": options_list
        })

    STATES = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
        'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
        'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]

    # Generate state data for the 26 extra questions
    extended_state_data = {}
    for state in STATES:
        extended_state_data[state] = {}
        for q in new_questions:
            extended_state_data[state][q.id] = generate_distribution(q, state)

    out = f"""/* ============================================================================
 * dialect-data-extended.js  —  EXTENDED DIALECT SURVEY DATA
 *
 * Automatically generated by extend_data.py. Do not edit.
 * ==========================================================================*/

const DIALECT_EXTENDED_QUESTIONS = {json.dumps(new_questions_dicts, indent=2)};

const DIALECT_EXTENDED_STATE_DATA = {json.dumps(extended_state_data, indent=2)};

// Merge survey and extended data dynamically in the browser
const QUESTIONS = DIALECT_SURVEY_QUESTIONS.concat(DIALECT_EXTENDED_QUESTIONS);

const STATE_DATA = {{}};
for (const state in DIALECT_SURVEY_STATE_DATA) {{
  STATE_DATA[state] = {{ ...DIALECT_SURVEY_STATE_DATA[state] }};
}}
for (const state in DIALECT_EXTENDED_STATE_DATA) {{
  if (STATE_DATA[state]) {{
    for (const qid in DIALECT_EXTENDED_STATE_DATA[state]) {{
      STATE_DATA[state][qid] = DIALECT_EXTENDED_STATE_DATA[state][qid];
    }}
  }} else {{
    STATE_DATA[state] = {{ ...DIALECT_EXTENDED_STATE_DATA[state] }};
  }}
}}

// ---- helpers ---------------------------------------------------------------

const QUESTIONS_BY_ID = {{}};
QUESTIONS.forEach(function (q) {{ QUESTIONS_BY_ID[q.id] = q; }});

const STATE_KEYS = Object.keys(STATE_CENTROID);

function normalizeDist(distObj) {{
  var total = 0, k;
  for (k in distObj) total += Math.max(0, distObj[k]);
  var out = {{}};
  if (total <= 0) return out;
  for (k in distObj) out[k] = Math.max(0, distObj[k]) / total;
  return out;
}}

function stateDist(stateAbbr, qid) {{
  var raw = STATE_DATA[stateAbbr] && STATE_DATA[stateAbbr][qid];
  if (!raw) return {{}};
  return normalizeDist(raw);
}}

function nationalProb(qid, optionId) {{
  var s = 0, n = 0;
  STATE_KEYS.forEach(function (st) {{
    var d = stateDist(st, qid);
    if (Object.keys(d).length) {{ s += (d[optionId] || 0); n++; }}
  }});
  return n ? s / n : 0;
}}

if (typeof module !== "undefined" && module.exports) {{
  module.exports = {{
    QUESTIONS, QUESTIONS_BY_ID, STATE_DATA, STATE_CENTROID, STATE_NAMES,
    STATE_KEYS, normalizeDist, stateDist, nationalProb
  }};
}}
"""
    with open(dialect_extended_js_path, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f"Successfully wrote dialect-data-extended.js with {len(new_questions_dicts)} modeled questions.")

if __name__ == '__main__':
    main()
