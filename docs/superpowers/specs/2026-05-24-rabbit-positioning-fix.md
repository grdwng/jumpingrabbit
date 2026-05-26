# Rabbit Positioning & Camera Drift Fix

**Goal:** Fix 2 bugs in JumpBlockGame:
1. Rabbit offset to the right side of block (X/Z position wrong)
2. Screen drifts gradually off-screen over multiple jumps

**Architecture:** Camera fixed at world origin. Player stays at screen center (0, Y, 0). World scrolls around player.

---

## Issue 1: GLB Rabbit Offset Fix

### Root Cause
When loading the GLB model, the code calculates `scaledBottom` for Y positioning but ignores `scaledCenterX/Z`. If the model's bounding box center isn't at the geometric center, the rabbit appears shifted.

### Fix
In `game.html` around line 279, update the GLB loading position calculation:

```javascript
// Calculate center of scaled bounding box
const scaledBox = new THREE.Box3().setFromObject(rabbitModel);
const scaledBottom = scaledBox.min.y;
const scaledCenterX = (scaledBox.max.x + scaledBox.min.x) / 2;
const scaledCenterZ = (scaledBox.max.z + scaledBox.min.z) / 2;

// Position: center on block, bottom aligned with block top
// Block top is at y=2.25, model bottom needs to align
this.player.position.set(-scaledCenterX, 2.25 - scaledBottom, -scaledCenterZ);
```

### Testing
- Load level 1, rabbit should be centered on start block
- After each jump, rabbit should remain centered on current block

---

## Issue 2: Camera Drift Fix

### Root Cause
Camera uses `worldOffset` to calculate position. If there's any mismatch between how `worldOffset` is updated vs how blocks move, errors accumulate over multiple jumps.

### Fix
In `animate()` around line 1049, simplify camera to fixed position:

```javascript
// Camera stays FIXED at world origin
// Player is always at screen center (0, Y, 0)
this.camera.position.set(0, 36, 36);
this.camera.lookAt(0, 0, 0);
```

### Testing
- Play 10+ jumps in any direction
- Camera should NOT drift — rabbit stays centered on screen

---

## Files to Modify

- `/Users/gordonwangmbp/Desktop/JumpBlockGame/game.html`
  - Lines ~255-279: GLB loading position fix
  - Lines ~1049-1055: Camera position fix

---

## Success Criteria

1. Rabbit visually centered on block (X/Z)
2. Rabbit stays on screen center after 10+ jumps in any direction
3. No regression: jumps still feel smooth, arc works correctly