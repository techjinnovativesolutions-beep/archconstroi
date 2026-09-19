/* Arch Constroi – página de manutenção | Tech J Innovative Solutions */
(function () {
  "use strict";
  ARCH.init();
  var m = ARCH.getMaintenance();
  if (!m.on) {
    location.replace("index.html");
    return;
  }
  if (m.reason) {
    var p = document.getElementById("motivoParagrafo");
    if (p) {
      p.textContent = m.reason;
      p.style.display = "";
    }
  }
})();
