/**
 * XenoOrigin JavaScript - Enhanced functionality
 * Handles interactivity, accessibility, and progressive enhancement
 */

// Configuration
const CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 250,
  INTERSECTION_THRESHOLD: 0.1,
  STORAGE_KEY: 'xenoorigin_preferences'
};

// State management
const state = {
  preferences: {
    theme: 'auto',
    reducedMotion: false,
    highContrast: false
  },
  isLoading: false,
  observers: new Map()
};

// Utility functions
const utils = {
  // Debounce function for performance
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for scroll events
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Safe localStorage operations
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn('Failed to write to localStorage:', error);
        return false;
      }
    }
  },

  // Announce changes to screen readers
  announce(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  },

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Get user preferences from system
  getSystemPreferences() {
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };
  }
};

// Theme management
const themeManager = {
  init() {
    const savedPreferences = utils.storage.get(CONFIG.STORAGE_KEY, {});
    state.preferences = { ...state.preferences, ...savedPreferences };
    
    this.applyTheme();
    this.setupThemeListeners();
  },

  applyTheme() {
    const { theme, reducedMotion, highContrast } = state.preferences;
    const systemPrefs = utils.getSystemPreferences();
    
    // Apply theme
    if (theme === 'dark' || (theme === 'auto' && systemPrefs.darkMode)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // Apply accessibility preferences
    if (reducedMotion || systemPrefs.reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    }
    
    if (highContrast || systemPrefs.highContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    }
  },

  setupThemeListeners() {
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.preferences.theme === 'auto') {
        this.applyTheme();
      }
    });

    // Listen for reduced motion changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      this.applyTheme();
    });
  },

  setTheme(theme) {
    state.preferences.theme = theme;
    utils.storage.set(CONFIG.STORAGE_KEY, state.preferences);
    this.applyTheme();
    utils.announce(`Theme changed to ${theme}`);
  }
};

// Form handling
const formHandler = {
  init() {
    this.setupNewsletterForm();
    this.setupContactForm();
    this.setupFormValidation();
  },

  setupNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('newsletter-message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      
      if (!utils.isValidEmail(email)) {
        this.showMessage(messageEl, 'Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
      }

      // Show loading state
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Subscribing...';
      submitButton.disabled = true;

      try {
        // Simulate API call (replace with actual endpoint)
        await this.simulateApiCall();
        
        this.showMessage(messageEl, 'Thank you for subscribing! Check your email for confirmation.', 'success');
        form.reset();
        utils.announce('Successfully subscribed to newsletter');
      } catch (error) {
        this.showMessage(messageEl, 'Something went wrong. Please try again later.', 'error');
        console.error('Newsletter subscription error:', error);
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  },

  setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const messageEl = document.getElementById('contact-message');
      
      // Basic validation
      const name = formData.get('name')?.trim();
      const email = formData.get('email')?.trim();
      const message = formData.get('message')?.trim();
      
      if (!name || !email || !message) {
        this.showMessage(messageEl, 'Please fill in all required fields.', 'error');
        return;
      }
      
      if (!utils.isValidEmail(email)) {
        this.showMessage(messageEl, 'Please enter a valid email address.', 'error');
        return;
      }

      try {
        // Simulate form submission
        await this.simulateApiCall();
        
        this.showMessage(messageEl, 'Thank you for your message! We will review and respond if required.', 'success');
        form.reset();
        utils.announce('Contact form submitted successfully');
      } catch (error) {
        this.showMessage(messageEl, 'Failed to send message. Please try again.', 'error');
        console.error('Contact form error:', error);
      }
    });
  },

  setupFormValidation() {
    // Real-time validation for email inputs
    const emailInputs = document.querySelectorAll('input[type="email"]');
    
    emailInputs.forEach(input => {
      const debouncedValidation = utils.debounce((email) => {
        if (email && !utils.isValidEmail(email)) {
          input.setCustomValidity('Please enter a valid email address');
        } else {
          input.setCustomValidity('');
        }
      }, CONFIG.DEBOUNCE_DELAY);

      input.addEventListener('input', (e) => {
        debouncedValidation(e.target.value.trim());
      });
    });
  },

  showMessage(element, text, type = 'info') {
    if (!element) return;
    
    element.textContent = text;
    element.className = `message ${type}`;
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        element.textContent = '';
        element.className = 'message';
      }, 5000);
    }
  },

  async simulateApiCall() {
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(resolve, 1000 + Math.random() * 1000);
    });
  }
};

// Navigation enhancements
const navigation = {
  init() {
    this.setupSmoothScrolling();
    this.setupActiveNavigation();
    this.setupMobileMenu();
    this.setupKeyboardNavigation();
  },

  setupSmoothScrolling() {
    // Only enable if user hasn't requested reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = anchor.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        
        if (target) {
          const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
          const targetPosition = target.offsetTop - headerHeight - 20;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Update focus for accessibility
          target.focus({ preventScroll: true });
          utils.announce(`Navigated to ${target.textContent || targetId}`);
        }
      });
    });
  },

  setupActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  },

  setupMobileMenu() {
    // Mobile menu implementation would go here
    // For now, we'll add a placeholder for future enhancement
    const nav = document.querySelector('nav');
    if (nav && window.innerWidth <= 768) {
      // Mobile menu logic
    }
  },

  setupKeyboardNavigation() {
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Skip to main content with Alt+M
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          utils.announce('Skipped to main content');
        }
      }
    });
  }
};

// Filter functionality
const filterManager = {
  init() {
    this.setupFilters();
    this.setupSearch();
  },

  setupFilters() {
    const filterForm = document.querySelector('.filters form');
    if (!filterForm) return;

    const filters = filterForm.querySelectorAll('select');
    const evidenceCards = document.querySelectorAll('.evidence-card');
    
    const applyFilters = utils.debounce(() => {
      const filterValues = {};
      
      filters.forEach(filter => {
        const name = filter.closest('label').textContent.trim().toLowerCase();
        filterValues[name] = filter.value.toLowerCase();
      });
      
      let visibleCount = 0;
      
      evidenceCards.forEach(card => {
        const tags = card.querySelector('.tags')?.textContent.toLowerCase() || '';
        const rating = card.querySelector('.rating')?.getAttribute('aria-label') || '';
        
        let shouldShow = true;
        
        // Apply type filter
        if (filterValues.type && !tags.includes(filterValues.type)) {
          shouldShow = false;
        }
        
        // Apply region filter
        if (filterValues.region && !tags.includes(filterValues.region)) {
          shouldShow = false;
        }
        
        // Apply reliability filter
        if (filterValues.reliability) {
          const ratingMatch = rating.match(/(\d+) of 5/);
          if (ratingMatch) {
            const cardRating = parseInt(ratingMatch[1]);
            const filterRating = filterValues.reliability;
            
            if (filterRating === '≥ 4' && cardRating < 4) shouldShow = false;
            if (filterRating === '3–4' && (cardRating < 3 || cardRating > 4)) shouldShow = false;
            if (filterRating === '≤ 2' && cardRating > 2) shouldShow = false;
          }
        }
        
        card.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow) visibleCount++;
      });
      
      utils.announce(`Showing ${visibleCount} of ${evidenceCards.length} items`);
    }, CONFIG.DEBOUNCE_DELAY);

    filters.forEach(filter => {
      filter.addEventListener('change', applyFilters);
    });
  },

  setupSearch() {
    // Future enhancement: add search functionality
  }
};

// Performance optimizations
const performance = {
  init() {
    this.setupLazyLoading();
    this.setupIntersectionObserver();
    this.preloadCriticalResources();
  },

  setupLazyLoading() {
    // Native lazy loading is already implemented in HTML
    // This is for additional enhancements
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    images.forEach(img => {
      img.addEventListener('load', () => {
        img.classList.add('fade-in');
      });
      
      img.addEventListener('error', () => {
        img.alt = 'Image failed to load';
        img.style.backgroundColor = 'var(--surface-variant)';
      });
    });
  },

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: CONFIG.INTERSECTION_THRESHOLD,
      rootMargin: '50px'
    });

    // Observe cards and sections for animation
    const animatableElements = document.querySelectorAll('.card, .evidence-card, .blog-card, .anchor-card');
    animatableElements.forEach(el => observer.observe(el));
    
    state.observers.set('fadeIn', observer);
  },

  preloadCriticalResources() {
    // Preload critical images
    const criticalImages = [
      'public/images/hero.png',
      'public/images/giza.jpg'
    ];
    
    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }
};

// Analytics and tracking (privacy-friendly)
const analytics = {
  init() {
    this.trackPageView();
    this.setupEventTracking();
  },

  trackPageView() {
    // Privacy-friendly analytics implementation
    const pageData = {
      path: window.location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct'
    };
    
    console.log('Page view:', pageData);
    // Send to analytics service if configured
  },

  setupEventTracking() {
    // Track important interactions
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (!target) return;
      
      const eventData = {
        type: 'click',
        element: target.tagName.toLowerCase(),
        text: target.textContent?.trim().substring(0, 50),
        href: target.href || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('User interaction:', eventData);
      // Send to analytics service if configured
    });
  }
};

// Error handling
const errorHandler = {
  init() {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  },

  handleError(event) {
    console.error('JavaScript error:', event.error);
    // Log to error reporting service if configured
  },

  handlePromiseRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Log to error reporting service if configured
  }
};

// Main initialization
function initializeApp() {
  // Check if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
}

function startApp() {
  try {
    // Initialize all modules
    themeManager.init();
    formHandler.init();
    navigation.init();
    filterManager.init();
    performance.init();
    analytics.init();
    errorHandler.init();
    
    // Mark app as initialized
    document.documentElement.setAttribute('data-app-initialized', 'true');
    utils.announce('Page loaded and interactive');
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Legacy function for backward compatibility
function subscribe(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('newsletter-message');
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  
  if (!utils.isValidEmail(email)) {
    formHandler.showMessage(messageEl, 'Please enter a valid email address.', 'error');
    return;
  }
  
  formHandler.showMessage(messageEl, 'Thank you for subscribing!', 'success');
  emailInput.value = '';
}

// Start the application
initializeApp();

// Export for testing or external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    utils,
    themeManager,
    formHandler,
    navigation,
    filterManager,
    performance,
    analytics
  };
}