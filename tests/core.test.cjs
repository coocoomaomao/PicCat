const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('path');
const core=require('../electron/piccat-core.cjs');

test('supports common formats',()=>{
  assert.equal(core.isSupportedInput('a.JPG'),true);
  assert.equal(core.isSupportedInput('a.webp'),true);
  assert.equal(core.isSupportedInput('a.docx'),false);
});

test('normalizes jpeg to jpg',()=>{
  assert.equal(core.normalizeFormat('jpeg'),'jpg');
  assert.equal(core.normalizeFormat('PNG'),'png');
});

test('calculates percentage size',()=>{
  assert.deepEqual(core.calculateTargetSize({width:2000,height:1000},{resizeMode:'percent',percent:50}),{width:1000,height:500});
});

test('calculates long edge size preserving orientation',()=>{
  assert.deepEqual(core.calculateTargetSize({width:2000,height:1000},{resizeMode:'longEdge',longEdge:1920}),{width:1920,height:null});
  assert.deepEqual(core.calculateTargetSize({width:800,height:1600},{resizeMode:'longEdge',longEdge:1200}),{width:null,height:1200});
});

test('output name uses requested format',()=>{
  assert.equal(core.outputName(path.join('x','photo.webp'),'png','converted'),'photo_converted.png');
});
