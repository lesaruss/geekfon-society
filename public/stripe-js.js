(function () {
  'use strict';

  function joinTier(tier) {
    var trigger = document.querySelector('[data-stripe-tier="' + tier + '"]');
    if (trigger) { trigger.style.opacity = '0.5'; trigger.style.pointerEvents = 'none'; }
    fetch('/api/checkout?tier=' + encodeURIComponent(tier))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.url) { window.location.href = data.url; }
        else { throw new Error(data.error || 'No checkout URL'); }
      })
      .catch(function (err) {
        console.error('GeekFon checkout error:', err);
        if (trigger) { trigger.style.opacity = ''; trigger.style.pointerEvents = ''; }
        alert('Could not start checkout. Please try again.');
      });
  }

  window.joinTier = joinTier;

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.gfs-sub-tier').forEach(function (el) {
      var nameEl = el.querySelector('.gfs-sub-tier-name');
      var name = nameEl ? nameEl.textContent.toLowerCase().trim() : '';
      var tier = null;
      if (name === 'passport') tier = 'passport';
      else if (name === 'all access') tier = 'all-access';
      else if (name === 'lifetime') tier = 'lifetime';
      if (!tier) return;
      el.setAttribute('data-stripe-tier', tier);
      el.href = '#';
      el.addEventListener('click', function (e) { e.preventDefault(); joinTier(tier); });
    });
    document.querySelectorAll('.s3-join-btn, .btn-join-fixed').forEach(function (el) {
      el.onclick = function () { joinTier('all-access'); };
    });
  });
})();
