/* GeekFon Society -- nav.js v1.1
   Single source of truth for all site navigation.
   Rule 2.12: injected via script, never hand-coded per page.
   v1.1: added /chat and /radio page variants; Music/Chat nav items
         now navigate to standalone pages instead of toggling phone view.
*/
(function () {
  var CSS = [
    '.gfs-nav{position:fixed;top:0;left:0;right:0;z-index:100;height:56px;background:rgba(2,12,10,.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:center;}',
    '.nav-inner{width:100%;max-width:1280px;padding:0 40px;height:56px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;}',
    '.nav-inner.nav-simple{grid-template-columns:1fr auto 1fr;padding:0 28px;}',
    '.nav-wordmark{font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#fff;justify-self:center;text-decoration:none;background:none;border:none;cursor:default;font-family:inherit;}',
    '.nav-wordmark span{color:#F69820;transition:color .7s ease;}',
    '.nav-right{display:flex;align-items:center;gap:10px;justify-self:end;}',
    '.nav-login{background:none;border:1px solid rgba(255,255,255,.35);border-radius:100px;padding:8px 18px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.6);cursor:pointer;transition:border-color .15s,color .15s;font-family:inherit;}',
    '.nav-login:hover{border-color:rgba(255,255,255,.4);color:#fff;}',
    '.nav-join{background:#F69820;color:#020c0a;border:none;border-radius:100px;padding:9px 22px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;transition:background .15s;font-family:inherit;}',
    '.nav-join:hover{background:#e08818;}',
    '.nav-join:focus-visible,.nav-login:focus-visible,.nav-back:focus-visible{outline:3px solid #F69820;outline-offset:3px;}',
    '.nav-hamburger{display:flex;flex-direction:column;justify-content:center;gap:5px;background:none;border:none;cursor:pointer;padding:8px;border-radius:8px;transition:background .15s;font-family:inherit;}',
    '.nav-hamburger:hover{background:rgba(255,255,255,.06);}',
    '.nav-hamburger:focus-visible{outline:3px solid #F69820;outline-offset:3px;}',
    '.nav-hamburger span{display:block;width:22px;height:2px;background:rgba(255,255,255,.7);border-radius:2px;transition:transform .22s,opacity .22s;}',
    '.nav-hamburger[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg);}',
    '.nav-hamburger[aria-expanded="true"] span:nth-child(2){opacity:0;}',
    '.nav-hamburger[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}',
    '.nav-menu{position:fixed;top:56px;left:0;right:0;display:flex;justify-content:center;z-index:99;background:rgba(2,12,10,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.08);padding:0;max-height:0;overflow:hidden;transition:max-height .28s ease,padding .28s ease;}',
    '.nav-menu.open{max-height:320px;padding:16px 0;}',
    '.nav-menu-inner{width:100%;max-width:1280px;padding:0 40px;display:flex;flex-direction:column;gap:4px;}',
    '.nav-menu-item{display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;padding:14px 16px;border-radius:10px;font-family:inherit;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.6);text-decoration:none;transition:background .15s,color .15s;width:100%;text-align:left;}',
    '.nav-menu-item:hover,.nav-menu-item:focus-visible{background:rgba(246,152,32,.08);color:#F69820;outline:none;}',
    '.nav-menu-item:focus-visible{outline:3px solid #F69820;outline-offset:2px;}',
    '.nav-menu-item svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0;opacity:.7;}',
    '.nav-back{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.5);transition:color .15s;justify-self:start;text-decoration:none;background:none;border:none;cursor:pointer;font-family:inherit;}',
    '.nav-back:hover{color:#fff;}',
    '.nav-back svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;}',
    '@media(max-width:640px){.nav-inner{padding:0 20px;}.nav-inner.nav-simple{padding:0 20px;}.nav-menu-inner{padding:0 20px;}}'
  ].join('');

  var path = window.location.pathname;
  var isHome    = path === '/' || /\/index\.html?$/.test(path) || path === '';
  var isRoster  = /\/roster(\.html?)?$/.test(path);
  var isChat    = /\/chat(\.html?)?$/.test(path);
  var isRadio   = /\/radio(\.html?)?$/.test(path);
  var isWelcome = /\/welcome(\.html?)?$/.test(path);
  var isArtist  = !isHome && !isRoster && !isChat && !isRadio && !isWelcome;

  var chevronLeft = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  var iconMusic   = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  var iconChat    = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var iconRoster  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

  var navHTML = '';

  if (isHome) {
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner">',
      '    <button class="nav-hamburger" id="gfsNavHamburger" aria-expanded="false" aria-controls="gfsNavMenu" aria-label="Open menu">',
      '      <span></span><span></span><span></span>',
      '    </button>',
      '    <div class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span></div>',
      '    <div class="nav-right">',
      '      <button class="nav-login" id="gfsNavLoginBtn">Member Login</button>',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>',
      '<div class="nav-menu" id="gfsNavMenu" role="navigation" aria-label="Site navigation">',
      '  <div class="nav-menu-inner">',
      '    <a class="nav-menu-item" href="/radio">' + iconMusic + ' Music</a>',
      '    <a class="nav-menu-item" href="/chat">' + iconChat + ' Chat</a>',
      '    <a class="nav-menu-item" href="/roster">' + iconRoster + ' Roster</a>',
      '  </div>',
      '</div>'
    ].join('');
  } else if (isChat) {
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner nav-simple">',
      '    <a href="/" class="nav-back" aria-label="Back to home">' + chevronLeft + ' Home</a>',
      '    <a href="/" class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span> Chat</a>',
      '    <div style="justify-self:end">',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>'
    ].join('');
  } else if (isRadio) {
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner nav-simple">',
      '    <a href="/" class="nav-back" aria-label="Back to home">' + chevronLeft + ' Home</a>',
      '    <a href="/" class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span> Music</a>',
      '    <div style="justify-self:end">',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>'
    ].join('');
  } else if (isRoster) {
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner nav-simple">',
      '    <a href="/" class="nav-back" aria-label="Back to home">' + chevronLeft + ' Home</a>',
      '    <a href="/" class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span> Society</a>',
      '    <div style="justify-self:end">',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>'
    ].join('');
  } else if (isWelcome) {
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner nav-simple">',
      '    <a href="/" class="nav-back" aria-label="Back to home">' + chevronLeft + ' Home</a>',
      '    <a href="/" class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span></a>',
      '    <div style="justify-self:end">',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>'
    ].join('');
  } else {
    /* Artist pages */
    navHTML = [
      '<nav class="gfs-nav" aria-label="GeekFon Society navigation">',
      '  <div class="nav-inner nav-simple">',
      '    <a href="/roster" class="nav-back" aria-label="Back to roster">' + chevronLeft + ' Roster</a>',
      '    <a href="/" class="nav-wordmark">Geek<span id="gfsNavFon">Fon</span></a>',
      '    <div style="justify-self:end">',
      '      <button class="nav-join" onclick="window.open(\'https://lesaruss.ai/geekfon\',\'_blank\')">Get Passport</button>',
      '    </div>',
      '  </div>',
      '</nav>'
    ].join('');
  }

  /* Inject styles */
  var styleEl = document.createElement('style');
  styleEl.id = 'gfs-nav-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* Inject nav HTML at top of body */
  document.body.insertAdjacentHTML('afterbegin', navHTML);

  /* Hamburger logic (home only) */
  function closeMenu() {
    var menu = document.getElementById('gfsNavMenu');
    var btn  = document.getElementById('gfsNavHamburger');
    if (menu) menu.classList.remove('open');
    if (btn)  btn.setAttribute('aria-expanded', 'false');
  }
  window.gfsNavClose = closeMenu;

  if (isHome) {
    document.addEventListener('DOMContentLoaded', function () {
      var btn  = document.getElementById('gfsNavHamburger');
      var menu = document.getElementById('gfsNavMenu');
      if (btn && menu) {
        btn.addEventListener('click', function () {
          var open = menu.classList.toggle('open');
          btn.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeMenu();
        });
        document.addEventListener('click', function (e) {
          if (!btn.contains(e.target) && !menu.contains(e.target)) closeMenu();
        });
      }

      /* Login button: dispatch event so page can handle it */
      var loginBtn = document.getElementById('gfsNavLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', function () {
        document.dispatchEvent(new CustomEvent('gfs:login-toggle'));
      });
    });
  }

  /* Fon color cycling -- all pages */
  var FON_COLORS = ['#F69820', '#e94f8a', '#7fb069', '#9b6bcc', '#00cfe8', '#e84d1a'];
  var fonIdx = 0;
  document.addEventListener('DOMContentLoaded', function () {
    setInterval(function () {
      fonIdx = (fonIdx + 1) % FON_COLORS.length;
      var el = document.getElementById('gfsNavFon');
      if (el) el.style.color = FON_COLORS[fonIdx];
    }, 3200);
  });
})();
