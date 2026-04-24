// ═══════════════════════════════════════════════════════════
//   SmartSure Architecture Presentation — JavaScript
// ═══════════════════════════════════════════════════════════

/* ── Theme Toggle ── */
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('ss-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const saved = localStorage.getItem('ss-theme') || 'dark';
setTheme(saved);

themeToggle.addEventListener('click', () => {
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ── Navbar active state + scroll ── */
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  // Navbar scroll style
  navbar.classList.toggle('scrolled', window.scrollY > 60);

  // Active nav link
  let current = '';
  sections.forEach(s => {
    const top = s.offsetTop - 120;
    if (window.scrollY >= top) current = s.id;
  });
  navLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
});

/* ── Counter animation ── */
function animateCount(el, target) {
  let count = 0;
  const step = Math.ceil(target / 30);
  const interval = setInterval(() => {
    count += step;
    if (count >= target) { el.textContent = target; clearInterval(interval); }
    else el.textContent = count;
  }, 40);
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.stat-num').forEach(el => {
        animateCount(el, parseInt(el.getAttribute('data-target')));
      });
      observer.disconnect();
    }
  });
}, { threshold: 0.3 });
const statsEl = document.querySelector('.hero-stats');
if (statsEl) observer.observe(statsEl);

/* ── Folder Tree Toggle ── */
function toggleTree(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  // Update expand icon
  const trigger = el.previousElementSibling;
  if (trigger) {
    const icon = trigger.querySelector('.expand-icon');
    if (icon) icon.classList.toggle('open', !isOpen);
  }
}

/* ── Flow Tab Switching ── */
function showFlow(name) {
  document.querySelectorAll('.flow-diagram').forEach(d => {
    d.classList.remove('active');
  });
  document.querySelectorAll('.flow-tab').forEach(t => {
    t.classList.remove('active');
  });
  document.getElementById('flow-' + name)?.classList.add('active');
  event.target.classList.add('active');
}

/* ── Service Cards ── */
function toggleService(name) {
  const card = document.getElementById('svc-' + name);
  const detail = document.getElementById('svc-detail-' + name);
  if (!card || !detail) return;
  const isOpen = card.classList.contains('open');
  // Close all
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('open'));
  // Open this one unless already open
  if (!isOpen) card.classList.add('open');
}

/* ── Scroll-triggered fade-in for non-hero elements ── */
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.folder-tree-card, .service-card, .sec-layer, .detail-card, .sec-data-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  fadeObserver.observe(el);
});

/* ── Arrow dot animation restart on tab change ── */
document.querySelectorAll('.flow-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.arrow-dot').forEach(dot => {
      dot.style.animation = 'none';
      requestAnimationFrame(() => {
        dot.style.animation = '';
      });
    });
  });
});

/* ── Keyboard navigation ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('open'));
  }
});

/* ── Smooth section reveal ── */
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.05 });

document.querySelectorAll('.section-header').forEach(el => {
  sectionObserver.observe(el);
});
