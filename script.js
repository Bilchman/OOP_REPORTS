function openLab(labId, element) {

    // 1. Ховаємо всі лабораторні
    document.querySelectorAll('.lab-section')
        .forEach(sec => sec.classList.remove('active'));

    // 2. Ховаємо всі підменю
    document.querySelectorAll('.submenu')
        .forEach(menu => menu.style.display = 'none');

    // 3. Показуємо вибрану лабораторну
    document.getElementById(labId)
        .classList.add('active');

    // 4. Показуємо відповідне підменю
    element.nextElementSibling.style.display = 'block';

    // 5. Прокручуємо сторінку вгору
    window.scrollTo({ top: 0 });
}
// Функція для розгортання/згортання коду
function toggleCode(header) {
    const article = header.parentElement;
    article.classList.toggle('open');
}

/* Автоматично відкриваємо першу лабораторну */
document.querySelectorAll('.lab-title')[0].click();