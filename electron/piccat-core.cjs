const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED_INPUTS = new Set(['.jpg','.jpeg','.png','.webp','.avif','.tif','.tiff','.gif']);
const OUTPUT_FORMATS = new Set(['jpg','png','webp']);

function isSupportedInput(filePath) {
  return SUPPORTED_INPUTS.has(path.extname(filePath).toLowerCase());
}

function normalizeFormat(format) {
  const f = String(format || '').toLowerCase().replace('jpeg','jpg');
  if (!OUTPUT_FORMATS.has(f)) throw new Error(`不支持的输出格式：${format}`);
  return f;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function calculateTargetSize(meta, options={}) {
  const width = Number(meta.width || 0);
  const height = Number(meta.height || 0);
  if (!width || !height) return { width:null, height:null };
  const mode = options.resizeMode || 'original';

  if (mode === 'original') return { width:null, height:null };
  if (mode === 'percent') {
    const pct = clamp(options.percent || 100, 1, 1000) / 100;
    return { width:Math.max(1, Math.round(width*pct)), height:Math.max(1, Math.round(height*pct)) };
  }
  if (mode === 'longEdge') {
    const edge = Math.max(1, Math.round(Number(options.longEdge || 1920)));
    if (width >= height) return { width:edge, height:null };
    return { width:null, height:edge };
  }
  if (mode === 'width') return { width:Math.max(1, Math.round(Number(options.width || width))), height:null };
  if (mode === 'height') return { width:null, height:Math.max(1, Math.round(Number(options.height || height))) };
  if (mode === 'exact') {
    return {
      width:Math.max(1, Math.round(Number(options.width || width))),
      height:Math.max(1, Math.round(Number(options.height || height)))
    };
  }
  return { width:null, height:null };
}

function outputName(filePath, format, suffix='') {
  const parsed = path.parse(filePath);
  const safeSuffix = suffix ? `_${suffix}` : '';
  return `${parsed.name}${safeSuffix}.${format}`;
}

function uniqueTarget(target) {
  if (!fs.existsSync(target)) return target;
  const p = path.parse(target);
  let i = 2;
  while (true) {
    const candidate = path.join(p.dir, `${p.name} (${i})${p.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    i++;
  }
}

async function inspectImage(filePath) {
  if (!isSupportedInput(filePath)) throw new Error('不支持的图片格式');
  const meta = await sharp(filePath, { animated:false }).metadata();
  const st = fs.statSync(filePath);
  return {
    path:filePath,
    name:path.basename(filePath),
    width:meta.width || null,
    height:meta.height || null,
    format:meta.format || path.extname(filePath).slice(1).toLowerCase(),
    size:st.size,
    hasAlpha:Boolean(meta.hasAlpha),
    orientation:meta.orientation || null
  };
}

function applyResize(img, target, options) {
  if (!target.width && !target.height) return img;
  const mode = options.resizeMode || 'original';
  if (mode === 'exact' && options.keepAspect === false) {
    return img.resize({ width:target.width, height:target.height, fit:'fill' });
  }
  if (mode === 'exact') {
    return img.resize({ width:target.width, height:target.height, fit:options.fit || 'inside', withoutEnlargement:Boolean(options.withoutEnlargement) });
  }
  return img.resize({ width:target.width || undefined, height:target.height || undefined, fit:'inside', withoutEnlargement:Boolean(options.withoutEnlargement) });
}

async function convertOne(filePath, outputDir, options={}) {
  if (!isSupportedInput(filePath)) throw new Error(`不支持的输入图片：${path.basename(filePath)}`);
  const format = normalizeFormat(options.format || 'png');
  fs.mkdirSync(outputDir, { recursive:true });
  const meta = await sharp(filePath, { animated:false }).metadata();
  const target = calculateTargetSize(meta, options);
  let img = sharp(filePath, { animated:false }).rotate();
  img = applyResize(img, target, options);

  if (format === 'jpg') {
    const bg = options.jpgBackground || '#ffffff';
    img = img.flatten({ background:bg }).jpeg({ quality:clamp(options.quality || 88, 1, 100), mozjpeg:true });
  } else if (format === 'webp') {
    img = img.webp({ quality:clamp(options.quality || 88, 1, 100), effort:4 });
  } else {
    img = img.png({ compressionLevel:9, adaptiveFiltering:true });
  }

  const targetPath = uniqueTarget(path.join(outputDir, outputName(filePath, format, options.suffix || '')));
  const info = await img.toFile(targetPath);
  return {
    source:filePath,
    target:targetPath,
    width:info.width,
    height:info.height,
    format:info.format,
    size:info.size
  };
}

async function convertBatch(files, outputDir, options={}, onProgress=()=>{}) {
  const results=[];
  for (let i=0;i<files.length;i++) {
    try {
      const result = await convertOne(files[i], outputDir, options);
      results.push({ ok:true, ...result });
    } catch (error) {
      results.push({ ok:false, source:files[i], error:error.message });
    }
    onProgress({ current:i+1, total:files.length, file:files[i] });
  }
  return results;
}

module.exports = {
  SUPPORTED_INPUTS,
  OUTPUT_FORMATS,
  isSupportedInput,
  normalizeFormat,
  calculateTargetSize,
  outputName,
  inspectImage,
  convertOne,
  convertBatch
};
