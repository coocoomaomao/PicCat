const $=s=>document.querySelector(s);
let files=[];let inspected=[];let outputDir=null;
const fmtBytes=b=>{if(!b)return'0 B';const u=['B','KB','MB','GB'];let i=0,v=b;while(v>=1024&&i<u.length-1){v/=1024;i++}return`${v>=10||i===0?v.toFixed(0):v.toFixed(1)} ${u[i]}`};
const toast=msg=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)};

async function addFiles(paths){
  const merged=[...new Set([...files,...paths])];
  files=merged; inspected=await window.piccat.inspectImages(files); renderFiles(); renderSummary();
  $('#workspace').hidden=files.length===0;
}

function renderFiles(){
  $('#queueBadge').textContent=`${files.length} 张`;
  $('#fileList').innerHTML=inspected.map((x,i)=>x.ok?`<div class="file-row"><b>${x.name}</b><span class="dim">${x.width||'?'}×${x.height||'?'}</span><span class="size">${fmtBytes(x.size)}</span><button data-remove="${i}">移除</button></div>`:`<div class="file-row"><b>${x.name}</b><span>${x.error}</span><span></span><button data-remove="${i}">移除</button></div>`).join('');
}

$('#fileList').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;const i=Number(b.dataset.remove);files.splice(i,1);inspected.splice(i,1);renderFiles();renderSummary();$('#workspace').hidden=files.length===0;});

async function choose(){const p=await window.piccat.chooseImages();if(p.length)addFiles(p)}
$('#chooseBtn').addEventListener('click',choose);$('#dropZone').addEventListener('click',choose);
$('#clearBtn').addEventListener('click',()=>{files=[];inspected=[];renderFiles();renderSummary();$('#workspace').hidden=true;$('#resultList').innerHTML='';});

const dz=$('#dropZone');
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
dz.addEventListener('drop',e=>{const p=[...e.dataTransfer.files].map(f=>f.path).filter(Boolean);if(p.length)addFiles(p)});

$('#quality').addEventListener('input',()=>{$('#qualityValue').textContent=$('#quality').value;renderSummary()});
$('#format').addEventListener('change',()=>{updateControls();renderSummary()});
$('#resizeMode').addEventListener('change',()=>{updateControls();renderSummary()});
['percent','longEdge','width','height','keepAspect','withoutEnlargement','jpgBackground','suffix'].forEach(id=>$('#'+id).addEventListener('input',renderSummary));

function updateControls(){
  const m=$('#resizeMode').value;
  $('#percentWrap').style.display=m==='percent'?'block':'none';
  $('#longEdgeWrap').style.display=m==='longEdge'?'block':'none';
  $('#widthWrap').style.display=(m==='width'||m==='exact')?'block':'none';
  $('#heightWrap').style.display=(m==='height'||m==='exact')?'block':'none';
  $('#jpgBgWrap').style.display=$('#format').value==='jpg'?'block':'none';
  $('#quality').disabled=$('#format').value==='png';
}

function options(){return{format:$('#format').value,quality:Number($('#quality').value),resizeMode:$('#resizeMode').value,percent:Number($('#percent').value),longEdge:Number($('#longEdge').value),width:Number($('#width').value),height:Number($('#height').value),keepAspect:$('#keepAspect').checked,withoutEnlargement:$('#withoutEnlargement').checked,jpgBackground:$('#jpgBackground').value,suffix:$('#suffix').value.trim()}}

function renderSummary(){
  if(!files.length){$('#summary').innerHTML='选择图片后，这里会显示转换计划。';return}
  const o=options();const modeMap={original:'保持原尺寸',percent:`缩放为 ${o.percent}%`,longEdge:`最长边 ${o.longEdge}px`,width:`宽度 ${o.width}px`,height:`高度 ${o.height}px`,exact:`${o.width}×${o.height}px`};
  $('#summary').innerHTML=`准备处理 <b>${files.length}</b> 张图片 → <b>${o.format.toUpperCase()}</b><br>尺寸：${modeMap[o.resizeMode]}${o.keepAspect?' · 锁定比例':''}${o.withoutEnlargement?' · 不放大小图':''}<br>${o.format==='png'?'PNG 使用无损压缩':`质量：${o.quality}`}`;
}

$('#outputBtn').addEventListener('click',async()=>{const p=await window.piccat.chooseOutputDir();if(p){outputDir=p;$('#outputPath').textContent=p;$('#outputBadge').textContent='已选择'}});

function preset(name){
  if(name==='xiaohongshu'){ $('#resizeMode').value='exact';$('#width').value=1080;$('#height').value=1440;$('#keepAspect').checked=true; }
  if(name==='avatar'){ $('#resizeMode').value='exact';$('#width').value=1080;$('#height').value=1080;$('#keepAspect').checked=true; }
  if(name==='video'){ $('#resizeMode').value='exact';$('#width').value=1920;$('#height').value=1080;$('#keepAspect').checked=true; }
  if(name==='long1920'){ $('#resizeMode').value='longEdge';$('#longEdge').value=1920; }
  if(name==='half'){ $('#resizeMode').value='percent';$('#percent').value=50; }
  updateControls();renderSummary();
}
$('.presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b)preset(b.dataset.preset)});

window.piccat.onProgress(p=>{const pct=Math.round(p.current/p.total*100);$('#progressBar').style.width=pct+'%';$('#progressText').textContent=`正在处理 ${p.current}/${p.total}`});

$('#convertBtn').addEventListener('click',async()=>{
  if(!files.length){toast('先选择图片');return}
  if(!outputDir){toast('先选择输出文件夹');return}
  $('#progressWrap').hidden=false;$('#progressBar').style.width='0%';$('#progressText').textContent='准备中…';$('#convertBtn').disabled=true;$('#resultList').innerHTML='';
  const results=await window.piccat.convert({files,outputDir,options:options()});
  $('#convertBtn').disabled=false;$('#progressText').textContent='处理完成';
  $('#resultList').innerHTML=results.map((r,i)=>r.ok?`<div class="result-row ok"><div><b>✓ ${r.target.split(/[\\/]/).pop()}</b><br><span>${r.width}×${r.height} · ${fmtBytes(r.size)}</span></div><button data-reveal="${i}">打开位置</button></div>`:`<div class="result-row fail"><div><b>✕ ${r.source.split(/[\\/]/).pop()}</b><br><span>${r.error}</span></div><span></span></div>`).join('');
  $('#resultList').dataset.results=JSON.stringify(results);
  toast(`完成：${results.filter(x=>x.ok).length}/${results.length} 张`);
});
$('#resultList').addEventListener('click',e=>{const b=e.target.closest('[data-reveal]');if(!b)return;const arr=JSON.parse($('#resultList').dataset.results||'[]');const r=arr[Number(b.dataset.reveal)];if(r?.target)window.piccat.revealFile(r.target)});
updateControls();renderSummary();
