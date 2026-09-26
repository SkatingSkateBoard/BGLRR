// Emergency category buttons
const buttons = document.querySelectorAll<HTMLButtonElement>('button.cat');

buttons.forEach((btn: HTMLButtonElement): void => {
  const press = (): void => btn.classList.add('is-pressed');
  const release = (): void => btn.classList.remove('is-pressed');

  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('pointercancel', release);

  btn.addEventListener('click', (): void => {
    const category: string | undefined = btn.dataset.cat;
    console.log('Selected category:', category);
    // Wire this to your app's routing / state — e.g. navigate to the
    // pin-confirmation screen and pass category along.
  });

  btn.addEventListener('keydown', (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') press();
  });
  btn.addEventListener('keyup', (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') release();
  });
});

// Settings submenu
const menuBtn = document.getElementById('menuBtn') as HTMLButtonElement | null;
const submenu = document.getElementById('submenu') as HTMLDivElement | null;

if (menuBtn && submenu) {
  menuBtn.addEventListener('click', (e: MouseEvent): void => {
    e.stopPropagation();
    submenu.classList.toggle('open');
  });

  document.addEventListener('click', (): void => {
    submenu.classList.remove('open');
  });
} else {
  console.warn('menuBtn or submenu not found in DOM — check your HTML IDs.');
}
