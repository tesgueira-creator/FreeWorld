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