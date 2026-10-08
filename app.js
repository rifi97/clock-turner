const canvas = document.querySelector('#clock');
const context = canvas.getContext('2d');
const startInput = document.querySelector('#start-time');
const endInput = document.querySelector('#end-time');
const durationInput = document.querySelector('#duration');
const playButton = document.querySelector('#play-button');
const status = document.querySelector('#status');

let animationFrame;
let startedAt = 0;
let isRunning = false;
let currentSeconds = 0;
let activeSettings;

function parseTime(value) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error('시각은 00:00:00.00 형식으로 입력해 주세요.');
  const [, hours, minutes, seconds, fraction = '0'] = match;
  const hour = Number(hours); const minute = Number(minutes); const second = Number(seconds);
  if (hour > 23 || minute > 59 || second > 59) throw new Error('올바른 시각을 입력해 주세요.');
  return hour * 3600 + minute * 60 + second + Number(fraction.padEnd(2, '0')) / 100;
}

function formatTime(totalSeconds) {
  const hundredths = Math.floor((totalSeconds % 1) * 100);
  const whole = Math.floor(totalSeconds);
  const hours = String(Math.floor(whole / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const seconds = String(whole % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.${String(hundredths).padStart(2, '0')}`;
}

function drawClock(seconds) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const side = Math.max(1, Math.round(rect.width * ratio));
  if (canvas.width !== side || canvas.height !== side) { canvas.width = side; canvas.height = side; }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const size = rect.width;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * .45;
  const inner = size * .425;
  context.clearRect(0, 0, size, size);
  context.strokeStyle = '#f8f4ea';
  context.lineCap = 'butt';
  context.lineWidth = 1.5;
  context.beginPath(); context.arc(cx, cy, outer, 0, Math.PI * 2); context.stroke();
  context.strokeStyle = 'rgba(248,244,234,.8)';
  context.lineWidth = 1;
  context.beginPath(); context.arc(cx, cy, inner, 0, Math.PI * 2); context.stroke();

  for (let tick = 0; tick < 60; tick += 1) {
    const angle = (tick / 60) * Math.PI * 2 - Math.PI / 2;
    const major = tick % 5 === 0;
    const start = outer - (major ? size * .048 : size * .022);
    context.strokeStyle = major ? '#f8f4ea' : 'rgba(248,244,234,.66)';
    context.lineWidth = major ? 1.7 : .9;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start);
    context.lineTo(cx + Math.cos(angle) * (outer - size * .012), cy + Math.sin(angle) * (outer - size * .012));
    context.stroke();
  }

  context.fillStyle = '#f8f4ea';
  context.font = `300 ${Math.round(size * .075)}px Georgia, serif`;
  context.textAlign = 'center'; context.textBaseline = 'middle';
  [['12', 0], ['3', .25], ['6', .5], ['9', .75]].forEach(([label, fraction]) => {
    const angle = fraction * Math.PI * 2 - Math.PI / 2;
    context.fillText(label, cx + Math.cos(angle) * size * .34, cy + Math.sin(angle) * size * .34);
  });

  const minuteAngle = ((seconds % 3600) / 3600) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((seconds % 43200) / 43200) * Math.PI * 2 - Math.PI / 2;
  const secondAngle = ((seconds % 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const drawHand = (angle, length, lineWidth, alpha = 1) => {
    context.save(); context.globalAlpha = alpha; context.strokeStyle = '#f8f4ea'; context.lineWidth = lineWidth; context.lineCap = 'round';
    context.shadowColor = 'rgba(248,244,234,.45)'; context.shadowBlur = lineWidth > 2 ? 12 : 3;
    context.beginPath(); context.moveTo(cx, cy); context.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length); context.stroke(); context.restore();
  };
  drawHand(hourAngle, size * .19, 3.5, .86);
  drawHand(minuteAngle, size * .31, 2.25);
  drawHand(secondAngle, size * .36, 1, .48);
  context.fillStyle = '#000'; context.strokeStyle = '#f8f4ea'; context.lineWidth = 2; context.beginPath(); context.arc(cx, cy, size * .018, 0, Math.PI * 2); context.fill(); context.stroke();
}

function render(seconds) { currentSeconds = seconds; drawClock(seconds); }

function readSettings() {
  const start = parseTime(startInput.value);
  const end = parseTime(endInput.value);
  const duration = Number(durationInput.value);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('감기는 시간은 0보다 큰 초 단위 숫자로 입력해 주세요.');
  if (end <= start) throw new Error('종료 시각은 시작 시각보다 뒤여야 합니다.');
  return { start, end, duration };
}

function stop(message = '') {
  isRunning = false; activeSettings = undefined; cancelAnimationFrame(animationFrame); playButton.textContent = '시계 돌리기'; status.textContent = message;
  [startInput, endInput, durationInput].forEach((input) => { input.disabled = false; });
}

function animate(now) {
  const { start, end, duration } = activeSettings;
  const progress = Math.min(1, (now - startedAt) / (duration * 1000));
  render(start + (end - start) * progress);
  if (progress < 1) { animationFrame = requestAnimationFrame(animate); return; }
  stop('재생이 완료되었습니다.');
}

playButton.addEventListener('click', () => {
  if (isRunning) { stop('재생을 멈췄습니다.'); return; }
  try {
    activeSettings = readSettings(); status.textContent = ''; render(activeSettings.start); isRunning = true; startedAt = performance.now(); playButton.textContent = '멈추기';
    [startInput, endInput, durationInput].forEach((input) => { input.disabled = true; });
    animationFrame = requestAnimationFrame(animate);
  } catch (error) { stop(error.message); }
});

[startInput, endInput, durationInput].forEach((input) => input.addEventListener('input', () => { if (!isRunning) { try { render(readSettings().start); status.textContent = ''; } catch { /* keep current preview while input is incomplete */ } } }));
window.addEventListener('resize', () => drawClock(currentSeconds));
render(parseTime(startInput.value));
