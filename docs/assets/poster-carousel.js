(function () {
  "use strict";

  var selector = "video[data-learnmap-poster-carousel]";
  var initialTimeThreshold = 0.1;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileViewport = window.matchMedia("(max-width: 640px)");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = Boolean(connection && connection.saveData);
  var language = new URLSearchParams(window.location.search).get("lang");

  function posterPaths(video) {
    var paths = video.getAttribute("data-learnmap-poster-carousel").split(",");
    var filtered;

    paths = paths.map(function (path) {
      return path.trim();
    }).filter(Boolean);

    if (language === "zh") {
      filtered = paths.filter(function (path) {
        return path.indexOf("-cn-") !== -1;
      });
      return filtered.length > 0 ? filtered : paths;
    }

    if (language === "en") {
      filtered = paths.filter(function (path) {
        return path.indexOf("-en-") !== -1;
      });
      return filtered.length > 0 ? filtered : paths;
    }

    return paths;
  }

  function button(symbol, label, testId) {
    var element = document.createElement("button");
    element.type = "button";
    element.textContent = symbol;
    element.setAttribute("aria-label", label);
    element.setAttribute("title", label);
    element.setAttribute("data-testid", testId);
    return element;
  }

  function createCarousel(video) {
    var posters = posterPaths(video);
    var posterIndex = 0;
    var timer = null;
    var preloadedImage = null;
    var userPaused = false;
    var pointerInside = false;
    var focusInside = false;
    var host = video.parentElement;
    var controls = document.createElement("div");
    var previousButton = button("←", "Previous poster", "poster-previous");
    var pauseButton = button("Ⅱ", "Pause poster rotation", "poster-pause");
    var nextButton = button("→", "Next poster", "poster-next");
    var status = document.createElement("span");

    if (posters.length === 0 || !host) {
      return { start: function () {}, stop: function () {} };
    }

    host.classList.add("lm-poster-carousel-host");
    controls.className = "lm-poster-carousel-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Poster carousel controls");
    status.className = "lm-poster-carousel-status";
    status.setAttribute("aria-live", "off");
    controls.append(previousButton, pauseButton, status, nextButton);
    host.appendChild(controls);

    function automaticMotionDisabled() {
      return reducedMotion.matches || saveData;
    }

    function updateControls() {
      status.textContent = (posterIndex + 1) + " / " + posters.length;
      status.setAttribute("aria-label", "Poster " + (posterIndex + 1) + " of " + posters.length);
      pauseButton.disabled = automaticMotionDisabled();

      if (pauseButton.disabled) {
        pauseButton.textContent = "Ⅱ";
        pauseButton.setAttribute("aria-label", "Automatic poster rotation disabled by your preferences");
      } else if (userPaused) {
        pauseButton.textContent = "▶";
        pauseButton.setAttribute("aria-label", "Resume poster rotation");
      } else {
        pauseButton.textContent = "Ⅱ";
        pauseButton.setAttribute("aria-label", "Pause poster rotation");
      }

      pauseButton.title = pauseButton.getAttribute("aria-label");
    }

    function setPoster(index) {
      posterIndex = (index + posters.length) % posters.length;
      video.poster = posters[posterIndex];
      updateControls();
    }

    function preloadNext() {
      var nextIndex = (posterIndex + 1) % posters.length;
      preloadedImage = new Image();
      preloadedImage.src = posters[nextIndex];
    }

    function stop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function canRotate() {
      return posters.length > 1 &&
        !document.hidden &&
        !automaticMotionDisabled() &&
        !userPaused &&
        !pointerInside &&
        !focusInside &&
        video.paused &&
        video.currentTime <= initialTimeThreshold;
    }

    function start() {
      stop();

      if (!canRotate()) {
        return;
      }

      preloadNext();
      timer = window.setInterval(function () {
        if (!canRotate()) {
          stop();
          return;
        }

        setPoster(posterIndex + 1);
        preloadNext();
      }, mobileViewport.matches ? 10000 : 8000);
    }

    previousButton.addEventListener("click", function () {
      userPaused = true;
      stop();
      setPoster(posterIndex - 1);
    });

    nextButton.addEventListener("click", function () {
      userPaused = true;
      stop();
      setPoster(posterIndex + 1);
    });

    pauseButton.addEventListener("click", function () {
      userPaused = !userPaused;
      updateControls();
      if (userPaused) {
        stop();
      } else {
        start();
      }
    });

    host.addEventListener("pointerenter", function () {
      pointerInside = true;
      stop();
    });
    host.addEventListener("pointerleave", function () {
      pointerInside = false;
      start();
    });
    host.addEventListener("focusin", function () {
      focusInside = true;
      stop();
    });
    host.addEventListener("focusout", function () {
      focusInside = false;
      start();
    });

    video.addEventListener("play", function () {
      stop();
      controls.hidden = true;
    });
    video.addEventListener("pause", function () {
      controls.hidden = video.currentTime > initialTimeThreshold;
      start();
    });
    video.addEventListener("seeked", function () {
      controls.hidden = video.currentTime > initialTimeThreshold;
      start();
    });
    video.addEventListener("ended", function () {
      video.load();
      controls.hidden = false;
      start();
    });

    setPoster(0);
    start();

    return { start: start, stop: stop };
  }

  var carousels = Array.prototype.map.call(
    document.querySelectorAll(selector),
    createCarousel
  );

  document.addEventListener("visibilitychange", function () {
    carousels.forEach(function (carousel) {
      if (document.hidden) {
        carousel.stop();
      } else {
        carousel.start();
      }
    });
  });

  function handleReducedMotionChange() {
    carousels.forEach(function (carousel) {
      if (reducedMotion.matches) {
        carousel.stop();
      } else {
        carousel.start();
      }
    });
  }

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reducedMotion.addListener === "function") {
    reducedMotion.addListener(handleReducedMotionChange);
  }
}());
