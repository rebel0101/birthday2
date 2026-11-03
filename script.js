(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const cake = $("#cake");
  const scene = $("#cakeScene");
  const statusText = $("#cakeStatus");
  const cutControls = $("#cutControls");
  const cutMessage = $("#cutMessage");
  const knife = $("#knife");
  const slash = $("#cutSlash");
  const instruction = $("#cutInstruction");
  let blown = false, cut = false, cutMode = false, dragging = false;
  let startX = 0, startY = 0, lastX = 0, lastY = 0;
  let audioContext = null, micStream = null, analyser = null, micFrame = null;
  let ambientTimer = null, ambientOn = false;

  function getAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioContext) audioContext = new AC();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function tone(freq, start, duration, volume = .09, type = "sine") {
    const ac = getAudio();
    if (!ac) return;
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .035);
    gain.gain.setTargetAtTime(.0001, start + duration - .04, .035);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(start); osc.stop(start + duration);
  }

  function confettiBurst(count = 100) {
    const colors = ["#ff78ad", "#ffd5e5", "#ffc75e", "#f04d87", "#fff", "#bd8aff"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "confetti"; p.textContent = Math.random() > .45 ? "♥" : "✦";
      p.style.left = Math.random() * 100 + "vw";
      p.style.color = colors[Math.floor(Math.random() * colors.length)];
      p.style.fontSize = 10 + Math.random() * 16 + "px";
      p.style.setProperty("--drift", (Math.random() - .5) * 240 + "px");
      p.style.animationDuration = 2.1 + Math.random() * 2.2 + "s";
      document.body.appendChild(p);
      p.addEventListener("animationend", () => p.remove(), { once: true });
    }
  }

  function blowOutCandles(source = "tap") {
    if (blown) return;
    blown = true;
    cake.classList.add("blown");
    statusText.textContent = source === "mic"
      ? "You did it, Gulabo! Make your wish come true ✨"
      : "Wish made! All your candles are out, my love ✨";
    $("#micBtn").disabled = true;
    $("#tapBlowBtn").disabled = true;
    cutControls.classList.remove("hidden");
    $("#micHelp").textContent = "Your wish is in the universe now. Ready to cut the cake?";
    confettiBurst(35);
    if (micFrame) cancelAnimationFrame(micFrame);
    if (micStream) micStream.getTracks().forEach((track) => track.stop());
  }

  $("#tapBlowBtn").addEventListener("click", () => blowOutCandles("tap"));
  $("#micBtn").addEventListener("click", async () => {
    if (blown) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      statusText.textContent = "Microphone isn't available here — tap to blow the candles instead.";
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = getAudio();
      if (!ac) throw new Error("AudioContext unavailable");
      const source = ac.createMediaStreamSource(micStream);
      analyser = ac.createAnalyser(); analyser.fftSize = 1024; source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      statusText.textContent = "Now blow gently toward your microphone… 💨";
      let loud = 0;
      const listen = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128; sum += v * v;
        }
        if (Math.sqrt(sum / data.length) > .105) loud++;
        else loud = Math.max(0, loud - 1);
        if (loud > 5) { blowOutCandles("mic"); return; }
        micFrame = requestAnimationFrame(listen);
      };
      listen();
    } catch (err) {
      statusText.textContent = "No worries — microphone permission unavailable. Tap to blow works without it.";
    }
  });

  $("#cutBtn").addEventListener("click", () => {
    if (!blown || cut) return;
    cutMode = true;
    scene.classList.add("cutting");
    instruction.classList.remove("hidden");
    statusText.textContent = "Press directly on the cake and drag the knife across it, Gulabo 🔪";
    $("#cutBtn").textContent = "Knife ready — drag across cake ↘";
    knife.classList.add("visible");
  });

  function moveKnife(event) {
    if (!cutMode) return;
    knife.style.left = event.clientX + "px";
    knife.style.top = event.clientY + "px";
    if (dragging) {
      lastX = event.clientX; lastY = event.clientY;
      const rect = scene.getBoundingClientRect();
      slash.classList.remove("hidden");
      slash.style.left = (startX - rect.left) + "px";
      slash.style.top = (startY - rect.top) + "px";
      const dx = lastX - startX, dy = lastY - startY;
      const length = Math.hypot(dx, dy);
      slash.style.width = Math.max(0, length) + "px";
      slash.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
    }
  }
  document.addEventListener("pointermove", moveKnife, { passive: true });

  scene.addEventListener("pointerdown", (event) => {
    if (!cutMode || cut || !blown) return;
    // Start only on the visible cake, so a swipe on empty space cannot trigger a cut.
    if (!event.target.closest("#cake")) return;
    event.preventDefault();
    dragging = true;
    startX = lastX = event.clientX; startY = lastY = event.clientY;
    scene.classList.add("is-dragging");
    slash.classList.remove("hidden", "animate");
    slash.style.width = "0px";
    slash.style.left = (startX - scene.getBoundingClientRect().left) + "px";
    slash.style.top = (startY - scene.getBoundingClientRect().top) + "px";
    try { scene.setPointerCapture(event.pointerId); } catch (_) {}
    statusText.textContent = "Keep dragging across the cake… slice through it! 💗";
  }, { passive: false });

  function playBirthdayTune() {
    const ac = getAudio();
    if (!ac) return;
    // Familiar Happy Birthday melody played with a soft, bell-like tone.
    const beat = .31, start = ac.currentTime + .12;
    const notes = [
      [392,1],[392,1],[440,2],[392,2],[523,2],[494,4],
      [392,1],[392,1],[440,2],[392,2],[587,2],[523,4],
      [392,1],[392,1],[784,2],[659,2],[523,2],[494,2],[440,4],
      [698,1],[698,1],[659,2],[523,2],[587,2],[523,4]
    ];
    let t = start;
    notes.forEach(([freq, beats]) => { tone(freq, t, beat * beats, .14, "triangle"); t += beat * beats; });
  }

  function celebrate() {
    if (navigator.vibrate) navigator.vibrate([180, 70, 260, 90, 380]);
    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 650);
  }

  function finishCut() {
    if (!dragging) return;
    dragging = false;
    scene.classList.remove("is-dragging");
    if (!cutMode || cut) return;
    const dx = lastX - startX, dy = lastY - startY;
    const distance = Math.hypot(dx, dy);
    // A real swipe of at least 75px is required. This works for both mouse and touch.
    if (distance < 75) {
      slash.classList.add("hidden");
      statusText.textContent = "Swipe farther across the cake to cut it — you've got this, Gulabo! 💗";
      return;
    }
    cut = true; cutMode = false;
    scene.classList.remove("cutting");
    scene.classList.add("cut-complete");
    cake.classList.add("cut");
    knife.classList.remove("visible");
    instruction.classList.add("hidden");
    $("#cutBtn").disabled = true;
    $("#cutBtn").textContent = "Cake cut! ♥";
    slash.classList.remove("hidden");
    slash.classList.add("animate");
    statusText.textContent = "CAKE CUT! Happy Birthday, Shalu! 🎂💖";
    celebrate(); playBirthdayTune(); confettiBurst(170);
    setTimeout(() => {
      cutMessage.classList.remove("hidden");
      statusText.textContent = "A slice of birthday magic, just for you!";
    }, 850);
  }
  document.addEventListener("pointerup", finishCut);
  document.addEventListener("pointercancel", finishCut);

  // Optional soft ambient notes: starts only after the user taps the music toggle.
  $("#musicBtn").addEventListener("click", () => {
    ambientOn = !ambientOn;
    $("#musicBtn").setAttribute("aria-pressed", String(ambientOn));
    $("#musicText").textContent = ambientOn ? "Music on" : "Music off";
    if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    if (ambientOn) {
      const notes = [261.63, 329.63, 392, 493.88, 392, 329.63];
      let i = 0;
      const playAmbientNote = () => { const ac = getAudio(); if (ac) tone(notes[i++ % notes.length], ac.currentTime + .02, 1.25, .035, "sine"); };
      playAmbientNote();
      ambientTimer = setInterval(playAmbientNote, 1150);
    }
  });

  $("#afterCakeBtn").addEventListener("click", () => $("#letter").scrollIntoView({ behavior: "smooth" }));
  $("#finalSurprise").addEventListener("click", () => {
    $("#finalLine").classList.remove("hidden"); confettiBurst(130);
    $("#finalSurprise").textContent = "Surprise unlocked ♥";
  });

  const links = [...document.querySelectorAll(".side-nav a")];
  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.hash === "#" + entry.target.id));
    }), { threshold: .35 });
    sections.forEach((section) => observer.observe(section));
  }
})();