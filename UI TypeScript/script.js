"use strict";
// Emergency category buttons
const buttons = document.querySelectorAll('button.cat');
buttons.forEach((btn) => {
    const press = () => btn.classList.add('is-pressed');
    const release = () => btn.classList.remove('is-pressed');
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('click', () => {
        const category = btn.dataset.cat;
        console.log('Selected category:', category);
        // Wire this to your app's routing / state — e.g. navigate to the
        // pin-confirmation screen and pass category along.
    });
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ')
            press();
    });
    btn.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ')
            release();
    });
});
// Settings submenu
const menuBtn = document.getElementById('menuBtn');
const submenu = document.getElementById('submenu');
if (menuBtn && submenu) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('open');
    });
    document.addEventListener('click', () => {
        submenu.classList.remove('open');
    });
}
else {
    console.warn('menuBtn or submenu not found in DOM — check your HTML IDs.');
}
//# sourceMappingURL=script.js.map