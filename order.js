let currentOrder = {};
let dishesData = [];

// Загрузка данных блюд
async function loadDishesForOrder() {
    try {
        const response = await fetch('https://edu.std-900.ist.mospolytech.ru/labs/api/dishes?key=fdb746ba-4802-46af-9f21-10ccd05a1b63');
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const dishes = await response.json();
        dishesData = dishes;
        loadAndDisplayOrder();
    } catch (error) {
        console.error('Не удалось загрузить блюда:', error);
        showError('Ошибка загрузки меню. Попробуйте позже.');
    }
}

// Загрузка и отображение заказа
function loadAndDisplayOrder() {
    const savedOrder = localStorage.getItem('foodConstructOrder');
    
    if (!savedOrder) {
        showEmptyOrderMessage();
        return;
    }

    const orderKeywords = JSON.parse(savedOrder);
    currentOrder = {};

    for (const [category, keyword] of Object.entries(orderKeywords)) {
        const dish = dishesData.find(d => d.keyword === keyword);
        if (dish) {
            let normalizedCategory = dish.category;
            if (dish.category === 'main-course') normalizedCategory = 'main';
            if (dish.category === 'first-course') normalizedCategory = 'soup';
            
            currentOrder[normalizedCategory] = dish; // ИСПРАВЛЕНА ОПЕЧАТКА
        }
    }

    displayOrderItems();
    updateFormSelection();
    checkComboAndShowMessage();
}

// Отображение выбранных блюд
function displayOrderItems() {
    const container = document.getElementById('order-items-container');
    
    if (Object.keys(currentOrder).length === 0) {
        showEmptyOrderMessage();
        return;
    }

    let html = '<div class="order-dishes-grid">';
    
    for (const [category, dish] of Object.entries(currentOrder)) {
        if (dish) {
            html += `
                <div class="order-dish-card" data-category="${category}" data-keyword="${dish.keyword}">
                    <img src="${dish.image}" alt="${dish.name}" class="dish-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    <div class="dish-price">${dish.price} ₽</div>
                    <div class="dish-name">${dish.name}</div>
                    <div class="dish-weight">${dish.count}</div>
                    <button class="remove-button" onclick="removeFromOrder('${category}')">Удалить</button>
                </div>
            `;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Удаление блюда из заказа
function removeFromOrder(category) {
    delete currentOrder[category];
    
    const orderKeywords = {};
    for (const [cat, dish] of Object.entries(currentOrder)) {
        if (dish) {
            orderKeywords[cat] = dish.keyword;
        }
    }
    
    if (Object.keys(orderKeywords).length === 0) {
        localStorage.removeItem('foodConstructOrder');
        showEmptyOrderMessage();
    } else {
        localStorage.setItem('foodConstructOrder', JSON.stringify(orderKeywords));
        displayOrderItems();
    }
    
    updateFormSelection();
    checkComboAndShowMessage();
}

// АВТОПОДСТАНОВКА В ФОРМУ
function updateFormSelection() {
    const mapping = {
        soup: '#soup',
        main: '#main-dish',
        salad: '#salad',
        drink: '#drink',
        dessert: '#dessert'
    };
    
    for (const [key, selector] of Object.entries(mapping)) {
        const dish = currentOrder[key];
        const select = document.querySelector(selector);
        if (!select || !dish) continue;

        let found = false;
        for (const opt of select.options) {
            if (opt.textContent.trim() === dish.name.trim()) {
                select.value = opt.value;
                found = true;
                break;
            }
        }
        if (!found) {
            const newOption = new Option(dish.name, dish.keyword, true, true);
            select.add(newOption);
        }

        select.style.outline = '2px solid #f4b400';
        setTimeout(() => (select.style.outline = 'none'), 800);
    }
}

// Сообщение при пустом заказе
function showEmptyOrderMessage() {
    const container = document.getElementById('order-items-container');
    container.innerHTML = `
        <div class="empty-order-message">
            <p>Ничего не выбрано. Чтобы добавить блюда в заказ, перейдите на страницу 
            <a href="lunch.html">Собрать ланч</a>.</p>
        </div>
    `;
    
    showComboMessage();
}

// Проверка комбо и показ сообщения
function checkComboAndShowMessage() {
    const isValidCombo = validateOrderComposition();
    
    if (!isValidCombo) {
        showComboMessage();
    } else {
        hideComboMessage();
    }
}

// Показ сообщения о неполном комбо
function showComboMessage() {
    let message = '';
    const { soup, main, salad, drink, dessert } = currentOrder;
    
    if (Object.keys(currentOrder).length === 0) {
        message = 'Ничего не выбрано. Чтобы добавить блюда в заказ, перейдите на страницу <a href="lunch.html">Собрать ланч</a>.';
    } else if (!drink) {
        message = 'Для оформления заказа необходимо выбрать напиток. Перейдите на страницу <a href="lunch.html">Собрать ланч</a> чтобы добавить напиток.';
    } else if (soup && !main && !salad) {
        message = 'К супу необходимо добавить главное блюдо или салат. Перейдите на страницу <a href="lunch.html">Собрать ланч</a> чтобы выбрать дополнительные блюда.';
    } else if (salad && !soup && !main) {
        message = 'К салату необходимо добавить суп или главное блюдо. Перейдите на страницу <a href="lunch.html">Собрать ланч</a> чтобы выбрать дополнительные блюда.';
    } else if ((drink || dessert) && !main && !soup) {
        message = 'К напитку или десерту необходимо добавить главное блюдо. Перейдите на страницу <a href="lunch.html">Собрать ланч</a> чтобы выбрать главное блюдо.';
    } else {
        message = 'Состав заказа не соответствует доступным комбо. Перейдите на страницу <a href="lunch.html">Собрать ланч</a> чтобы изменить выбор блюд.';
    }
    
    let messageElement = document.getElementById('combo-message');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'combo-message';
        messageElement.className = 'combo-message';
        
        const orderComposition = document.querySelector('.order-composition');
        if (orderComposition) {
            orderComposition.appendChild(messageElement);
        }
    }
    
    messageElement.innerHTML = message;
    messageElement.style.display = 'block';
}

// Скрытие сообщения о комбо
function hideComboMessage() {
    const messageElement = document.getElementById('combo-message');
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

// Проверка состава заказа
function validateOrderComposition() {
    const { soup, main, salad, drink, dessert } = currentOrder;

    if (!drink) return false;
    
    const combo1 = soup && main && salad && drink;
    const combo2 = soup && main && drink;
    const combo3 = soup && salad && drink;
    const combo4 = main && salad && drink;
    const combo5 = main && drink;

    return combo1 || combo2 || combo3 || combo4 || combo5;
}

// Обработка отправки формы через FETCH
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Предотвращаем стандартную отправку
    
    // Проверяем состав заказа
    if (!validateOrderComposition()) {
        showError('Состав заказа не соответствует доступным комбо. Перейдите на страницу "Собрать ланч" чтобы изменить выбор блюд.');
        return;
    }

    try {
        const submitButton = this.querySelector('.submit-btn');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Отправка...';
        submitButton.disabled = true;

        // Собираем данные формы
        const formData = new FormData(this);
        const formDataObject = {};
        for (let [key, value] of formData.entries()) {
            formDataObject[key] = value;
        }

        // Добавляем информацию о блюдах
        const dishesInfo = {};
        for (const [category, dish] of Object.entries(currentOrder)) {
            if (dish) {
                dishesInfo[category] = {
                    name: dish.name,
                    price: dish.price,
                    id: dish.id
                };
            }
        }
        formDataObject.dishes = dishesInfo;

        // СОХРАНЕНИЕ ЗАКАЗА В ИСТОРИЮ
        const orderItems = Object.values(currentOrder).filter(dish => dish).map(dish => dish.name);
        const orderCost = Object.values(currentOrder).reduce((sum, dish) => sum + (dish ? dish.price : 0), 0);

        const orderData = {
            id: Date.now(),
            date: new Date().toISOString(),
            items: orderItems,
            cost: orderCost,
            deliveryTime: formDataObject['delivery-option'] === 'by-time' ? formDataObject['exact-time'] : null,
            fullName: formDataObject.name,
            email: formDataObject.email,
            phone: formDataObject.phone,
            deliveryAddress: formDataObject.address,
            deliveryType: formDataObject['delivery-option'],
            comment: formDataObject.comment || ''
        };

        // Сохраняем в историю заказов
        const savedOrders = JSON.parse(localStorage.getItem('foodConstructOrders') || '[]');
        savedOrders.push(orderData);
        localStorage.setItem('foodConstructOrders', JSON.stringify(savedOrders));

        console.log('Отправляемые данные:', formDataObject);

        // Создаем временную форму для отправки в новом окне
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = 'https://httpbin.org/post';
        tempForm.target = '_blank'; // Открыть в новом окне
        tempForm.style.display = 'none';

        // Добавляем все данные формы
        for (const [key, value] of Object.entries(formDataObject)) {
            if (typeof value === 'object') {
                // Для объектов сериализуем в JSON
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = JSON.stringify(value);
                tempForm.appendChild(input);
            } else {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                tempForm.appendChild(input);
            }
        }

        // Добавляем форму в документ и отправляем
        document.body.appendChild(tempForm);
        tempForm.submit();

        // Убираем форму после отправки
        setTimeout(() => {
            document.body.removeChild(tempForm);
        }, 1000);

        // Показываем сообщение об успехе
        showSuccess('Заказ отправлен! Открывается страница с данными запроса...');
        localStorage.removeItem('foodConstructOrder');
        
        // Перенаправляем на главную через 3 секунды
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showError('Ошибка при отправке заказа: ' + error.message);
        
        // Восстанавливаем кнопку
        const submitButton = this.querySelector('.submit-btn');
        submitButton.textContent = 'Отправить заказ';
        submitButton.disabled = false;
    }
});

// Настройка формы
function setupForm() {
    const form = document.querySelector('#orderForm');
    if (form) {
        const selects = form.querySelectorAll('select');
        selects.forEach(sel => sel.setAttribute('disabled', true));

        // Обработка времени доставки
        const deliveryTimeRadio = document.querySelectorAll('input[name="delivery-option"]');
        const deliveryTimeInput = document.getElementById('exact-time');
        const deliveryTimeGroup = document.getElementById('delivery-time-group');
        
        deliveryTimeRadio.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'by-time') {
                    deliveryTimeGroup.style.display = 'block';
                    deliveryTimeInput.required = true;
                } else {
                    deliveryTimeGroup.style.display = 'none';
                    deliveryTimeInput.required = false;
                    deliveryTimeInput.value = '';
                }
            });
        });

        // Сброс выбора
        form.addEventListener('reset', () => {
            Object.keys(currentOrder).forEach(k => currentOrder[k] = null);
            localStorage.removeItem('foodConstructOrder');
            document.querySelectorAll('.checkout-form select').forEach(sel => {
                sel.selectedIndex = 0;
            });
            displayOrderItems();
            checkComboAndShowMessage();
        });
    }
}

// Вспомогательные функции для уведомлений
function showError(message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <h3 style="color: #e74c3c; margin-bottom: 15px;">Ошибка</h3>
            <p style="margin-bottom: 20px; line-height: 1.5;">${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #e74c3c;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            ">Понятно</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showSuccess(message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <h3 style="color: #27ae60; margin-bottom: 15px;">Успех!</h3>
            <p style="margin-bottom: 20px; line-height: 1.5;">${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #27ae60;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            ">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadDishesForOrder();
    setupForm();
});