// Глобальная переменная для хранения данных о блюдах
let dishesData = null;

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ДАННЫХ О БЛЮДАХ ИЗ API
async function ensureDishesLoaded() {
    if (dishesData) return dishesData;

    // ЗАПРОС К API ДЛЯ ПОЛУЧЕНИЯ СПИСКА ВСЕХ БЛЮД
    const response = await fetch('https://edu.std-900.ist.mospolytech.ru/labs/api/dishes');
    dishesData = await response.json();
    return dishesData;
}

// URL API ДЛЯ РАБОТЫ С ЗАКАЗАМИ И КЛЮЧ АВТОРИЗАЦИИ
const API_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api/orders';
const API_KEY = 'fdb746ba-4802-46af-9f21-10ccd05a1b63';

let currentOrderId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadOrders(); // ЗАГРУЗКА ЗАКАЗОВ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
});

function initializeEventListeners() {
    // Элементы модалок
    const viewModal = document.getElementById('orderDetailsModal');
    const editModal = document.getElementById('editOrderModal');
    const deleteModal = document.getElementById('deleteOrderModal');

    const closeButtons = document.querySelectorAll('.close-btn');
    const okButton = document.getElementById('closeDetailsBtn');
    const cancelButton = document.getElementById('cancelEditBtn');
    const deleteCancelButton = document.getElementById('cancelDeleteBtn');
    const saveButton = document.getElementById('saveOrderBtn');
    const deleteConfirmButton = document.getElementById('confirmDeleteBtn');

    // Обработчики закрытия модалок
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (viewModal) viewModal.style.display = 'none';
            if (editModal) editModal.style.display = 'none';
            if (deleteModal) deleteModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === viewModal) viewModal.style.display = 'none';
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === deleteModal) deleteModal.style.display = 'none';
    });

    if (okButton) okButton.addEventListener('click', () => {
        if (viewModal) viewModal.style.display = 'none';
    });

    if (cancelButton) cancelButton.addEventListener('click', () => {
        if (editModal) editModal.style.display = 'none'; // ЗДЕСЬ ДОЛЖНО ЗАКРЫВАТЬСЯ ОКНО РЕДАКТИРОВАНИЯ
    });

    if (deleteCancelButton) deleteCancelButton.addEventListener('click', () => {
        if (deleteModal) deleteModal.style.display = 'none';
    });

    if (saveButton) saveButton.addEventListener('click', (e) => {
        e.preventDefault();
        saveEditedOrder();
    });

    if (deleteConfirmButton) deleteConfirmButton.addEventListener('click', () => {
        deleteSelectedOrder();
    });

    // Обработчик изменения типа доставки
    const editDeliveryTypeSelect = document.getElementById('editDeliveryType');
    const editDeliveryTimeContainer = document.getElementById('editDeliveryTimeContainer');
    
    if (editDeliveryTypeSelect && editDeliveryTimeContainer) {
        editDeliveryTypeSelect.addEventListener('change', function() {
            if (this.value === 'time') {
                editDeliveryTimeContainer.style.display = 'block';
            } else {
                editDeliveryTimeContainer.style.display = 'none';
            }
        });
    }
}

// ОСНОВНАЯ ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ЗАКАЗОВ ИЗ API
async function loadOrders() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;
    
    ordersTableBody.innerHTML = '<tr><td colspan="6" class="loading">Загрузка заказов...</td></tr>';

    try {
        // GET ЗАПРОС К API ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ЗАКАЗОВ ПОЛЬЗОВАТЕЛЯ
        const response = await fetch(`${API_URL}?api_key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const orders = await response.json();

        // Сортируем по дате (новые — вверху)
        orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (orders.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        У вас пока нет заказов.
                    </td>
                </tr>
            `;
            return;
        }

        // ЗАГРУЗКА ДАННЫХ О БЛЮДАХ ИЗ API ДЛЯ ОТОБРАЖЕНИЯ НАЗВАНИЙ И ЦЕН
        const dishesResponse = await fetch('https://edu.std-900.ist.mospolytech.ru/labs/api/dishes');
        const allDishes = await dishesResponse.json();
        const dishMap = {};
        allDishes.forEach(dish => {
            dishMap[dish.id] = dish.name;
            dishMap[dish.id + '_price'] = dish.price;
        });

        let html = '';
        orders.forEach((order, index) => {
            const orderNumber = index + 1;
            const date = new Date(order.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // СОСТАВ ЗАКАЗА - ИСПОЛЬЗУЕМ ID БЛЮД ИЗ API ДЛЯ ПОЛУЧЕНИЯ НАЗВАНИЙ
            const items = [];
            if (order.soup_id && dishMap[order.soup_id]) items.push(dishMap[order.soup_id]);
            if (order.main_course_id && dishMap[order.main_course_id]) items.push(dishMap[order.main_course_id]);
            if (order.salad_id && dishMap[order.salad_id]) items.push(dishMap[order.salad_id]);
            if (order.drink_id && dishMap[order.drink_id]) items.push(dishMap[order.drink_id]);
            if (order.dessert_id && dishMap[order.dessert_id]) items.push(dishMap[order.dessert_id]);

            const composition = items.join(', ');

            // Время доставки
            let deliveryTime = 'Как можно скорее (с 07:00 до 23:00)';
            if (order.delivery_type === 'by_time' && order.delivery_time) {
                deliveryTime = order.delivery_time;
            }

            // СТОИМОСТЬ - РАССЧИТЫВАЕМ НА ОСНОВЕ ЦЕН ИЗ API
            let total = 0;
            [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id].forEach(id => {
                if (id && dishMap[id + '_price']) {
                    total += dishMap[id + '_price'];
                }
            });

            html += `
                <tr>
                    <td>${orderNumber}</td>
                    <td>${date}</td>
                    <td>${composition}</td>
                    <td>${total}₽</td>
                    <td>${deliveryTime}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-order-id="${order.id}" title="Подробнее">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" data-order-id="${order.id}" title="Редактировать">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="action-btn delete-btn" data-order-id="${order.id}" title="Удалить">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        ordersTableBody.innerHTML = html;

        // Добавляем обработчики событий для кнопок действий
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.getAttribute('data-order-id'));
                showOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.getAttribute('data-order-id'));
                showEditOrder(orderId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.getAttribute('data-order-id'));
                showDeleteOrder(orderId);
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: red;">
                    Ошибка загрузки данных. Попробуйте позже.
                </td>
            </tr>
        `;
    }
}

// ФУНКЦИЯ ДЛЯ ПОКАЗА ДЕТАЛЕЙ КОНКРЕТНОГО ЗАКАЗА ИЗ API
async function showOrderDetails(orderId) {
    try {
        // GET ЗАПРОС К API ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ КОНКРЕТНОГО ЗАКАЗА
        const orderRes = await fetch(`${API_URL}/${orderId}?api_key=${API_KEY}`);
        const order = await orderRes.json();

        // Гарантируем, что блюда загружены из API
        await ensureDishesLoaded();

        // Формируем состав заказа используя данные из API
        const items = [];
        if (order.soup_id) items.push({ label: 'Суп', id: order.soup_id });
        if (order.main_course_id) items.push({ label: 'Главное блюдо', id: order.main_course_id });
        if (order.salad_id) items.push({ label: 'Салат', id: order.salad_id });
        if (order.drink_id) items.push({ label: 'Напиток', id: order.drink_id });
        if (order.dessert_id) items.push({ label: 'Десерт', id: order.dessert_id });

        let compositionHtml = '';
        items.forEach(item => {
            const name = getDishNameById(item.id); // ПОЛУЧАЕМ НАЗВАНИЕ БЛЮДА ИЗ API
            const price = getDishPriceById(item.id); // ПОЛУЧАЕМ ЦЕНУ БЛЮДА ИЗ API
            if (name) {
                compositionHtml += `<div class="order-item"><strong>${item.label}:</strong> ${name} (${price}₽)</div>`;
            }
        });

        // Форматируем дату
        const date = new Date(order.created_at).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const deliveryTimeText = order.delivery_type === 'by_time' && order.delivery_time
            ? order.delivery_time
            : 'Как можно скорее (с 07:00 до 23:00)';

        const details = document.getElementById('orderDetailsContent');
        details.innerHTML = `
            <div class="order-details-section">
                <h4>Дата оформления</h4>
                <p>${date}</p>
            </div>
            <div class="order-details-section">
                <h4>Доставка</h4>
                <p><strong>Имя получателя:</strong> ${escapeHtml(order.full_name)}</p>
                <p><strong>Адрес:</strong> ${escapeHtml(order.delivery_address)}</p>
                <p><strong>Телефон:</strong> ${escapeHtml(order.phone)}</p>
                <p><strong>Email:</strong> ${escapeHtml(order.email)}</p>
                <p><strong>Время доставки:</strong> ${escapeHtml(deliveryTimeText)}</p>
            </div>
            ${order.comment ? `
            <div class="order-details-section">
                <h4>Комментарий</h4>
                <p>${escapeHtml(order.comment)}</p>
            </div>
            ` : ''}
            <div class="order-details-section">
                <h4>Состав заказа</h4>
                <div class="order-items-list">
                    ${compositionHtml || '<div>—</div>'}
                </div>
            </div>
            <div class="order-details-section">
                <h4>Стоимость: ${getTotalPrice(order)}₽</h4>
            </div>
        `;

        document.getElementById('orderDetailsModal').style.display = 'block';
    } catch (err) {
        console.error('Ошибка при отображении деталей заказа:', err);
        showNotification('Не удалось загрузить детали заказа.', 'error');
    }
}

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ДАННЫХ ЗАКАЗА ИЗ API ДЛЯ РЕДАКТИРОВАНИЯ
function showEditOrder(orderId) {
    currentOrderId = orderId;
    
    // GET ЗАПРОС К API ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ЗАКАЗА ДЛЯ РЕДАКТИРОВАНИЯ
    fetch(`${API_URL}/${orderId}?api_key=${API_KEY}`)
        .then(res => res.json())
        .then(order => {
            const editFullNameInput = document.getElementById('editFullName');
            const editDeliveryAddressInput = document.getElementById('editAddress');
            const editPhoneInput = document.getElementById('editPhone');
            const editEmailInput = document.getElementById('editEmail');
            const editCommentInput = document.getElementById('editComment');
            const editDeliveryTypeSelect = document.getElementById('editDeliveryType');
            const editDeliveryTimeInput = document.getElementById('editDeliveryTime');
            const editDeliveryTimeContainer = document.getElementById('editDeliveryTimeContainer');

            if (editFullNameInput) editFullNameInput.value = order.full_name || '';
            if (editDeliveryAddressInput) editDeliveryAddressInput.value = order.delivery_address || '';
            if (editPhoneInput) editPhoneInput.value = order.phone || '';
            if (editEmailInput) editEmailInput.value = order.email || '';
            if (editCommentInput) editCommentInput.value = order.comment || '';

            // Время доставки - используем данные из API
            if (editDeliveryTypeSelect) {
                if (order.delivery_type === 'now') {
                    editDeliveryTypeSelect.value = 'asap';
                    if (editDeliveryTimeContainer) editDeliveryTimeContainer.style.display = 'none';
                } else if (order.delivery_type === 'by_time') {
                    editDeliveryTypeSelect.value = 'time';
                    if (editDeliveryTimeContainer) editDeliveryTimeContainer.style.display = 'block';
                    if (editDeliveryTimeInput) editDeliveryTimeInput.value = order.delivery_time || '';
                }
            }

            document.getElementById('editOrderModal').style.display = 'block'; // ОТКРЫВАЕМ ОКНО РЕДАКТИРОВАНИЯ
        })
        .catch(err => {
            console.error('Ошибка при загрузке заказа для редактирования:', err);
            showNotification('Не удалось загрузить данные заказа для редактирования.', 'error');
        });
}

function showDeleteOrder(orderId) {
    currentOrderId = orderId;
    document.getElementById('deleteOrderModal').style.display = 'block';
}

// ФУНКЦИЯ ДЛЯ УДАЛЕНИЯ ЗАКАЗА ЧЕРЕЗ API
function deleteSelectedOrder() {
    // DELETE ЗАПРОС К API ДЛЯ УДАЛЕНИЯ ЗАКАЗА
    fetch(`${API_URL}/${currentOrderId}?api_key=${API_KEY}`, {
        method: 'DELETE'
    })
        .then(res => {
            if (res.ok) {
                showNotification('Заказ успешно удалён.', 'success');
                document.getElementById('deleteOrderModal').style.display = 'none'; // ЗАКРЫВАЕМ ОКНО УДАЛЕНИЯ
                loadOrders(); // ПЕРЕЗАГРУЖАЕМ СПИСОК ЗАКАЗОВ ИЗ API
            } else {
                return res.json().then(data => {
                    throw new Error(data.error || `Ошибка ${res.status}`);
                });
            }
        })
        .catch(err => {
            showNotification(`Ошибка при удалении заказа: ${err.message}`, 'error');
        });
}

// ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ИЗМЕНЕНИЙ ЗАКАЗА ЧЕРЕЗ API
function saveEditedOrder() {
    const editFullNameInput = document.getElementById('editFullName');
    const editDeliveryAddressInput = document.getElementById('editAddress');
    const editPhoneInput = document.getElementById('editPhone');
    const editEmailInput = document.getElementById('editEmail');
    const editCommentInput = document.getElementById('editComment');
    const editDeliveryTypeSelect = document.getElementById('editDeliveryType');
    const editDeliveryTimeInput = document.getElementById('editDeliveryTime');

    const data = {
        full_name: editFullNameInput ? editFullNameInput.value.trim() : '',
        email: editEmailInput ? editEmailInput.value.trim() : '',
        phone: editPhoneInput ? editPhoneInput.value.trim() : '',
        delivery_address: editDeliveryAddressInput ? editDeliveryAddressInput.value.trim() : '',
        delivery_type: editDeliveryTypeSelect && editDeliveryTypeSelect.value === 'time' ? 'by_time' : 'now',
        delivery_time: editDeliveryTypeSelect && editDeliveryTypeSelect.value === 'time' && editDeliveryTimeInput ? editDeliveryTimeInput.value : null,
        comment: editCommentInput ? editCommentInput.value.trim() : ''
    };

    // Валидация
    if (!data.full_name || !data.email || !data.phone || !data.delivery_address) {
        showNotification('Заполните все обязательные поля.', 'error');
        return;
    }

    if (data.delivery_type === 'by_time' && !data.delivery_time) {
        showNotification('Укажите время доставки.', 'error');
        return;
    }

    // PUT ЗАПРОС К API ДЛЯ ОБНОВЛЕНИЯ ДАННЫХ ЗАКАЗА
    fetch(`${API_URL}/${currentOrderId}?api_key=${API_KEY}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(res => {
            if (res.ok) {
                showNotification('Заказ успешно изменён.', 'success');
                document.getElementById('editOrderModal').style.display = 'none'; // ЗДЕСЬ ЗАКРЫВАЕТСЯ ОКНО РЕДАКТИРОВАНИЯ ПОСЛЕ УСПЕШНОГО СОХРАНЕНИЯ
                loadOrders(); // ПЕРЕЗАГРУЖАЕМ СПИСОК ЗАКАЗОВ ИЗ API
            } else {
                return res.json().then(data => {
                    throw new Error(data.error || `Ошибка ${res.status}`);
                });
            }
        })
        .catch(err => {
            showNotification(`Ошибка при сохранении изменений: ${err.message}`, 'error');
        });
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ИЗ API

// ПОЛУЧЕНИЕ НАЗВАНИЯ БЛЮДА ПО ID ИЗ ДАННЫХ API
function getDishNameById(id) {
    if (!dishesData) return '';
    const dish = dishesData.find(d => d.id === id);
    return dish ? dish.name : '';
}

// ПОЛУЧЕНИЕ ЦЕНЫ БЛЮДА ПО ID ИЗ ДАННЫХ API
function getDishPriceById(id) {
    if (!dishesData) return 0;
    const dish = dishesData.find(d => d.id === id);
    return dish ? dish.price : 0;
}

// РАСЧЕТ ОБЩЕЙ СТОИМОСТИ ЗАКАЗА НА ОСНОВЕ ЦЕН ИЗ API
function getTotalPrice(order) {
    if (!dishesData) return 0;
    let total = 0;
    [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id]
        .filter(id => id)
        .forEach(id => {
            const dish = dishesData.find(d => d.id === id);
            if (dish) total += dish.price;
        });
    return total;
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}