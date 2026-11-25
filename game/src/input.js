// Warung Rush — keyboard and mouse input. One file, one job: turn browser
// events into the game's key set and click point, nothing else.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    click: null, // { x, y } in canvas pixels, consumed by the game loop
    pressed: new Set(), // keys pressed since the last frame, consumed too
  };

  const keyName = (event) => event.key.toLowerCase();

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(key === ' ' ? 'space' : key);
    input.keys.add(key === ' ' ? 'space' : key);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(keyName(event) === ' ' ? 'space' : keyName(event));
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.click = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  });

  return input;
}

// Take the click out of the input, if one arrived since the last frame.
export function takeClick(input) {
  const click = input.click;
  input.click = null;
  return click;
}

// True when the key was pressed since the last frame (edge-triggered).
export function wasPressed(input, key) {
  return input.pressed.has(key);
}

// Clear the edge-triggered presses at the end of a frame.
export function endFrame(input) {
  input.pressed.clear();
}
