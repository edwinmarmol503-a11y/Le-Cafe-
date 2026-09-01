/*
 * Versión del carrito para el sitio ESTÁTICO (docs/, GitHub Pages).
 * En vez de guardar el carrito en la sesión de PHP (api/carrito.php),
 * usa localStorage del navegador. Todo lo demás (menú, tabs, animaciones,
 * efecto magnético) es igual al sitio dinámico.
 */
document.addEventListener('DOMContentLoaded', () => {

    /* ===== Preloader ===== */
    const preloader = document.getElementById('preloader');
    window.addEventListener('load', () => setTimeout(() => preloader.classList.add('hidden'), 300));

    /* ===== Reveal on scroll ===== */
    const revealEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));

    /* ===== Mobile menu ===== */
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    const mobileOverlay = document.getElementById('mobileNavOverlay');
    function openMenu() {
        mainNav.classList.add('open');
        mobileOverlay.classList.add('show');
        document.body.classList.add('nav-open');
        menuToggle.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
        mainNav.classList.remove('open');
        mobileOverlay.classList.remove('show');
        document.body.classList.remove('nav-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.contains('open') ? closeMenu() : openMenu();
        });
        mobileOverlay.addEventListener('click', closeMenu);
        mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });
    }

    /* ===== Tabs (categoria-*.html) — delegado, sirve para tabs dibujados por JS ===== */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById(btn.dataset.tab);
        if (panel) panel.classList.add('active');
    });

    /* ===== FAB de contacto (desplegable) ===== */
    const fab = document.getElementById('fab');
    const fabToggle = document.getElementById('fabToggle');
    if (fab && fabToggle) {
        const closeFab = () => {
            fab.classList.remove('open');
            fabToggle.setAttribute('aria-expanded', 'false');
        };
        fabToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = fab.classList.toggle('open');
            fabToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        document.addEventListener('click', (e) => {
            if (fab.classList.contains('open') && !fab.contains(e.target)) closeFab();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeFab();
        });
        fab.querySelectorAll('.fab-item').forEach(a => a.addEventListener('click', closeFab));
    }

    /* ===== Carrito (localStorage) ===== */
    const CART_KEY = 'lecafe_carrito';
    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveCart(items) {
        try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    }

    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartToggle = document.getElementById('cartToggle');
    const cartClose = document.getElementById('cartClose');
    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');
    const cartBadge = document.getElementById('cartBadge');
    const btnWhatsappOrder = document.getElementById('btnWhatsappOrder');
    const btnClearCart = document.getElementById('btnClearCart');

    function openCart() { cartDrawer.classList.add('open'); cartOverlay.classList.add('show'); }
    function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('show'); }

    cartToggle && cartToggle.addEventListener('click', () => { openCart(); });
    cartClose && cartClose.addEventListener('click', closeCart);
    cartOverlay && cartOverlay.addEventListener('click', closeCart);

    let currentItems = [];

    function renderCart() {
        currentItems = getCart();
        const count = currentItems.reduce((a, i) => a + i.cantidad, 0);
        cartBadge.textContent = count;
        if (currentItems.length === 0) {
            cartBody.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
            cartFooter.style.display = 'none';
            return;
        }
        cartFooter.style.display = 'block';
        const total = currentItems.reduce((a, i) => a + i.precio * i.cantidad, 0);
        cartTotal.textContent = '$' + total.toFixed(2);
        cartBody.innerHTML = currentItems.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.imagen}" alt="${item.nombre}">
                <div class="cart-item-info">
                    <h5>${item.nombre}</h5>
                    <div class="cart-item-price">$${item.precio.toFixed(2)} c/u</div>
                    <div class="cart-qty">
                        <button class="qty-minus">−</button>
                        <span>${item.cantidad}</span>
                        <button class="qty-plus">+</button>
                        <button class="cart-item-remove">Quitar</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function addItem(id, nombre, precio, imagen) {
        const items = getCart();
        const existing = items.find(i => i.id === id);
        if (existing) existing.cantidad += 1;
        else items.push({ id, nombre, precio, imagen, cantidad: 1 });
        saveCart(items);
        renderCart();
    }

    function updateQty(id, cantidad) {
        let items = getCart();
        if (cantidad <= 0) {
            items = items.filter(i => i.id !== id);
        } else {
            const it = items.find(i => i.id === id);
            if (it) it.cantidad = cantidad;
        }
        saveCart(items);
        renderCart();
    }

    function removeItem(id) {
        const items = getCart().filter(i => i.id !== id);
        saveCart(items);
        renderCart();
    }

    // Delegación en document: funciona para cualquier .btn-agregar (carrusel incluido),
    // sin depender de que exista al cargar ni de otros listeners.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-agregar');
        if (!btn) return;
        const { id, nombre, precio, imagen } = btn.dataset;
        if (!id) return;
        addItem(id, nombre, parseFloat(precio), imagen);
        btn.textContent = 'Agregado ✓';
        btn.classList.add('added');
        openCart();
        clearTimeout(btn._resetT);
        btn._resetT = setTimeout(() => { btn.textContent = 'Agregar'; btn.classList.remove('added'); }, 1400);
    });

    cartBody && cartBody.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cart-item');
        if (!itemEl) return;
        const id = itemEl.dataset.id;
        const item = currentItems.find(i => i.id == id);
        if (!item) return;

        if (e.target.classList.contains('qty-plus')) {
            updateQty(id, item.cantidad + 1);
        } else if (e.target.classList.contains('qty-minus')) {
            updateQty(id, item.cantidad - 1);
        } else if (e.target.classList.contains('cart-item-remove')) {
            itemEl.classList.add('cart-item-removing');
            setTimeout(() => removeItem(id), 480);
        }
    });

    btnClearCart && btnClearCart.addEventListener('click', () => {
        if (confirm('¿Vaciar todo el carrito?')) { saveCart([]); renderCart(); }
    });

    btnWhatsappOrder && btnWhatsappOrder.addEventListener('click', () => {
        if (currentItems.length === 0) return;
        let msg = 'Hola, quiero hacer el siguiente pedido en Le Café:\n\n';
        let total = 0;
        currentItems.forEach(item => {
            const sub = item.precio * item.cantidad;
            msg += `• ${item.cantidad}x ${item.nombre} — $${sub.toFixed(2)}\n`;
            total += sub;
        });
        msg += `\nTotal: $${total.toFixed(2)}\n\nPor favor indíquenme la sucursal más cercana para retirar o si tienen entrega a domicilio. ¡Gracias!`;
        window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`, '_blank');
        // Vacía el carrito y lleva a la página de agradecimiento
        saveCart([]);
        setTimeout(() => { window.location.href = 'gracias.html'; }, 500);
    });

    renderCart();

    /* ===== Header shadow on scroll ===== */
    const header = document.getElementById('siteHeader');
    let headerScrolled = false;
    window.addEventListener('scroll', () => {
        const s = window.scrollY > 12;
        if (s !== headerScrolled) { headerScrolled = s; header.classList.toggle('is-scrolled', s); }
    }, { passive: true });

    /* ===== Efecto magnético en elementos tipo "caja" ===== */
    function magnetize(el, strength, lift) {
        lift = lift || 0;
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) * strength;
            const y = (e.clientY - rect.top - rect.height / 2) * strength - lift;
            el.style.transition = 'transform .1s linear';
            el.style.transform = `translate(${x}px, ${y}px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transition = 'transform .5s cubic-bezier(.2,1,.3,1)';
            el.style.transform = 'translate(0, 0)';
        });
    }
    document.querySelectorAll(
        '.btn, .btn-agregar, .btn-whatsapp-order, .tab-btn, .fab-toggle, .logo-icon, .cart-qty button, .cart-close, .menu-toggle, .cart-toggle'
    ).forEach(el => magnetize(el, 0.35));
    document.querySelectorAll('.categoria-card, .sucursal-card').forEach(el => magnetize(el, 0.06, 6));
});
