/* GeekFon Society — footer.js v1.0
   Single source of truth for the site footer.
   Rule 2.12: injected via script, never hand-coded per page.
*/
(function () {
  var CSS = [
    '.gfs-footer{position:relative;z-index:1;border-top:1px solid rgba(255,255,255,.06);padding:32px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;font-family:\'Montserrat\',sans-serif;flex-wrap:wrap;}',
    '.gfs-footer-wordmark{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s;}',
    '.gfs-footer-wordmark:hover{color:rgba(255,255,255,.6);}',
    '.gfs-footer-wordmark span{color:#F69820;}',
    '.gfs-footer-links{display:flex;align-items:center;gap:24px;flex-wrap:wrap;}',
    '.gfs-footer-link{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s;}',
    '.gfs-footer-link:hover{color:rgba(255,255,255,.6);}',
    '.gfs-footer-link:focus-visible{outline:3px solid #F69820;outline-offset:3px;border-radius:2px;}',
    '.gfs-footer-wordmark:focus-visible{outline:3px solid #F69820;outline-offset:3px;border-radius:2px;}',
    '.gfs-footer-copy{font-size:9px;font-weight:400;color:rgba(255,255,255,.45);letter-spacing:.06em;}',
    '@media(max-width:640px){.gfs-footer{flex-direction:column;align-items:flex-start;gap:16px;padding:24px 20px;}}'
  ].join('');

  var year = new Date().getFullYear();

  var footerHTML = [
    '<footer class="gfs-footer" aria-label="GeekFon Society footer">',
    '  <a href="/" class="gfs-footer-wordmark" aria-label="GeekFon Society home">Geek<span>Fon</span></a>',
    '  <nav class="gfs-footer-links" aria-label="Footer navigation">',
    '    <a href="/roster" class="gfs-footer-link">Roster</a>',
    '    <a href="https://lesaruss.ai/geekfon" class="gfs-footer-link" target="_blank" rel="noopener">Get Passport</a>',
    '    <a href="https://lesaruss.ai" class="gfs-footer-link" target="_blank" rel="noopener">LESARUSS</a>',
    '  </nav>',
    '  <span class="gfs-footer-copy">&copy; ' + year + ' LESARUSS Universe</span>',
    '</footer>'
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.id = 'gfs-footer-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  });
})();
