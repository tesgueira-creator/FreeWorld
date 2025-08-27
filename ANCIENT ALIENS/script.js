/*
 * Custom JavaScript for XenoOrigin.
 * Handles simple interactivity such as newsletter sign‑ups and future UI hooks.
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeFilters();
  initializeNewsletterForm();
  initializeSmoothScrolling();
});

// Newsletter subscription handler
function subscribe(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('newsletter-message');
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  
  if (!email) {
    messageEl.textContent = 'Please enter a valid email.';
    messageEl.style.color = 'var(--accent)';
    return;
  }
  
  // Here we would normally send the email to a back‑end service.
  messageEl.textContent = 'Thank you for subscribing!';
  messageEl.style.color = 'var(--accent)';
  emailInput.value = '';
}

// Initialize newsletter form
function initializeNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', subscribe);
  }
}

// Initialize evidence filters (placeholder for future functionality)
function initializeFilters() {
  const filters = document.querySelectorAll('.filters select');
  filters.forEach(filter => {
    filter.addEventListener('change', function() {
      // Placeholder for filter functionality
      console.log('Filter changed:', this.name, this.value);
    });
  });
}

// Initialize smooth scrolling for anchor links
function initializeSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Enhanced accessibility: announce page changes for screen readers
function announcePageChange(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}