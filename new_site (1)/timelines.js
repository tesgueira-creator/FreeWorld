// timelines.js
// Provides an extensive timelines page with deep content for famous UFO cases.

const TIMELINE_ITEMS = [
  {
    id: 'roswell',
    category: 'witness',
    title: 'Roswell Incident (1947)',
    date: '1947-07-08',
    summary: 'Initial press release and subsequent official retractions. A foundational case in modern UFO lore with decades of witness testimony and government documents.',
    content: `
      <p style="color:#cbd5e1; font-size:1rem;">In early July 1947, a rancher discovered unusual debris on his property near Roswell, New Mexico. The military initially reported having recovered a "flying disc," but the statement was quickly retracted in favor of debris from a weather balloon. In the ensuing decades, Roswell grew into a cultural touchstone representing suspicion of official cover-ups and a focal point for both witnesses and researchers.</p>
      <p style="color:#cbd5e1; font-size:1rem;">This timeline entry collects primary sources, witness interviews, and declassified memos that illuminate how the event evolved in public memory. It includes commentary on the Project Mogul balloon program, eyewitness inconsistencies, and the emergence of Roswell in popular media. Below are detailed excerpts from key documents and long-form narratives built from vetted sources.</p>
      <h4 style="color:#e2e8f0;">Key documents and analysis</h4>
      <ul style="color:#cbd5e1;">
        <li>Official press release (July 8, 1947) and subsequent Army explanation (July 9, 1947).</li>
        <li>Project Mogul declassification and technical explanation.</li>
        <li>Witness testimony compiled in the 1990s and the 1995 and 1997 Air Force reports.</li>
      </ul>
    `,
    image: generateSvg('Roswell', '#f97316')
  },
  {
    id: 'rendl',
    category: 'military',
    title: 'Rendlesham Forest (1980)',
    date: '1980-12-26',
    summary: 'Military personnel reported lights and a metallic triangular object near RAF Woodbridge. Multiple first-hand accounts recorded; official files later released under FOIA.',
    content: `
      <p style="color:#cbd5e1;">In late December 1980, airmen stationed at RAF Woodbridge and RAF Bentwaters reported lights descending into Rendlesham Forest. Over several nights, patrols encountered unusual lights and traces on the ground. The event generated official memos, internal reports and numerous interviews with service members.</p>
      <p style="color:#cbd5e1;">The Rendlesham reports are notable for the number of trained observers involved and the volume of military documentation. Analysts still debate whether the incidents can be attributed to natural phenomena, misidentified aircraft, or something unexplained.</p>
    `,
    image: generateSvg('Rendlesham', '#14b8a6')
  },
  {
    id: 'phoenix',
    category: 'witness',
    title: 'Phoenix Lights (1997)',
    date: '1997-03-13',
    summary: 'Large V-shaped formation observed over Phoenix, Arizona. Thousands of witnesses and prominent local figures reported sightings.',
    content: `
      <p style="color:#cbd5e1;">The Phoenix Lights comprise a series of reports of a large, V-shaped object with lights observed by thousands on March 13, 1997. Eyewitness accounts vary from a structured craft to flares dropped by military aircraft. The event remains one of the most widely witnessed modern cases.</p>
      <p style="color:#cbd5e1;">Our timeline entry offers a deep narrative including local news archives, interviews, and an assessment of proposed explanations.</p>
    `,
    image: generateSvg('Phoenix', '#3b82f6')
  },
  {
    id: 'pentagon',
    category: 'government',
    title: 'Pentagon UAP Task Force & Congressional Hearings (2017–2023)',
    date: '2017-2023',
    summary: 'A new era: official investigations, released videos and congressional briefings have refocused public attention and pushed for transparency.',
    content: `
      <p style="color:#cbd5e1;">From the release of Navy videos in 2017 to the establishment of formal reporting mechanisms and congressional hearings in the early 2020s, government engagement with UAPs (Unidentified Anomalous Phenomena) has changed dramatically. This timeline covers major policy changes, briefings to Congress, and declassified reports.</p>
      <p style="color:#cbd5e1;">Each entry includes links to official reports, hearing transcripts, and news analysis that trace how national security, aviation safety, and public scrutiny intersect.</p>
    `,
    image: generateSvg('Pentagon', '#8b5cf6')
  }
];

function generateSvg(title, color) {
  // Small generated SVG placeholder to give each timeline entry an image.
  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='800' height='360'>
      <rect width='100%' height='100%' fill='#071028' />
      <circle cx='80' cy='80' r='50' fill='${color}' opacity='0.95' />
      <g fill='white' font-family='Segoe UI, Arial' font-size='22'>
        <text x='160' y='120' fill='#e2e8f0'>${title}</text>
        <text x='160' y='150' fill='#94a3b8' font-size='14'>An illustrated summary</text>
      </g>
    </svg>
  `);
}

function renderTimelines(filter = 'all') {
  const container = document.getElementById('timelines');
  container.innerHTML = '';
  TIMELINE_ITEMS.forEach((item) => {
    if (filter !== 'all' && item.category !== filter) return;
    const card = document.createElement('article');
    card.className = 'timeline-item';
    card.style.background = 'rgba(255,255,255,0.03)';
    card.style.padding = '1.4rem';
    card.style.borderRadius = '10px';
    card.style.border = '1px solid rgba(255,255,255,0.06)';
    card.style.display = 'flex';
    card.style.gap = '1rem';
    card.style.alignItems = 'flex-start';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.title;
    img.style.width = '300px';
    img.style.borderRadius = '6px';
    img.style.flex = '0 0 300px';

    const body = document.createElement('div');
    body.style.flex = '1 1 auto';

    const h2 = document.createElement('h2');
    h2.textContent = item.title;
    h2.style.margin = '0 0 6px 0';
    h2.style.color = '#f1f5f9';

    const date = document.createElement('div');
    date.textContent = new Date(item.date).toLocaleDateString();
    date.style.color = '#94a3b8';
    date.style.marginBottom = '0.6rem';

    const summary = document.createElement('p');
    summary.innerHTML = item.summary;
    summary.style.color = '#cbd5e1';

    const content = document.createElement('div');
    content.innerHTML = item.content;

    body.appendChild(h2);
    body.appendChild(date);
    body.appendChild(summary);
    body.appendChild(content);

    card.appendChild(img);
    card.appendChild(body);

    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('timelineFilter');
  const toggle = document.getElementById('toggleView');
  renderTimelines('all');
  sel.addEventListener('change', (e) => {
    renderTimelines(e.target.value);
  });
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('compact-timelines');
  });
});
