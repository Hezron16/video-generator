"use strict";

const MAX_PROMPT_LENGTH = 600;

const els = {
  form: document.getElementById("video-form"),
  prompt: document.getElementById("prompt"),
  model: document.getElementById("model"),
  seconds: document.getElementById("seconds"),
  testMode: document.getElementById("test-mode"),
  count: document.getElementById("char-count"),
  button: document.getElementById("generate-btn"),
  error: document.getElementById("error"),
  display: document.querySelector(".display"),
  placeholder: document.getElementById("placeholder"),
  spinner: document.getElementById("spinner"),
  spinnerLabel: document.getElementById("spinner-label"),
  result: document.getElementById("result"),
  player: document.getElementById("player"),
  download: document.getElementById("download-link"),
};

let timerId = null;

/* UI helpers */
const show = (el) => { el.hidden = false; };
const hide = (el) => { el.hidden = true; };

function showError(msg) { els.error.textContent = msg; show(els.error); }
function clearError() { els.error.textContent = ""; hide(els.error); }

function startTimer() {
  const started = Date.now();
  els.spinnerLabel.textContent = "Generating video… 0s";
  timerId = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    els.spinnerLabel.textContent = `Generating video… ${s}s`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function setLoading(on) {
  els.button.disabled = on;
  els.button.textContent = on ? "Generating…" : "Generate video";
  els.display.setAttribute("aria-busy", String(on));
  if (on) {
    hide(els.placeholder);
    hide(els.result);
    show(els.spinner);
    startTimer();
  } else {
    stopTimer();
    hide(els.spinner);
  }
}

function updateCount() {
  els.count.textContent = `${els.prompt.value.length} / ${MAX_PROMPT_LENGTH}`;
}

function showVideo(video) {
  const src = video.src || video.currentSrc || video.querySelector?.("source")?.src;
  if (!src) throw new Error("The service returned no video. Please try again.");
  els.player.src = src;
  els.download.href = src;
  show(els.result);
  els.player.play().catch(() => { /* autoplay may be blocked */ });
}

/* Validation and errors */
function validatePrompt(value) {
  const prompt = value.trim();
  if (!prompt) throw new Error("Please describe the video first.");
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`);
  }
  return prompt;
}

function getErrorMessage(err) {
  if (!navigator.onLine) return "You appear to be offline. Check your connection and try again.";
  if (err?.code === "insufficient_funds" || err?.status === 402) {
    return "You have used up your free Puter allowance. Try Test mode, a shorter clip, wait for your monthly allowance, or upgrade your Puter account.";
  }
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  if (err?.error?.message) return err.error.message;
  return "Something went wrong while generating the video. Please try again.";
}

/* Generation */
function buildOptions() {
  const options = {};
  if (els.model.value) options.model = els.model.value;
  if (els.seconds.value) options.seconds = Number(els.seconds.value);
  if (els.testMode.checked) options.test_mode = true;
  return options;
}

async function generateVideo(prompt) {
  if (typeof puter === "undefined" || !puter?.ai?.txt2vid) {
    throw new Error("Puter.js failed to load. Check your connection and reload the page.");
  }
  return puter.ai.txt2vid(prompt, buildOptions());
}

async function handleSubmit(event) {
  event.preventDefault();
  clearError();

  let prompt;
  try {
    prompt = validatePrompt(els.prompt.value);
  } catch (err) {
    showError(err.message);
    els.prompt.focus();
    return;
  }

  setLoading(true);
  try {
    showVideo(await generateVideo(prompt));
  } catch (err) {
    console.error("Video generation failed:", err);
    show(els.placeholder);
    showError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
}

/* Init */
function init() {
  els.form.addEventListener("submit", handleSubmit);
  els.prompt.addEventListener("input", updateCount);
  updateCount();
}

init();