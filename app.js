// DHA Store Counter - Main Application

// ============ Data Storage ============
const Storage = {
    PRODUCTS_KEY: 'dhastore_products',
    SALES_KEY: 'dhastore_sales',
    UNDO_KEY: 'dhastore_undo',

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        // Also save to cookie as backup
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${key}=${encodeURIComponent(JSON.stringify(data))};expires=${expires};path=/`;
    },

    load(key) {
        // Try localStorage first
        let data = localStorage.getItem(key);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {}
        }
        // Fallback to cookie
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith(key + '='));
        if (cookie) {
            try {
                return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
            } catch (e) {}
        }
        return null;
    },

    getProducts() {
        return this.load(this.PRODUCTS_KEY) || [];
    },

    saveProducts(products) {
        this.save(this.PRODUCTS_KEY, products);
    },

    getSales() {
        return this.load(this.SALES_KEY) || [];
    },

    saveSales(sales) {
        this.save(this.SALES_KEY, sales);
    },

    getUndoStack() {
        return this.load(this.UNDO_KEY) || [];
    },

    saveUndoStack(stack) {
        this.save(this.UNDO_KEY, stack);
    }
};

// ============ State ============
let products = Storage.getProducts();
let sales = Storage.getSales();
let undoStack = Storage.getUndoStack();
let currentPeriod = 'daily';

// ============ Default Products ============
const DEFAULT_PRODUCTS = [
    { id: '1', name: 'Coffee', cost: 1.50, price: 4.00, color: '#8B4513', image: null },
    { id: '2', name: 'Tea', cost: 0.80, price: 3.00, color: '#228B22', image: null },
    { id: '3', name: 'Sandwich', cost: 3.00, price: 7.50, color: '#DAA520', image: null },
    { id: '4', name: 'Cake', cost: 2.50, price: 5.50, color: '#FF69B4', image: null },
    { id: '5', name: 'Juice', cost: 1.00, price: 3.50, color: '#FF6347', image: null },
    { id: '6', name: 'Cookie', cost: 0.50, price: 2.00, color: '#D2691E', image: null }
];

if (products.length === 0) {
    products = DEFAULT_PRODUCTS;
    Storage.saveProducts(products);
}

// ============ Utility Functions ============
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

function getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getStartOfWeek(date = new Date()) {
    const d = getStartOfDay(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function getStartOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
}

// ============ UI Rendering ============
function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('button');
        card.className = 'product-card';
        card.style.backgroundColor = product.color;
        card.onclick = () => recordSale(product.id);

        const img = document.createElement('div');
        img.className = 'product-image';
        if (product.image) {
            img.style.backgroundImage = `url(${product.image})`;
        } else {
            img.textContent = product.name.charAt(0).toUpperCase();
        }

        const name = document.createElement('span');
        name.className = 'product-name';
        name.textContent = product.name;

        const price = document.createElement('span');
        price.className = 'product-price';
        price.textContent = formatCurrency(product.price);

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(price);
        grid.appendChild(card);
    });
}

function renderStats() {
    const now = new Date();
    let startDate;

    switch (currentPeriod) {
        case 'daily':
            startDate = getStartOfDay(now);
            break;
        case 'weekly':
            startDate = getStartOfWeek(now);
            break;
        case 'monthly':
            startDate = getStartOfMonth(now);
            break;
    }

    const periodSales = sales.filter(s => new Date(s.timestamp) >= startDate);

    let totalItems = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    periodSales.forEach(sale => {
        totalItems += sale.quantity;
        totalRevenue += sale.price * sale.quantity;
        totalCost += sale.cost * sale.quantity;
    });

    const profit = totalRevenue - totalCost;

    document.getElementById('stat-items').textContent = totalItems;
    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('stat-cost').textContent = formatCurrency(totalCost);
    document.getElementById('stat-profit').textContent = formatCurrency(profit);
    document.getElementById('stat-profit').parentElement.className =
        'stat-card profit ' + (profit >= 0 ? 'positive' : 'negative');

    renderSalesList(periodSales.slice(-20).reverse());
}

function renderSalesList(salesList) {
    const list = document.getElementById('sales-list');
    list.innerHTML = '';

    if (salesList.length === 0) {
        list.innerHTML = '<p class="no-sales">No sales recorded</p>';
        return;
    }

    salesList.forEach(sale => {
        const item = document.createElement('div');
        item.className = 'sale-item';

        const time = new Date(sale.timestamp);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString();

        item.innerHTML = `
            <span class="sale-product">${sale.productName}</span>
            <span class="sale-time">${dateStr} ${timeStr}</span>
            <span class="sale-amount">${formatCurrency(sale.price)}</span>
        `;
        list.appendChild(item);
    });
}

function renderProductList() {
    const list = document.getElementById('product-list');
    list.innerHTML = '';

    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';

        item.innerHTML = `
            <div class="product-info">
                <span class="product-color" style="background:${product.color}"></span>
                <span>${product.name}</span>
                <span class="product-prices">Cost: ${formatCurrency(product.cost)} | Price: ${formatCurrency(product.price)}</span>
            </div>
            <div class="product-actions">
                <button class="edit-btn" data-id="${product.id}">Edit</button>
                <button class="delete-btn" data-id="${product.id}">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });

    // Attach event listeners
    list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => openEditModal(btn.dataset.id);
    });
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteProduct(btn.dataset.id);
    });
}

function updateUndoButton() {
    const btn = document.getElementById('undo-btn');
    btn.disabled = undoStack.length === 0;
}

// ============ Sales Logic ============
function recordSale(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const sale = {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        cost: product.cost,
        price: product.price,
        quantity: 1,
        timestamp: new Date().toISOString()
    };

    sales.push(sale);
    Storage.saveSales(sales);

    // Add to undo stack (keep last 50)
    undoStack.push(sale.id);
    if (undoStack.length > 50) undoStack.shift();
    Storage.saveUndoStack(undoStack);

    updateUndoButton();
    renderStats();
    showToast(`Sold: ${product.name} - ${formatCurrency(product.price)}`);
}

function undoLastSale() {
    if (undoStack.length === 0) return;

    const saleId = undoStack.pop();
    Storage.saveUndoStack(undoStack);

    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex !== -1) {
        const sale = sales[saleIndex];
        sales.splice(saleIndex, 1);
        Storage.saveSales(sales);
        showToast(`Undone: ${sale.productName}`);
    }

    updateUndoButton();
    renderStats();
}

// ============ Product Management ============
function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-cost').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-color').value = '#3498db';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('product-image').value = '';
    document.getElementById('modal').classList.remove('hidden');
}

function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-cost').value = product.cost;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-color').value = product.color;

    const preview = document.getElementById('image-preview');
    if (product.image) {
        preview.innerHTML = `<img src="${product.image}" alt="Preview">`;
    } else {
        preview.innerHTML = '';
    }

    document.getElementById('product-image').value = '';
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const cost = parseFloat(document.getElementById('product-cost').value);
    const price = parseFloat(document.getElementById('product-price').value);
    const color = document.getElementById('product-color').value;
    const imageFile = document.getElementById('product-image').files[0];

    const saveProductData = (imageData) => {
        if (id) {
            // Edit existing
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index] = {
                    ...products[index],
                    name,
                    cost,
                    price,
                    color,
                    image: imageData || products[index].image
                };
            }
        } else {
            // Add new
            products.push({
                id: generateId(),
                name,
                cost,
                price,
                color,
                image: imageData
            });
        }

        Storage.saveProducts(products);
        closeModal();
        renderProducts();
        renderProductList();
        showToast(id ? 'Product updated' : 'Product added');
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => saveProductData(e.target.result);
        reader.readAsDataURL(imageFile);
    } else {
        saveProductData(null);
    }
}

function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;

    products = products.filter(p => p.id !== productId);
    Storage.saveProducts(products);
    renderProducts();
    renderProductList();
    showToast('Product deleted');
}

// ============ Data Export/Import ============
function exportData() {
    const data = {
        products,
        sales,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhastore-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products) {
                products = data.products;
                Storage.saveProducts(products);
            }
            if (data.sales) {
                sales = data.sales;
                Storage.saveSales(sales);
            }
            undoStack = [];
            Storage.saveUndoStack(undoStack);

            renderProducts();
            renderStats();
            renderProductList();
            updateUndoButton();
            showToast('Data imported successfully');
        } catch (err) {
            showToast('Invalid file format');
        }
    };
    reader.readAsText(file);
}

function clearAllSales() {
    if (!confirm('Clear ALL sales data? This cannot be undone.')) return;

    sales = [];
    undoStack = [];
    Storage.saveSales(sales);
    Storage.saveUndoStack(undoStack);
    renderStats();
    updateUndoButton();
    showToast('All sales cleared');
}

// ============ Tab Navigation ============
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'stats') renderStats();
    if (tabName === 'settings') renderProductList();
}

function switchPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.period-btn[data-period="${period}"]`).classList.add('active');
    renderStats();
}

// ============ Event Listeners ============
document.addEventListener('DOMContentLoaded', () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    }

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => switchTab(tab.dataset.tab);
    });

    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.onclick = () => switchPeriod(btn.dataset.period);
    });

    // Undo button
    document.getElementById('undo-btn').onclick = undoLastSale;

    // Product modal
    document.getElementById('add-product-btn').onclick = openAddModal;
    document.getElementById('cancel-btn').onclick = closeModal;
    document.getElementById('product-form').onsubmit = saveProduct;

    // Image preview
    document.getElementById('product-image').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('image-preview').innerHTML =
                    `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    };

    // Close modal on backdrop click
    document.getElementById('modal').onclick = (e) => {
        if (e.target.id === 'modal') closeModal();
    };

    // Data management
    document.getElementById('export-btn').onclick = exportData;
    document.getElementById('import-btn').onclick = () =>
        document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = (e) => {
        if (e.target.files[0]) importData(e.target.files[0]);
    };
    document.getElementById('clear-sales-btn').onclick = clearAllSales;

    // Initial render
    renderProducts();
    updateUndoButton();
});
