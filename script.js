// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
window.dishesData = [];

let selectedDishes = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
};

let activeFilters = {
    soup: 'all',
    main: 'all',
    salad: 'all',
    drink: 'all',
    dessert: 'all'
};

// === ФУНКЦИИ ДЛЯ РАБОТЫ С LOCALSTORAGE ===
function saveOrderToLocalStorage() {
    const orderData = {};
    for (const [category, dish] of Object.entries(selectedDishes)) {
        if (dish) {
            orderData[category] = dish.keyword;
        }
    }
    localStorage.setItem('foodConstructOrder', JSON.stringify(orderData));
}

function loadOrderFromLocalStorage() {
    const savedOrder = localStorage.getItem('foodConstructOrder');
    if (savedOrder) {
        const orderData = JSON.parse(savedOrder);
        
        // Загружаем данные блюд если они уже загружены
        if (window.dishesData.length > 0) {
            for (const [category, keyword] of Object.entries(orderData)) {
                const dish = window.dishesData.find(d => d.keyword === keyword);
                if (dish) {
                    selectedDishes[category] = dish;
                }
            }
            updateUIFromSelectedDishes();
        }
    }
}

function clearOrderFromLocalStorage() {
    localStorage.removeItem('foodConstructOrder');
}

function updateUIFromSelectedDishes() {
    // Обновляем карточки блюд
    document.querySelectorAll('.dish-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.add-button');
        if (btn) btn.textContent = 'Добавить';
    });

    // Помечаем выбранные блюда
    for (const [category, dish] of Object.entries(selectedDishes)) {
        if (dish) {
            const selectedCard = document.querySelector(`[data-dish="${dish.keyword}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
                const btn = selectedCard.querySelector('.add-button');
                if (btn) btn.textContent = 'Выбрано';
            }
        }
    }

    updateOrderSummary();
    updateStickyPanel();
}

// === STICKY PANEL ДЛЯ ПЕРЕХОДА К ОФОРМЛЕНИЮ ===
function createStickyPanel() {
    // Проверяем, есть ли уже панель
    if (document.getElementById('sticky-order-panel')) {
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'sticky-order-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        border: 2px solid #e74c3c;
        display: none;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
        max-width: 90%;
        width: 600px;
    `;
    
    panel.innerHTML = `
        <div class="panel-content">
            <div class="panel-total"><strong>Стоимость заказа:</strong> <span id="panel-total-price">0</span>₽</div>
            <div class="panel-note" id="panel-note">Выберите подходящий комбо для оформления заказа</div>
        </div>
        <a href="order.html" class="checkout-button" id="checkout-button">Перейти к оформлению</a>
    `;
    
    document.body.appendChild(panel);
}

function updateStickyPanel() {
    const panel = document.getElementById('sticky-order-panel');
    const totalPriceElement = document.getElementById('panel-total-price');
    const noteElement = document.getElementById('panel-note');
    const checkoutButton = document.getElementById('checkout-button');
    
    if (!panel) return;
    
    const total = calculateTotalPrice();
    const isValidCombo = checkLunchCompositionSilent();
    
    if (total > 0) {
        panel.style.display = 'flex';
        if (totalPriceElement) totalPriceElement.textContent = total;
        
        if (isValidCombo) {
            noteElement.textContent = 'Заказ соответствует доступному комбо';
            noteElement.style.color = '#27ae60';
            checkoutButton.style.pointerEvents = 'auto';
            checkoutButton.style.opacity = '1';
            checkoutButton.style.background = '#e74c3c';
            checkoutButton.style.color = 'white';
        } else {
            noteElement.textContent = 'Выберите подходящий комбо для оформления заказа';
            noteElement.style.color = '#e74c3c';
            checkoutButton.style.pointerEvents = 'none';
            checkoutButton.style.opacity = '0.6';
            checkoutButton.style.background = '#ccc';
            checkoutButton.style.color = '#666';
        }
    } else {
        panel.style.display = 'none';
    }
}

function calculateTotalPrice() {
    let total = 0;
    for (const dish of Object.values(selectedDishes)) {
        if (dish) {
            total += dish.price;
        }
    }
    return total;
}

// === ОСНОВНЫЕ ФУНКЦИИ ===
async function loadDishes() {
    try {
        const response = await fetch('https://edu.std-900.ist.mospolytech.ru/labs/api/dishes?key=fdb746ba-4802-46af-9f21-10ccd05a1b63');
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const dishes = await response.json();
        window.dishesData = dishes;
        displayDishes(dishes);
        setupFilters();
        loadOrderFromLocalStorage(); // Загружаем сохраненный заказ после загрузки блюд
        createStickyPanel(); // Создаем панель после загрузки
        updateStickyPanel(); // Обновляем состояние панели
    } catch (error) {
        console.error('Не удалось загрузить блюда:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color:red;text-align:center;padding:20px;background:#ffe6e6;margin:20px;border-radius:8px;';
        errorDiv.textContent = 'Ошибка загрузки меню. Попробуйте позже.';
        document.querySelector('.lunch-container').prepend(errorDiv);
    }
}

function displayDishes(dishes) {
    const normalizedDishes = dishes.map(dish => {
        let normalizedCategory = dish.category;
        if (dish.category === 'main-course') normalizedCategory = 'main';
        if (dish.category === 'first-course') normalizedCategory = 'soup';
        return { ...dish, category: normalizedCategory };
    });

    const sorted = [...normalizedDishes].sort((a, b) => a.name.localeCompare(b.name));

    const categories = {
        soup: filterDishes(sorted.filter(d => d.category === 'soup'), 'soup'),
        main: filterDishes(sorted.filter(d => d.category === 'main'), 'main'),
        salad: filterDishes(sorted.filter(d => d.category === 'salad'), 'salad'),
        drink: filterDishes(sorted.filter(d => d.category === 'drink'), 'drink'),
        dessert: filterDishes(sorted.filter(d => d.category === 'dessert'), 'dessert')
    };

    displayCategory('soup-dishes', categories.soup);
    displayCategory('main-dishes', categories.main);
    displayCategory('salad-dishes', categories.salad);
    displayCategory('drink-dishes', categories.drink);
    displayCategory('dessert-dishes', categories.dessert);

    updateOrderSummary();
}

function filterDishes(dishesArray, category) {
    const filter = activeFilters[category];
    if (filter === 'all') return dishesArray;
    return dishesArray.filter(d => d.kind === filter);
}

function setupFilters() {
    document.querySelectorAll('.filters').forEach(container => {
        const category = container.id.replace('-filters', '');
        const buttons = container.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const kind = btn.getAttribute('data-kind');
                buttons.forEach(b => b.classList.remove('active'));
                if (activeFilters[category] === kind) {
                    activeFilters[category] = 'all';
                    container.querySelector('[data-kind="all"]').classList.add('active');
                } else {
                    activeFilters[category] = kind;
                    btn.classList.add('active');
                }
                displayDishes(window.dishesData);
            });
        });
    });
}

function displayCategory(containerId, dishes) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!dishes.length) {
        container.innerHTML = '<p>Блюда временно отсутствуют</p>';
        return;
    }
    dishes.forEach(dish => container.appendChild(createDishElement(dish)));
}

function createDishElement(dish) {
    const div = document.createElement('div');
    div.className = 'dish-card';
    if (selectedDishes[dish.category]?.keyword === dish.keyword) div.classList.add('selected');
    div.dataset.dish = dish.keyword;
    div.innerHTML = `
        <img src="${dish.image}" alt="${dish.name}" class="dish-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="dish-price">${dish.price} ₽</div>
        <div class="dish-name">${dish.name}</div>
        <div class="dish-weight">${dish.count}</div>
        <button class="add-button">${selectedDishes[dish.category]?.keyword === dish.keyword ? 'Выбрано' : 'Добавить'}</button>
    `;
    div.addEventListener('click', () => selectDish(dish));
    return div;
}

function selectDish(dish) {
    selectedDishes[dish.category] = dish;
    saveOrderToLocalStorage(); // Сохраняем в localStorage
    updateUIFromSelectedDishes();
}

function updateOrderSummary() {
    const orderSection = document.getElementById('order-items');
    const totalSection = document.getElementById('total-section');
    
    if (!orderSection || !totalSection) return;
    
    let total = 0;
    let orderHTML = '';
    let hasSelected = false;

    const cats = [
        { key: 'soup', name: 'Суп' },
        { key: 'main', name: 'Главное блюдо' },
        { key: 'salad', name: 'Салат/стартер' },
        { key: 'drink', name: 'Напиток' },
        { key: 'dessert', name: 'Десерт' }
    ];

    cats.forEach(cat => {
        const dish = selectedDishes[cat.key];
        if (dish) {
            hasSelected = true;
            total += dish.price;
            orderHTML += `<div class="order-item"><strong>${cat.name}</strong><br>${dish.name} ${dish.price}₽</div>`;
        } else {
            orderHTML += `<div class="order-item"><strong>${cat.name}</strong><br>Не выбрано</div>`;
        }
    });

    if (hasSelected) {
        orderSection.innerHTML = orderHTML;
        document.getElementById('total-price').textContent = total;
        totalSection.style.display = 'block';
    } else {
        orderSection.innerHTML = '<div class="empty-order">Ничего не выбрано</div>';
        totalSection.style.display = 'none';
    }
}

// === МОДАЛЬНОЕ УВЕДОМЛЕНИЕ ===
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();

    const modal = document.createElement('div');
    modal.id = 'notification';
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.2);
        display: none; justify-content: center; align-items: center; z-index: 9999;
    `;
    modal.innerHTML = `
        <div style="background:#fff;padding:30px 40px;border-radius:15px;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-align:center;">
            <p id="notification-text" style="font-size:18px;margin-bottom:15px;">...</p>
            <button id="closeNotification" style="background:white;border:1px solid #000;padding:8px 20px;cursor:pointer;font-size:15px;">Окей</button>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#closeNotification');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#000';
        closeBtn.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = '#fff';
        closeBtn.style.color = '#000';
    });
    closeBtn.addEventListener('click', () => (modal.style.display = 'none'));

    // Сброс выбора (только для lunch.html)
    const resetButton = document.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            Object.keys(selectedDishes).forEach(k => selectedDishes[k] = null);
            clearOrderFromLocalStorage();
            document.querySelectorAll('.dish-card').forEach(c => {
                c.classList.remove('selected');
                const btn = c.querySelector('.add-button');
                if (btn) btn.textContent = 'Добавить';
            });
            updateStickyPanel();
        });
    }
});

function showNotification(text) {
    const modal = document.getElementById('notification');
    const textEl = document.getElementById('notification-text');
    textEl.textContent = text;
    modal.style.display = 'flex';
}

function checkLunchComposition() {
    const { soup, main, salad, drink, dessert } = selectedDishes;

    if (!soup && !main && !salad && !drink && !dessert) {
        showNotification('Ничего не выбрано. Выберите блюда для заказа.');
        return false;
    }
    if ((soup || main || salad) && !drink) {
        showNotification('Выберите напиток.');
        return false;
    }
    if (soup && !main && !salad) {
        showNotification('Выберите главное блюдо/салат/стартер.');
        return false;
    }
    if (salad && !soup && !main) {
        showNotification('Выберите суп или главное блюдо.');
        return false;
    }
    if ((drink || dessert) && !main && !soup) {
        showNotification('Выберите главное блюдо.');
        return false;
    }
    return true;
}

function checkLunchCompositionSilent() {
    const { soup, main, salad, drink, dessert } = selectedDishes;

    if (!soup && !main && !salad && !drink && !dessert) {
        return false;
    }
    if ((soup || main || salad) && !drink) {
        return false;
    }
    if (soup && !main && !salad) {
        return false;
    }
    if (salad && !soup && !main) {
        return false;
    }
    if ((drink || dessert) && !main && !soup) {
        return false;
    }
    return true;
}