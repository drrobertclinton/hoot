(function () {
'use strict';
function boot() {
  J.initStage(); J.map.build(); J.parent.init();
  var t = J.$('#title');
  J.$('#titleArt').innerHTML = A.kidSVG('jonah', { wave: true }) + A.picklesSVG(J.S.color.pickles, J.S.strokes.pickles, 'pk');
  J.$('#titlePlay').innerHTML = J.IC.play;
  J.$('#titlePlay').onclick = function () {
    J.unlockAudio(); J.sfx('win'); t.classList.add('gone'); setTimeout(function () { t.hidden = true; }, 600);
    J.say('Welcome to the Jonah Activity Club! Tap a place, and Pickles will run there.', true);
  };
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  window.addEventListener('pagehide', function () { J.hush(); J.save(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
