(function(){
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('videoPreview');
  const canvas = document.getElementById('timeline');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const zoomInput = document.getElementById('zoom');
  const timeDisplay = document.getElementById('timeDisplay');
  const timelineWrapper = document.getElementById('timelineWrapper');
  const clipList = document.getElementById('clipList');

  let clips = [];
  let timeline = [];
  let duration = 0;
  let pxPerSec = Number(zoomInput.value);
  let draggingView = false;
  let dragStartX = 0;
  let scrollStartX = 0;

  let draggingCube = false;

  function formatTime(t){
    if(isNaN(t)) return '00:00';
    const s = Math.floor(t%60).toString().padStart(2,'0');
    const m = Math.floor(t/60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function totalLength(){
    return timeline.reduce((sum,c)=>sum+c.duration,0);
  }

  function resizeCanvas(){
    const fullLength = totalLength() || 1;
    const minPxPerSec = canvas.parentElement.clientWidth / fullLength;
    pxPerSec = Math.max(minPxPerSec, Number(zoomInput.value));
    canvas.width = fullLength * pxPerSec;
  }

  function drawTimeline(){
    resizeCanvas();
    const H = canvas.height;
    ctx.clearRect(0,0,canvas.width,H);

    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0,0,canvas.width,H);

    ctx.strokeStyle = "#444";
    ctx.beginPath();
    for(let t=0; t<totalLength(); t+=1){
      const x = t*pxPerSec;
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
    }
    ctx.stroke();

    let currentStart=0;
    timeline.forEach(clip=>{
      const x = currentStart*pxPerSec;
      const w = clip.duration*pxPerSec;
      ctx.fillStyle = clip.color;
      ctx.fillRect(x,20,w,40);
      ctx.fillStyle = "#fff";
      ctx.font = "12px Inter";
      ctx.fillText(clip.name,x+5,45);
      currentStart += clip.duration;
    });

    // Draw draggable cube
    const playX = video.currentTime * pxPerSec;
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(playX-5,10,10,60);
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  }

  fileInput.addEventListener('change', ev=>{
    for(const file of ev.target.files){
      const url = URL.createObjectURL(file);

      if(file.type.startsWith('video/')){
        const tempVideo=document.createElement('video');
        tempVideo.src=url;
        tempVideo.addEventListener('loadedmetadata',()=>{
          const clip={
            name:file.name,
            url,
            duration:tempVideo.duration,
            type:'video',
            color:'#'+Math.floor(Math.random()*16777215).toString(16)
          };
          clips.push(clip);
          addClipToBin(clip);
        });
      } else if(file.type.startsWith('image/')){
        const img=new Image();
        img.src=url;
        img.onload=()=>{
          const clip={
            name:file.name,
            url,
            duration:3,
            type:'image',
            color:'#'+Math.floor(Math.random()*16777215).toString(16)
          };
          clips.push(clip);
          addClipToBin(clip);
        };
      }
    }
  });

  function addClipToBin(clip){
    const div=document.createElement('div');
    div.className='clip-item';
    div.draggable=true;

    if(clip.type==='video'){
      const vid=document.createElement('video');
      vid.src=clip.url;
      vid.muted=true;
      vid.loop=true;
      vid.autoplay=true;
      vid.playsInline=true;
      vid.style.width='80px';
      vid.style.height='50px';
      div.appendChild(vid);
    } else if(clip.type==='image'){
      const img=document.createElement('img');
      img.src=clip.url;
      img.style.width='80px';
      img.style.height='50px';
      img.style.objectFit='cover';
      img.style.borderRadius='6px';
      div.appendChild(img);
    }

    const name=document.createElement('span');
    name.textContent=clip.name;
    name.style.marginLeft='8px';
    div.appendChild(name);

    const addBtn=document.createElement('button');
    addBtn.className='add-btn';
    addBtn.textContent='+';
    addBtn.addEventListener('click',()=>{
      timeline.push(clip);
      rebuildVideo();
    });

    div.appendChild(addBtn);
    clipList.appendChild(div);

    div.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('clip-name', clip.name);
    });
  }

  canvas.addEventListener('dragover', e=>e.preventDefault());
  canvas.addEventListener('drop', e=>{
    e.preventDefault();
    const name=e.dataTransfer.getData('clip-name');
    const clip=clips.find(c=>c.name===name);
    if(clip){
      timeline.push(clip);
      rebuildVideo();
    }
  });

  canvas.addEventListener('pointerdown', e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left+timelineWrapper.scrollLeft;
    const playX = video.currentTime * pxPerSec;
    if(x >= playX-5 && x <= playX+5){
      draggingCube = true;
    } else {
      draggingView = true;
      dragStartX = e.clientX;
      scrollStartX = timelineWrapper.scrollLeft;
    }
  });

  window.addEventListener('pointermove', e=>{
    if(draggingCube){
      const rect=canvas.getBoundingClientRect();
      const x=e.clientX-rect.left+timelineWrapper.scrollLeft;
      video.currentTime = x/pxPerSec;
    }
    if(draggingView){
      const dx=e.clientX-dragStartX;
      timelineWrapper.scrollLeft=scrollStartX-dx;
    }
  });

  window.addEventListener('pointerup', ()=>{
    draggingCube=false;
    draggingView=false;
  });

  playBtn.addEventListener('click', ()=>{
    if(video.paused){
      video.play();
      playBtn.textContent='⏸';
    } else {
      video.pause();
      playBtn.textContent='▶️';
    }
  });

  video.addEventListener('ended', ()=>playBtn.textContent='▶️');
  zoomInput.addEventListener('input', drawTimeline);
  video.addEventListener('timeupdate', drawTimeline);

 function rebuildVideo() {
  if (timeline.length === 0) return;
  let currentIndex = 0;
  let imageTimer = null;

  function playClip(index) {
    if (imageTimer) {
      clearInterval(imageTimer);
      imageTimer = null;
    }
    const clip = timeline[index];
    if (!clip) {
      video.pause();
      video.src = "";
      playBtn.textContent = '▶️';
      return;
    }

    currentIndex = index;

    if (clip.type === 'video') {
      video.style.display = 'block';
      video.src = clip.url;
      video.play();
      video.onended = () => playClip(index + 1);
    } else if (clip.type === 'image') {
      video.pause();
      video.style.display = 'none';
      let imgPreview = document.getElementById('imagePreview');
      if (!imgPreview) {
        imgPreview = document.createElement('img');
        imgPreview.id = 'imagePreview';
        imgPreview.style.position = 'absolute';
        imgPreview.style.top = video.offsetTop + 'px';
        imgPreview.style.left = video.offsetLeft + 'px';
        imgPreview.style.width = video.offsetWidth + 'px';
        imgPreview.style.height = video.offsetHeight + 'px';
        imgPreview.style.objectFit = 'contain';
        imgPreview.style.borderRadius = video.style.borderRadius;
        video.parentElement.appendChild(imgPreview);
      }
      imgPreview.src = clip.url;
      imgPreview.style.display = 'block';
      let startTime = Date.now();
      imageTimer = setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= clip.duration) {
          clearInterval(imageTimer);
          imgPreview.style.display = 'none';
          playClip(index + 1);
        }
      }, 50);
    }
  }

  playClip(0);
}


  function loop(){ drawTimeline(); requestAnimationFrame(loop); }
  loop();
})();
