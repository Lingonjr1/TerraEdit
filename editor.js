(function(){
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('videoPreview');
  const canvas = document.getElementById('timeline');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const zoomInput = document.getElementById('zoom');
  const timeDisplay = document.getElementById('timeDisplay');
  const timelineWrapper = document.getElementById('timelineWrapper');

  let clips = [];
  let duration = 0;
  let pxPerSec = Number(zoomInput.value);
  let scrollX = 0;
  let draggingView = false;
  let dragStartX = 0;
  let scrollStartX = 0;

  function formatTime(t) {
    if (isNaN(t)) return '00:00';
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function totalLength() {
    return clips.reduce((sum, c) => sum + c.duration, 0);
  }

  function resizeCanvas() {
    const fullLength = totalLength();
    const minPxPerSec = canvas.parentElement.clientWidth / fullLength;
    const userZoom = Number(zoomInput.value);
    pxPerSec = Math.max(minPxPerSec, userZoom);
    canvas.width = fullLength * pxPerSec;
  }

 function drawTimeline() {
    resizeCanvas();
    const H = canvas.height;
    ctx.clearRect(0, 0, canvas.width, H);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, H);
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    for (let t = 0; t < totalLength(); t += 1) {
        const x = t * pxPerSec;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
    }
    ctx.stroke();
    let currentStart = 0;
    clips.forEach((clip, i) => {
        const x = currentStart * pxPerSec;
        const w = clip.duration * pxPerSec;
        ctx.fillStyle = clip.color;
        ctx.fillRect(x, 20, w, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "12px Inter";
        ctx.fillText(clip.name, x + 5, 45);
        currentStart += clip.duration;
    });
    const currentTime = video.currentTime;
    let playX = currentTime * pxPerSec;
    ctx.strokeStyle = "#ff5252";
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, H);
    ctx.stroke();
    ctx.fillStyle = "#ff5252";
    ctx.fillRect(playX - 5, 0, 10, H);
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}



let draggingHandle = false;
canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineWrapper.scrollLeft;
    const handleX = video.currentTime * pxPerSec;
    if (x >= handleX - 5 && x <= handleX + 5) draggingHandle = true;
});
window.addEventListener('pointermove', e => {
    if (!draggingHandle) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineWrapper.scrollLeft;
    video.currentTime = Math.max(0, Math.min(x / pxPerSec, duration));
});
window.addEventListener('pointerup', () => draggingHandle = false);


  function rebuildVideo() {
    if (clips.length === 0) return;
    const first = clips[0];
    video.src = first.url;
    duration = totalLength();
    drawTimeline();
  }

  fileInput.addEventListener('change', ev => {
    for (const file of ev.target.files) {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.addEventListener('loadedmetadata', () => {
        clips.push({
          name: file.name,
          url,
          duration: tempVideo.duration,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        });
        rebuildVideo();
      });
    }
  });

  playBtn.addEventListener('click', () => video.play());
  pauseBtn.addEventListener('click', () => video.pause());

  zoomInput.addEventListener('input', () => drawTimeline());
  video.addEventListener('timeupdate', drawTimeline);

  // drag-to-scroll
  canvas.addEventListener('pointerdown', e => {
    draggingView = true;
    dragStartX = e.clientX;
    scrollStartX = timelineWrapper.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!draggingView) return;
    const dx = e.clientX - dragStartX;
    timelineWrapper.scrollLeft = scrollStartX - dx;
  });
  window.addEventListener('pointerup', () => draggingView = false);

  function loop() {
    drawTimeline();
    requestAnimationFrame(loop);
  }
  loop();
})();
