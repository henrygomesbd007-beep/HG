const $ = (id) => document.getElementById(id);
let selectedFile = null;
let selectedDuration = '5';
let requestTimer = null;
const imageInput = $('imageInput');
const promptInput = $('prompt');
const statusPanel = $('statusPanel');

promptInput.addEventListener('input', () => $('promptCount').textContent = `${promptInput.value.length} / 1800`);
imageInput.addEventListener('change', () => setImage(imageInput.files?.[0]));
$('removeImage').addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); clearImage(); });
$('dropzone').addEventListener('dragover', (event) => { event.preventDefault(); $('dropzone').classList.add('dragging'); });
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragging'));
$('dropzone').addEventListener('drop', (event) => { event.preventDefault(); $('dropzone').classList.remove('dragging'); setImage(event.dataTransfer.files?.[0]); });

document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => { promptInput.value = button.dataset.prompt; promptInput.dispatchEvent(new Event('input')); }));
document.querySelectorAll('[data-duration]').forEach((button) => button.addEventListener('click', () => { selectedDuration = button.dataset.duration; document.querySelectorAll('[data-duration]').forEach((item) => item.classList.toggle('selected', item === button)); }));

function setImage(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return showError('Choose a PNG, JPEG, or WebP image.');
  if (file.size > 2_800_000) return showError('Choose an image smaller than 2.8 MB for this first version.');
  selectedFile = file;
  const preview = $('imagePreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  $('uploadPlaceholder').classList.add('hidden');
  $('removeImage').classList.remove('hidden');
  statusPanel.classList.add('hidden');
}
function clearImage() {
  selectedFile = null;
  imageInput.value = '';
  $('imagePreview').removeAttribute('src');
  $('imagePreview').classList.add('hidden');
  $('uploadPlaceholder').classList.remove('hidden');
  $('removeImage').classList.add('hidden');
}
function showError(message) {
  statusPanel.classList.remove('hidden');
  $('spinner').classList.add('done');
  $('statusTitle').textContent = 'Needs attention';
  $('statusMessage').textContent = message;
  $('resultWrap').classList.add('hidden');
  $('generateBtn').disabled = false;
  $('generateLabel').textContent = 'Generate video';
}
function setBusy(busy, label = 'Generating…') {
  $('generateBtn').disabled = busy;
  $('generateLabel').textContent = busy ? label : 'Generate video';
}
function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}
function headers() {
  const password = sessionStorage.getItem('motionAppPassword') || '';
  return { 'Content-Type': 'application/json', ...(password ? { 'x-app-password': password } : {}) };
}
async function apiJson(url, options = {}, allowPasswordPrompt = true) {
  const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && allowPasswordPrompt && !sessionStorage.getItem('motionAppPassword')) {
    const password = window.prompt('This deployment requires the app password set by its owner:');
    if (password) {
      sessionStorage.setItem('motionAppPassword', password);
      return apiJson(url, options, false);
    }
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
$('generateBtn').addEventListener('click', async () => {
  if (!selectedFile) return showError('Choose an image first.');
  if (!promptInput.value.trim()) return showError('Describe the motion you want to generate.');
  if (!$('adultConfirm').checked) return showError('Confirm the age and consent statement before continuing.');
  if (!sessionStorage.getItem('motionAppPassword') && document.body.dataset.passwordRequired === 'true') {
    const password = window.prompt('Enter the app password provided by the owner:');
    if (!password) return;
    sessionStorage.setItem('motionAppPassword', password);
  }
  clearTimeout(requestTimer);
  statusPanel.classList.remove('hidden');
  $('spinner').classList.remove('done');
  $('spinner').classList.remove('hidden');
  $('statusTitle').textContent = 'Submitting request';
  $('statusMessage').textContent = 'Uploading the image data to the configured AI provider…';
  $('resultWrap').classList.add('hidden');
  setBusy(true, 'Submitting…');
  statusPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  try {
    const imageData = await toDataUrl(selectedFile);
    const job = await apiJson('/api/generate', { method: 'POST', body: JSON.stringify({ prompt: promptInput.value.trim(), imageData, duration: selectedDuration, adultConfirmed: $('adultConfirm').checked }) });
    $('statusTitle').textContent = 'Your video is in the queue';
    $('statusMessage').textContent = `Request ${job.requestId} · waiting for the provider to finish.`;
    setBusy(true, 'Generating…');
    pollStatus(job.requestId, 0);
  } catch (error) {
    showError(error.message || 'Could not submit the request.');
  }
});

async function pollStatus(requestId, attempt) {
  if (attempt > 90) { showError('This request is taking longer than expected. You can retry later; the provider job may still be running.'); return; }
  try {
    const result = await apiJson(`/api/status?requestId=${encodeURIComponent(requestId)}`);
    if (result.status === 'COMPLETED' && result.videoUrl) {
      $('spinner').classList.add('done');
      $('statusTitle').textContent = 'Video ready';
      $('statusMessage').textContent = 'Generation completed. Preview or save your clip below.';
      $('resultVideo').src = result.videoUrl;
      $('downloadLink').href = result.videoUrl;
      $('resultWrap').classList.remove('hidden');
      setBusy(false);
      return;
    }
    if (['FAILED', 'CANCELLED'].includes(result.status)) { showError(`The provider job ${result.status.toLowerCase()}. No video was produced.`); return; }
    $('statusTitle').textContent = result.status === 'IN_QUEUE' ? 'Waiting in queue' : 'Generating your video';
    $('statusMessage').textContent = `Status: ${result.status}. This can take several minutes.`;
    requestTimer = setTimeout(() => pollStatus(requestId, attempt + 1), 5000);
  } catch (error) {
    showError(error.message || 'Could not check the generation status.');
  }
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
