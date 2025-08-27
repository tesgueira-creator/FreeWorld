/*
 * Custom JavaScript for XenoOrigin.
 * Handles simple interactivity such as newsletter sign‑ups and future UI hooks.
 */

// Newsletter subscription handler
async function subscribe(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('newsletter-message');
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  if (!email) {
    messageEl.textContent = 'Please enter a valid email.';
    return;
  }

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (response.ok) {
      messageEl.textContent = 'Thank you for subscribing!';
      emailInput.value = '';
    } else {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {}
      messageEl.textContent = data.error || 'Subscription failed. Please try again later.';
    }
  } catch (error) {
    messageEl.textContent = 'An error occurred. Please try again later.';
  }
}

// Future hooks: simple page toggles or comparator logic can be added here.
