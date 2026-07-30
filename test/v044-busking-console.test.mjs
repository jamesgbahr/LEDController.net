import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { AdaptiveShowDirector } from '../public/show-engine.js';
import { OutputTester } from '../src/output.mjs';

const base = (overrides={}) => ({
  width:16,height:4,timeSeconds:0,showStyle:'festival',showSeed:'busking-test',showIntensity:.8,
  showSceneBeats:16,showTransitionSeconds:.35,showVariation:.5,showAdaptive:true,showAudioSync:true,
  showBpm:120,showPerformance:.85,showGestureRate:.5,showMixStyle:'hybrid',showStrobeSafe:true,
  showControlMode:'busking',showRate:1,showLookId:'flow',showLookToken:0,speed:1,brightness:.5,
  audioEnabled:true,audio:{level:.4,bass:.4,kick:0,snare:0,hihat:0},...overrides
});

test('busking mode holds the selected look instead of auto changing',()=>{
  const d=new AdaptiveShowDirector();
  const first=d.render(base({timeSeconds:0}));
  const later=d.render(base({timeSeconds:90}));
  assert.equal(first.status.deckA,'FLOW');
  assert.equal(later.status.deckA,'FLOW');
  assert.equal(later.status.controlMode,'busking');
});

test('manual look pad takes a new look quickly',()=>{
  const d=new AdaptiveShowDirector();
  d.render(base({timeSeconds:0}));
  const mixing=d.render(base({timeSeconds:.1,showLookId:'scanner',showLookToken:1}));
  assert.match(mixing.status.currentLook,/FLOW.*SCANNER/);
  const landed=d.render(base({timeSeconds:.6,showLookId:'scanner',showLookToken:1}));
  assert.equal(landed.status.deckA,'SCANNER');
});

test('show rate and main speed both affect rendered motion',()=>{
  const slow=new AdaptiveShowDirector();
  const fast=new AdaptiveShowDirector();
  slow.render(base({timeSeconds:0,speed:.5,showRate:.5}));
  fast.render(base({timeSeconds:0,speed:2,showRate:2}));
  const a=slow.render(base({timeSeconds:1,speed:.5,showRate:.5})).frame;
  const b=fast.render(base({timeSeconds:1,speed:2,showRate:2})).frame;
  assert.notDeepEqual(Array.from(a),Array.from(b));
});

test('kick transient creates an immediate operator move',()=>{
  const d=new AdaptiveShowDirector();
  d.render(base({timeSeconds:0}));
  const hit=d.render(base({timeSeconds:.07,audio:{level:.7,bass:.8,kick:.95,snare:0,hihat:0}}));
  assert.equal(hit.status.operatorMove,'Fader punch');
});

test('output normalizes new busking settings',()=>{
  const tester=new OutputTester();
  const config=tester.buildConfig({targetIp:'127.0.0.1',protocol:'ddp',width:16,height:4,showMode:true,showControlMode:'busking',showRate:3,showLookId:'rings',showLookToken:4,showReverseToken:2,showColorToken:3});
  assert.equal(config.showControlMode,'busking');
  assert.equal(config.showRate,3);
  assert.equal(config.showLookId,'rings');
  tester.socket.close();
});

test('frontend exposes the busking console controls',async()=>{
  const [html,app,css]=await Promise.all([fs.readFile(new URL('../public/index.html',import.meta.url),'utf8'),fs.readFile(new URL('../public/app.js',import.meta.url),'utf8'),fs.readFile(new URL('../public/workspace.css',import.meta.url),'utf8')]);
  for(const id of ['showControlMode','showRate','showReverse','showColorHit']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/data-show-look="flow"/);
  assert.match(html,/data-show-rate="1.5"/);
  assert.match(app,/selectShowLook/);
  assert.match(css,/\.show-look-bank/);
});
