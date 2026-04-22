// js/gridworm.js 
// (The Infinite Grid Background Pattern - Vanilla JS)

export function initAnimatedGrid() {
  const roots = document.querySelectorAll('.infinite-grid-bg');
  if (roots.length === 0) return;

  const basePatterns = [];
  const activePatterns = [];

  roots.forEach((root, index) => {
    // Ensure root is a background layer behind the regular UI
    root.className = 'absolute inset-0 z-0 pointer-events-none overflow-hidden';

    root.innerHTML = `
          <!-- Blurred Orbs -->
          <div class="absolute inset-0 pointer-events-none z-0">
            <div class="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/40 blur-[120px]"></div>
            <div class="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full bg-blue-500/30 blur-[100px]"></div>
            <div class="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-blue-500/40 blur-[120px]"></div>
          </div>

          <!-- Base Grid -->
          <div class="absolute inset-0 z-0 opacity-[0.05]" style="background-image: url('logo.png'); background-size: 50vw auto; background-repeat: no-repeat; background-position: center;">
            <svg class="w-full h-full">
              <defs>
                <pattern id="grid-pattern-base-${index}" width="40" height="40" patternUnits="userSpaceOnUse" x="0" y="0">
                  <path d="M 40 0 L 0 0 0 40" fill="none" class="stroke-slate-900" stroke-width="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-base-${index})" />
            </svg>
          </div>
          
          <!-- Active Grid (Masked) -->
          <div class="infinite-grid-active absolute inset-0 z-0 opacity-40 transition-opacity duration-300" style="-webkit-mask-image: radial-gradient(300px circle at -100px -100px, black, transparent); mask-image: radial-gradient(300px circle at -100px -100px, black, transparent);">
            <svg class="w-full h-full">
              <defs>
                <pattern id="grid-pattern-active-${index}" width="40" height="40" patternUnits="userSpaceOnUse" x="0" y="0">
                  <path d="M 40 0 L 0 0 0 40" fill="none" class="stroke-blue-600" stroke-width="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-active-${index})" />
            </svg>
          </div>
        `;

    basePatterns.push(document.getElementById(`grid-pattern-base-${index}`));
    activePatterns.push(document.getElementById(`grid-pattern-active-${index}`));
  });

  const maskContainers = document.querySelectorAll('.infinite-grid-active');

  let mouseX = -1000;
  let mouseY = -1000;

  // Listen for mouse movement across the whole document
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    maskContainers.forEach(container => {
      const rect = container.getBoundingClientRect();
      // Calculate mouse position relative to this specific container
      const localX = mouseX - rect.left;
      const localY = mouseY - rect.top;

      const maskStyle = `radial-gradient(300px circle at ${localX}px ${localY}px, black, transparent)`;
      container.style.webkitMaskImage = maskStyle;
      container.style.maskImage = maskStyle;
    });
  });

  // Animation Loop for moving the grid infinitely
  let gridOffsetX = 0;
  let gridOffsetY = 0;
  const speedX = 0.5;
  const speedY = 0.5;

  function animateGrid() {
    gridOffsetX = (gridOffsetX + speedX) % 40;
    gridOffsetY = (gridOffsetY + speedY) % 40;

    basePatterns.forEach(p => { if (p) { p.setAttribute('x', gridOffsetX); p.setAttribute('y', gridOffsetY); } });
    activePatterns.forEach(p => { if (p) { p.setAttribute('x', gridOffsetX); p.setAttribute('y', gridOffsetY); } });

    requestAnimationFrame(animateGrid);
  }

  animateGrid();
}

// Ensure the grid renders
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimatedGrid);
} else {
  initAnimatedGrid();
}