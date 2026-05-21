// Active nav link
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.href === location.href) link.classList.add('active');
});

// i18n
const lang = { current: localStorage.getItem('lang') || 'en' };

function applyLang() {
  document.querySelectorAll('[data-zh]').forEach(el => {
    el.innerHTML = lang.current === 'zh' ? el.dataset.zh : el.dataset.en;
  });
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang.current === 'zh' ? 'EN' : '中';
}

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.addEventListener('click', () => {
    lang.current = lang.current === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', lang.current);
    applyLang();
  });
});
