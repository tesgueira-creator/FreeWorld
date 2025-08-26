/*
 * Custom JavaScript for XenoOrigin.
 * Handles simple interactivity such as newsletter sign‑ups and future UI hooks.
 */

// Newsletter subscription handler
function subscribe(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('newsletter-message');
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  if (!email) {
    messageEl.textContent = 'Please enter a valid email.';
    return;
  }
  // Here we would normally send the email to a back‑end service.
  messageEl.textContent = 'Thank you for subscribing!';
  emailInput.value = '';
}

// Future hooks: simple page toggles or comparator logic can be added here.

/* Gallery pagination + responsive image wiring */
document.addEventListener('DOMContentLoaded', function () {
  const gridEl = document.getElementById('media-grid');
  if (!gridEl) return; // nothing to do on pages without gallery

  // Seed data: list all images in the public/images folder used by the gallery
  // NOTE: For simplicity we hardcode filenames found in the repo. If you add more
  // images, extend this array or generate dynamically at build time.
  const images = [
    { src: 'public/images/giza.jpg', name: 'Giza', caption: 'Great Pyramid of Giza (CC0)' },
    { src: 'public/images/baalbek.jpg', name: 'Baalbek', caption: 'Baalbek Stone (Public Domain)' },
    { src: 'public/images/stonehenge.jpg', name: 'Stonehenge', caption: 'Stonehenge (CC BY‑SA)' },
    { src: 'public/images/antikythera.jpg', name: 'Antikythera', caption: 'Antikythera Mechanism (CC BY‑SA)' },
    { src: 'public/images/quimbaya.jpg', name: 'Quimbaya', caption: 'Quimbaya Figurines (CC BY‑SA)' },
    { src: 'public/images/nuremberg.jpg', name: 'Nuremberg', caption: 'Nuremberg 1561 Woodcut (Public Domain)' }
  ];

  const perPage = parseInt(gridEl.getAttribute('data-per-page')) || 6;
  let page = 1;
  let order = 'default';

  const tmpl = document.getElementById('media-item-template');
  const pagerInfo = document.getElementById('pager-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const sortSelect = document.getElementById('gallery-sort');

  function makeSrcsets(basename) {
    // Generate srcset strings for 1x and 2x variants and webp alternate
    // Expect images like '.../name.jpg' and generated webp '.../name.webp'
    const jpeg1x = basename;
    const jpeg2x = basename.replace(/(\.[^.]+)$/, '@2x$1');
    const webp1x = jpeg1x.replace(/\.[^.]+$/, '.webp');
    const webp2x = jpeg2x.replace(/\.[^.]+$/, '.webp');
    return {
      webp: `${webp1x} 1x, ${webp2x} 2x`,
      jpeg: `${jpeg1x} 1x, ${jpeg2x} 2x`
    };
  }

  function render() {
    // sort copy
    let list = images.slice();
    if (order === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (page > pages) page = pages;

    // clear grid
    gridEl.innerHTML = '';

    const start = (page - 1) * perPage;
    const slice = list.slice(start, start + perPage);

    slice.forEach(item => {
      const clone = tmpl.content.cloneNode(true);
      const picture = clone.querySelector('picture');
      const source = clone.querySelector('source');
      const img = clone.querySelector('img');
      const caption = clone.querySelector('.caption');

      const srcsets = makeSrcsets(item.src);
      source.setAttribute('data-srcset', srcsets.webp);
      img.setAttribute('data-src', item.src);
      img.setAttribute('data-srcset', srcsets.jpeg);
      img.alt = item.name;
      caption.textContent = item.caption;

      gridEl.appendChild(clone);
    });

    pagerInfo.textContent = `Page ${page} of ${pages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;

    // After inserting, kick off lazy image wiring
    wireImages();
  }

  function wireImages() {
    const pics = gridEl.querySelectorAll('picture');
    pics.forEach(p => {
      const srcEl = p.querySelector('source');
      const img = p.querySelector('img');
      const webp = srcEl.getAttribute('data-srcset');
      const jpeg = img.getAttribute('data-srcset');
      const src = img.getAttribute('data-src');

      if (webp) srcEl.srcset = webp;
      if (jpeg) img.srcset = jpeg;
      if (src) img.src = src;

      // tiny safeguard for browsers that prefer <img> only
      img.addEventListener('error', () => {
        img.src = src; // fallback
      });
    });
  }

  prevBtn.addEventListener('click', () => {
    if (page > 1) {
      page--;
      render();
    }
  });

  nextBtn.addEventListener('click', () => {
    page++;
    render();
  });

  sortSelect.addEventListener('change', (e) => {
    order = e.target.value;
    page = 1;
    render();
  });

  // initial render
  render();
});

// (Removed hero video control: no longer needed after hero redesign)