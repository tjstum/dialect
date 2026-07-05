import os
import re
import urllib.request
import html
import json
from dataclasses import dataclass

@dataclass
class State:
    abbreviation: str
    name: str
    centroid: tuple[float, float]

STATES = [
    State("AL", "Alabama", (-86.8, 32.8)),
    State("AK", "Alaska", (-152.0, 63.0)),
    State("AZ", "Arizona", (-111.7, 34.3)),
    State("AR", "Arkansas", (-92.4, 34.9)),
    State("CA", "California", (-119.7, 37.2)),
    State("CO", "Colorado", (-105.5, 39.0)),
    State("CT", "Connecticut", (-72.7, 41.6)),
    State("DE", "Delaware", (-75.5, 39.0)),
    State("DC", "Washington, D.C.", (-77.0, 38.9)),
    State("FL", "Florida", (-81.7, 28.1)),
    State("GA", "Georgia", (-83.4, 32.7)),
    State("HI", "Hawaii", (-157.5, 21.3)),
    State("ID", "Idaho", (-114.5, 44.4)),
    State("IL", "Illinois", (-89.2, 40.0)),
    State("IN", "Indiana", (-86.3, 39.9)),
    State("IA", "Iowa", (-93.5, 42.0)),
    State("KS", "Kansas", (-98.4, 38.5)),
    State("KY", "Kentucky", (-84.9, 37.5)),
    State("LA", "Louisiana", (-92.0, 31.0)),
    State("ME", "Maine", (-69.2, 45.4)),
    State("MD", "Maryland", (-76.7, 39.0)),
    State("MA", "Massachusetts", (-71.8, 42.3)),
    State("MI", "Michigan", (-85.0, 43.3)),
    State("MN", "Minnesota", (-94.3, 46.3)),
    State("MS", "Mississippi", (-89.7, 32.7)),
    State("MO", "Missouri", (-92.5, 38.4)),
    State("MT", "Montana", (-109.5, 46.9)),
    State("NE", "Nebraska", (-99.8, 41.5)),
    State("NV", "Nevada", (-116.9, 39.3)),
    State("NH", "New Hampshire", (-71.6, 43.7)),
    State("NJ", "New Jersey", (-74.5, 40.1)),
    State("NM", "New Mexico", (-106.1, 34.4)),
    State("NY", "New York", (-75.5, 42.9)),
    State("NC", "North Carolina", (-79.4, 35.6)),
    State("ND", "North Dakota", (-100.5, 47.5)),
    State("OH", "Ohio", (-82.8, 40.3)),
    State("OK", "Oklahoma", (-97.5, 35.6)),
    State("OR", "Oregon", (-120.6, 44.0)),
    State("PA", "Pennsylvania", (-77.8, 40.9)),
    State("RI", "Rhode Island", (-71.5, 41.7)),
    State("SC", "South Carolina", (-80.9, 33.9)),
    State("SD", "South Dakota", (-100.2, 44.4)),
    State("TN", "Tennessee", (-86.4, 35.8)),
    State("TX", "Texas", (-99.3, 31.5)),
    State("UT", "Utah", (-111.7, 39.3)),
    State("VT", "Vermont", (-72.7, 44.1)),
    State("VA", "Virginia", (-78.8, 37.5)),
    State("WA", "Washington", (-120.5, 47.4)),
    State("WV", "West Virginia", (-80.6, 38.6)),
    State("WI", "Wisconsin", (-89.9, 44.6)),
    State("WY", "Wyoming", (-107.5, 43.0))
]

QUICK_HQS = [
    105,  # Sweetened carbonated beverage (soda vs. pop)
    50,   # Addressing a group of people (y'all vs. you guys)
    73,   # Rubber-soled athletic shoes (sneakers vs. tennis shoes)
    64,   # Long sandwich with cold cuts (sub vs. hoagie)
    66,   # Small lobster-like creature in streams (crawfish vs. crayfish)
    74,   # Gray bug that rolls into a ball (roly poly vs. pill bug)
    65,   # Insect that glows at night (lightning bug vs. firefly)
    103,  # Device to drink water from in schools (drinking fountain vs. bubbler)
    28,   # Pronunciation of "cot" and "caught" (same vs. different)
    15,   # Pronunciation of "Mary", "merry", and "marry" (same vs. different)
    79,   # General term for a big, fast road (highway vs. freeway)
    21,   # Pronunciation of "pecan" (pee-can vs. pee-kahn)
    94,   # Cake topping (frosting vs. icing)
    84,   # Circular road intersection (roundabout vs. traffic circle)
    60,   # Strip of grass between sidewalk and street (curb strip vs. tree lawn)
    58,   # Sale of unwanted items at home (garage sale vs. yard sale)
    110,  # Night before Halloween (mischief night vs. devil's night)
    41,   # Outdoor tap (spigot vs. spicket)
    80,   # Rain falling while the sun shines (sunshower vs. devil's beating his wife)
    75,   # Wheeled cart at supermarket (shopping cart vs. buggy)
    76,   # Diagonally across an intersection (catty-corner vs. kitty-corner)
    109,  # Paper container for purchases (bag vs. sack)
    49,   # Past tense of drag (dragged vs. drug)
    63,   # Drink made with milk and ice cream (milkshake vs. frappe)
]

PHONETIC_MAP = {
    'ah': 'ɑ',
    'ash': 'æ',
    'backwardsa': 'ɒ',
    'backwardsc': 'ɔ',
    'ih': 'ɪ',
    'eh': 'ɛ',
    'schwa': 'ə',
    'caret': 'ʌ',
    'uh': 'ʊ',
    'sh': 'ʃ',
    'g': 'ʒ',
    'dg': 'dʒ'
}

def clean_html(text):
    # Replace image tags with phonetic symbols
    def replace_phonetic(match):
        img_name = match.group(1)
        return PHONETIC_MAP.get(img_name, img_name)
        
    text = re.sub(r'<img\s+src=["\']?\./images/([^"\'\s>]+)\.gif["\']?\s*/?>', replace_phonetic, text)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove parenthesized action/comment invitations
    text = re.sub(r'\s*\(\s*please[^)]*\)', '', text, flags=re.IGNORECASE)
    return text

def parse_state_page(content):
    # Find all question blocks
    q_matches = list(re.finditer(r'<tr><td colspan="4"><b>(\d+)\.\s*(.*?)</b></td></tr>', content, re.DOTALL))
    
    questions = []
    for i in range(len(q_matches)):
        start = q_matches[i].end()
        end = q_matches[i+1].start() if i + 1 < len(q_matches) else len(content)
        q_num = int(q_matches[i].group(1))
        q_text = clean_html(q_matches[i].group(2))
        
        block = content[start:end]
        opt_matches = re.findall(
            r'<tr>\s*<td[^>]*>\s*</td>\s*<td>\s*(?:<b>)?\s*([a-z])\.\s*(.*?)\s*(?:</b>)?\s*</td>\s*<td[^>]*>\s*</td>\s*<td>\s*(?:<b>)?\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)\s*(?:</b>)?\s*</td>\s*</tr>',
            block,
            re.DOTALL | re.IGNORECASE
        )
        
        options = []
        for letter, opt_label, pct_str in opt_matches:
            opt_label = clean_html(opt_label)
            # Remove letter prefix if it managed to get in there
            opt_label = re.sub(r'^[a-z]\.\s*', '', opt_label)
            pct = float(pct_str)
            options.append({
                'id': letter.lower(),
                'label': opt_label,
                'pct': pct
            })
            
        questions.append({
            'hq': q_num,
            'text': q_text,
            'options': options
        })
        
    return questions

def download_state_pages():
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'html_cache')
    os.makedirs(cache_dir, exist_ok=True)
    
    for state_obj in STATES:
        state = state_obj.abbreviation
        local_path = os.path.join(cache_dir, f'state_{state}.html')
        if not os.path.exists(local_path):
            url = f'http://dialect.redlog.net/staticmaps/state_{state}.html'
            print(f"Downloading {url}...")
            try:
                urllib.request.urlretrieve(url, local_path)
            except Exception as e:
                print(f"Error downloading {state}: {e}")
        else:
            print(f"Found cached HTML for {state}")

def main():
    # 1. Download pages
    download_state_pages()
    
    # 2. Parse all U.S. state pages
    all_states_parsed = {}
    canonical_metadata = {} 
    
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'html_cache')
    for state_obj in STATES:
        state = state_obj.abbreviation
        local_path = os.path.join(cache_dir, f'state_{state}.html')
        with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        questions = parse_state_page(content)
        all_states_parsed[state] = {q['hq']: q for q in questions}
        
        # Populate canonical metadata
        for q in questions:
            hq = q['hq']
            if hq not in canonical_metadata:
                canonical_metadata[hq] = {'text': q['text'], 'options': {}}
            for o in q['options']:
                canonical_metadata[hq]['options'][o['id']] = o['label']

    # 3. Generate full QUESTIONS list (first the 24 quick HQs in order, then the remaining 98)
    final_questions = []
    
    # Add quick HQs in their specified order
    for hq in QUICK_HQS:
        q_meta = canonical_metadata[hq]
        options_list = []
        for opt_id in sorted(q_meta['options'].keys()):
            options_list.append({
                'id': opt_id,
                'label': clean_html(q_meta['options'][opt_id])
            })
        final_questions.append({
            'id': f'q_{hq}',
            'hq': hq,
            'text': clean_html(q_meta['text']),
            'options': options_list
        })
        
    # Add remaining 98 questions ordered by hq number
    for hq in sorted(canonical_metadata.keys()):
        if hq in QUICK_HQS:
            continue 
            
        q_meta = canonical_metadata[hq]
        options_list = []
        # Sort options alphabetically by letter id (a, b, c...)
        for opt_id in sorted(q_meta['options'].keys()):
            options_list.append({
                'id': opt_id,
                'label': clean_html(q_meta['options'][opt_id])
            })
            
        q_text = q_meta['text']
        # Apply special-case clean text for questions 54, 55, 56, 57
        if hq == 54:
            q_text = 'Would you ever say this sentence? "He used to nap on the couch, but he sprawls out in that new lounge chair <i><b>anymore</b></i>"'
        elif hq == 55:
            q_text = 'Would you ever say this sentence? "I do exclusively figurative paintings <i><b>anymore</b></i>"'
        elif hq == 56:
            q_text = 'Would you ever say this sentence? "Pantyhose are so expensive <i><b>anymore</b></i> that I just try to get a good suntan and forget about it."'
        elif hq == 57:
            q_text = 'Would you ever say this sentence? "Forget the nice clothes <i><b>anymore</b></i>" (meaning "nowadays" in this context)'
        else:
            q_text = clean_html(q_text)

        final_questions.append({
            'id': f'q_{hq}',
            'hq': hq,
            'text': q_text,
            'options': options_list
        })
        
    print(f"Generated QUESTIONS array metadata: {len(final_questions)} questions total.")
    
    # 4. Generate STATE_DATA object
    final_state_data = {}
    for state_obj in STATES:
        state = state_obj.abbreviation
        state_questions = all_states_parsed[state]
        state_dict = {}
        
        # Process all 122 survey questions
        for hq in sorted(canonical_metadata.keys()):
            qid = f'q_{hq}'
            q_meta = canonical_metadata[hq]
            mapped_values = {}
            
            if hq in state_questions:
                raw_options = {o['id']: o['pct'] for o in state_questions[hq]['options']}
                sorted_letters = sorted(q_meta['options'].keys())
                for letter in sorted_letters[:-1]:
                    mapped_values[letter] = round(raw_options.get(letter, 0.0), 2)
                
                last_letter = sorted_letters[-1]
                mapped_values[last_letter] = max(0.0, round(100.0 - sum(mapped_values.values()), 2))
            else:
                sorted_letters = sorted(q_meta['options'].keys())
                for i, letter in enumerate(sorted_letters):
                    mapped_values[letter] = 100.0 if i == 0 else 0.0
                    
            state_dict[qid] = mapped_values
            
        final_state_data[state] = state_dict

    # 5. Write to dialect-data-survey.js (just as regular JSON wrapped in a variable assignment)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dialect_js_path = os.path.join(script_dir, '..', 'dialect-data-survey.js')

    # Convert state centroids and names to JSON format
    state_centroids = {s.abbreviation: s.centroid for s in STATES}
    state_names = {s.abbreviation: s.name for s in STATES}
    state_centroid_json = json.dumps(state_centroids, indent=2)
    state_names_json = json.dumps(state_names, indent=2)

    out = f"""/* ============================================================================
 * dialect-data-survey.js  —  REAL HARVARD DIALECT SURVEY DATA
 *
 * Automatically generated by scrape_and_generate.py. Do not edit.
 * ==========================================================================*/

const DIALECT_SURVEY_QUESTIONS = {json.dumps(final_questions, indent=2)};

const STATE_CENTROID = {state_centroid_json};

const STATE_NAMES = {state_names_json};

const DIALECT_SURVEY_STATE_DATA = {json.dumps(final_state_data, indent=2)};
"""
    with open(dialect_js_path, 'w', encoding='utf-8') as f:
        f.write(out)
        
    print("Successfully wrote new dialect-data-survey.js with all 122 questions!")

if __name__ == '__main__':
    main()
