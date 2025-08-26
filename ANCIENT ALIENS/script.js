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

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('map');
  if (mapEl && typeof L !== 'undefined') {
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const sites = [
      { coords: [29.9792, 31.1342], label: 'Great Pyramid of Giza' },
      { coords: [34.006, 36.2038], label: 'Baalbek' },
      { coords: [-16.561, -68.6804], label: 'Pumapunku' },
      { coords: [51.1789, -1.8262], label: 'Stonehenge' },
      { coords: [-14.739, -75.13], label: 'Nazca Lines' },
      { coords: [35.9411, 26.2747], label: 'Antikythera Shipwreck' },
      { coords: [49.4521, 11.0767], label: 'Nuremberg Sky Event' }
    ];

    sites.forEach(site => {
      L.marker(site.coords).addTo(map).bindPopup(site.label);
    });
  }
});
