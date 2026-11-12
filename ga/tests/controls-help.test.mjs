import test from 'node:test';
import assert from 'node:assert/strict';
import {playerControls} from '../dist/js/controls-help.js';

test('help follows logical keyboard devices while player magic and run stay independent',()=>{
  const first=playerControls(0,'keyboard',2),second=playerControls(1,'keypad',2);
  assert.match(first.movement,/Q W E/);assert.match(first.movement,/šipky/);assert.equal(first.attack,'S / J');assert.equal(first.jump,'Tab / K');assert.equal(first.magic,'pravý Shift / L');assert.equal(first.run,'R');
  assert.match(second.movement,/Num 7 8 9/);assert.equal(second.attack,'Num 5');assert.equal(second.jump,'Insert');assert.equal(second.magic,'levý Shift');assert.equal(second.run,'F');assert.equal(second.active,true);
});
test('single-player WASD alias is absent in two-player keypad help',()=>{
  assert.match(playerControls(0,'keypad',1).movement,/WASD/);
  assert.doesNotMatch(playerControls(0,'keypad',2).movement,/WASD/);
  assert.equal(playerControls(1,'keyboard',1).active,false);
});
test('mouse and gamepad help avoids unavailable arrow/J/K aliases and keeps native mouse buttons',()=>{
  const mouse=playerControls(0,'mouse',2),pad=playerControls(1,'joystick2',2);
  assert.equal(mouse.attack,'levé tlačítko myši');assert.equal(mouse.jump,'pravé tlačítko myši');assert.doesNotMatch(mouse.movement,/šipky|WASD/);assert.equal(mouse.magic,'pravý Shift / L');
  assert.match(pad.label,/Joystick 2/);assert.equal(pad.attack,'tlačítko 1');assert.equal(pad.jump,'tlačítko 2');assert.equal(pad.magic,'levý Shift');
});
