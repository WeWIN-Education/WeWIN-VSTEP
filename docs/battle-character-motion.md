# WEWIN battle character motion

Open `/character-preview` to inspect the 12 states, both characters, light/dark
backdrops, pause/replay, and a scripted combat sequence. This is a motion preview,
not a playable or online match. It is not added to learner navigation.

## Assets

- `public/battle/hero/*.webp`: HERO_01 through HERO_12.
- `public/battle/rival/*.webp`: the corresponding purple-energy opponent poses.
- `public/battle/manifest.json`: exact original-file to state mapping.
- 24 images at 768 x 768, approximately 2.4 MB total; original PNGs are untouched.
- Rebuild with `node scripts/prepare-battle-characters.mjs <source-directory>`.
  Sharp is already installed through Next.js. No dependencies were added.

The preparation script removes near-black background connected to image edges,
feathers that boundary and retains enclosed dark details such as eyes. The source
glows are flattened against black; small dark fringes may remain on very bright
backgrounds. Inspect both preview backgrounds when replacing images.

## Use in a battle

```tsx
import { BattleCharacter } from "@/components/battle/BattleCharacter";

<BattleCharacter variant="hero" state="thinking" />
<BattleCharacter variant="rival" state="hit" facing="left" />
```

`state` accepts: idle, ready, thinking, answering, correct, attack, wrong, hit,
defense, victory, defeat, draw. `replay` is a numeric event counter: increment it
to repeat the same action. Ordinary rerenders do not restart an action.
`paused` pauses both image deformation and CSS effects. `facing` controls the
direction of lunge/recoil, not texture mirroring, so WEWIN lettering stays legible.

Idle, ready and thinking loop. Other full-body actions play once, then retain
their pose with gentle local movement. `CHARACTER_STATES` documents action
durations. A future match controller selects subsequent states from confirmed
game events; animation completion must never award points or decide outcomes.

## Rendering

A native WebGL mesh gently deforms cape, head, torso and wrist regions of each
supplied pose. CSS provides anticipation, lunge, recoil, celebration, a shield,
and particles. Artwork remains 2D: no new viewing angles, hidden limb recovery,
skeletal rig or AI video generation is implied. The optimized WebP files are
static textures; motion is produced by `BattleCharacter` in the browser.

Two characters are rendered in the preview. Resolution is capped at 900px and
2x pixel density. Offscreen/hidden characters stop rendering; unmount disposes
resources. Reduced motion shows the correct static pose and stops the demo
timeline. Missing WebGL or context loss keeps a static image plus CSS fallback.
Changing the pose/replaying creates a new canvas and can recover a lost context.

## Verification

Start the app, set `QA_BASE_URL` if not using port 3000, then run:

```text
npx playwright test tests/e2e/battle-characters.spec.ts --workers=1
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

Browser coverage: all 24 textures, actual animated pixel changes, frozen paused
frames, replay, interrupted demo, 390px mobile overflow, live reduced-motion
changes, WebGL loss and fallback recovery. Screenshots go to `.qa/` (gitignored).
