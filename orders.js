// Данные заказов (будут загружаться из localStorage)
let orders = [];

// Переменные для хранения текущего редактируемого/удаляемого заказа
let currentOrderId = null;

// Функция для загрузки заказов из localStorage
function loadOrdersFromStorage() {
    const savedOrders = localStorage.getItem('foodConstructOrders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    }
}

// Функция для сохранения заказов в localStorage
function saveOrdersToStorage() {
    localStorage.setItem('foodConstructOrders', JSON.stringify(orders));
}

// Функция для форматирования даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`;
}

// Функция для отображения заказов в таблице
function renderOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    У вас пока нет заказов. <a href="order.html">Оформите первый заказ</a>
                </td>
            </tr>
        `;
        return;
    }
    
    // Сортировка заказов по дате (сначала новые)
    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedOrders.forEach((order, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatDate(order.date)}</td>
            <td>${order.items.join(', ')}</td>
            <td>${order.cost}Р</td>
            <td>${order.deliveryTime || 'Как можно скорее (с 7:00 до 23:00)'}</td>
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
        `;
        tableBody.appendChild(row);
    });
    
    // Добавляем обработчики событий для кнопок действий
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', showOrderDetails);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', showEditOrderForm);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', showDeleteConfirmation);
    });
}

// Функция для отображения деталей заказа
function showOrderDetails(event) {
    const orderId = parseInt(event.currentTarget.getAttribute('data-order-id'));
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        const modalContent = document.getElementById('orderDetailsContent');
        modalContent.innerHTML = `
            <div class="order-details-section">
                <h4>Дата оформления</h4>
                <p>${formatDate(order.date)}</p>
            </div>
            
            <div class="order-details-section">
                <h4>Доставка</h4>
                <p><strong>Имя получателя:</strong> ${order.fullName}</p>
                <p><strong>Адрес:</strong> ${order.deliveryAddress}</p>
                <p><strong>Телефон:</strong> ${order.phone}</p>
                <p><strong>Email:</strong> ${order.email}</p>
            </div>
            
            ${order.comment ? `
            <div class="order-details-section">
                <h4>Комментарий</h4>
                <p>${order.comment}</p>
            </div>
            ` : ''}
            
            <div class="order-details-section">
                <h4>Состав заказа</h4>
                <ul class="order-items-list">
                    ${order.items.map(item => `<li class="order-item">${item}</li>`).join('')}
                </ul>
            </div>
            
            <div class="order-details-section">
                <h4>Стоимость: ${order.cost}Р</h4>
            </div>
        `;
        
        document.getElementById('orderDetailsModal').style.display = 'block';
    }
}

// Функция для отображения формы редактирования заказа
function showEditOrderForm(event) {
    const orderId = parseInt(event.currentTarget.getAttribute('data-order-id'));
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        currentOrderId = orderId;
        
        // Заполняем форму данными заказа
        document.getElementById('editFullName').value = order.fullName;
        document.getElementById('editEmail').value = order.email;
        document.getElementById('editPhone').value = order.phone;
        document.getElementById('editAddress').value = order.deliveryAddress;
        document.getElementById('editDeliveryType').value = order.deliveryType;
        document.getElementById('editComment').value = order.comment || '';
        
        // Настраиваем отображение поля времени доставки
        const timeContainer = document.getElementById('editDeliveryTimeContainer');
        if (order.deliveryType === 'time') {
            timeContainer.style.display = 'block';
            document.getElementById('editDeliveryTime').value = order.deliveryTime || '';
        } else {
            timeContainer.style.display = 'none';
        }
        
        document.getElementById('editOrderModal').style.display = 'block';
    }
}

// Функция для отображения подтверждения удаления
function showDeleteConfirmation(event) {
    const orderId = parseInt(event.currentTarget.getAttribute('data-order-id'));
    currentOrderId = orderId;
    document.getElementById('deleteOrderModal').style.display = 'block';
}

// Функция для сохранения изменений заказа
function saveOrderChanges() {
    const orderIndex = orders.findIndex(o => o.id === currentOrderId);
    
    if (orderIndex !== -1) {
        orders[orderIndex] = {
            ...orders[orderIndex],
            fullName: document.getElementById('editFullName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            deliveryAddress: document.getElementById('editAddress').value,
            deliveryType: document.getElementById('editDeliveryType').value,
            deliveryTime: document.getElementById('editDeliveryType').value === 'time' ? 
                         document.getElementById('editDeliveryTime').value : null,
            comment: document.getElementById('editComment').value
        };
        
        saveOrdersToStorage();
        renderOrders();
        showNotification('Заказ успешно изменён', 'success');
        closeEditModal();
    }
}

// Функция для удаления заказа
function deleteOrder() {
    orders = orders.filter(o => o.id !== currentOrderId);
    saveOrdersToStorage();
    renderOrders();
    showNotification('Заказ успешно удалён', 'success');
    closeDeleteModal();
}

// Функции для закрытия модальных окон
function closeDetailsModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

function closeEditModal() {
    document.getElementById('editOrderModal').style.display = 'none';
    currentOrderId = null;
}

function closeDeleteModal() {
    document.getElementById('deleteOrderModal').style.display = 'none';
    currentOrderId = null;
}

// Функция для показа уведомлений
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Обработчики событий для модальных окон
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация - загружаем заказы из localStorage
    loadOrdersFromStorage();
    renderOrders();
    
    // Обработчики закрытия модальных окон
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeDetailsModal();
            closeEditModal();
            closeDeleteModal();
        });
    });
    
    // Обработчики для кнопок действий
    document.getElementById('closeDetailsBtn').addEventListener('click', closeDetailsModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveOrderBtn').addEventListener('click', saveOrderChanges);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteOrder);
    
    // Обработка изменения типа доставки в форме редактирования
    document.getElementById('editDeliveryType').addEventListener('change', function() {
        const timeContainer = document.getElementById('editDeliveryTimeContainer');
        if (this.value === 'time') {
            timeContainer.style.display = 'block';
        } else {
            timeContainer.style.display = 'none';
        }
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeDetailsModal();
                closeEditModal();
                closeDeleteModal();
            }
        });
    });
});