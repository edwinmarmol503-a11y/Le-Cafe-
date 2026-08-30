/*
 * anim.js — Capa de animación de Le Café ("máximo espectáculo", sin librerías).
 * Se carga en el sitio estático (docs/) y en el dinámico (PHP).
 *
 * Reglas:
 *  - Contenido visible por defecto: si el script falla, la página se ve igual.
 *  - Solo transform / opacity / filter en regiones acotadas.
 *  - Todo tiene camino para prefers-reduced-motion.
 *  - Los bucles (vapor) se detienen fuera de pantalla / en pestaña oculta.
 */
(function () {
    'use strict';

    var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = REDUCED.matches;
    try { REDUCED.addEventListener('change', function (e) { reduce = e.matches; }); } catch (e) {}

    var EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

    function onReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    /* ============================================================
     * 1. Revelado al hacer scroll — con dirección y stagger
     * ============================================================ */
    function initReveal() {
        var els = Array.prototype.slice.call(document.querySelectorAll('.reveal, [data-reveal]'));
        if (!els.length) return;

        if (reduce || !('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('in-view'); });
            return;
        }

        // Agrupar por contenedor para escalonar hermanos
        els.forEach(function (el) {
            var sibs = el.parentElement
                ? Array.prototype.filter.call(el.parentElement.children, function (c) {
                    return c.classList.contains('reveal') || c.hasAttribute('data-reveal');
                })
                : [el];
            var idx = sibs.indexOf(el);
            if (idx > 0 && !el.style.transitionDelay) {
                el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
            }
        });

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in-view');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        els.forEach(function (el) { io.observe(el); });
    }

    /* ============================================================
     * 2. Contadores numéricos (data-countup)
     * ============================================================ */
    function runCountup(el) {
        var raw = el.getAttribute('data-countup');
        var target = parseFloat(raw);
        if (isNaN(target)) return;
        var decimals = (raw.split('.')[1] || '').length;
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';

        if (reduce) {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
            return;
        }

        var dur = 1400, start = null;
        function frame(now) {
            if (start === null) start = now;
            var p = Math.min((now - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
            el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(frame);
            else el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
        requestAnimationFrame(frame);
    }

    function initCountup() {
        var nums = document.querySelectorAll('[data-countup]');
        if (!nums.length) return;
        if (!('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(nums, runCountup);
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                runCountup(entry.target);
                io.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        Array.prototype.forEach.call(nums, function (n) { io.observe(n); });
    }

    /* ============================================================
     * 3. Hero — revelado del titular + parallax + barrido de luz
     * ============================================================ */
    function splitHeadline(h1) {
        if (!h1 || h1.dataset.split) return;
        h1.dataset.split = '1';
        var frag = document.createDocumentFragment();
        var wordIndex = 0;
        Array.prototype.forEach.call(h1.childNodes, function (node) {
            if (node.nodeType === 3) { // texto
                node.textContent.split(/(\s+)/).forEach(function (chunk) {
                    if (chunk.trim() === '') { frag.appendChild(document.createTextNode(chunk)); return; }
                    var w = document.createElement('span');
                    w.className = 'hl-word';
                    var inner = document.createElement('span');
                    inner.className = 'hl-word-in';
                    inner.textContent = chunk;
                    inner.style.transitionDelay = (0.05 + wordIndex * 0.06) + 's';
                    w.appendChild(inner);
                    frag.appendChild(w);
                    wordIndex++;
                });
            } else if (node.nodeName === 'BR') {
                frag.appendChild(node.cloneNode());
            } else { // <span> del título, etc.
                var wrap = document.createElement('span');
                wrap.className = 'hl-word';
                var inner2 = document.createElement('span');
                inner2.className = 'hl-word-in';
                inner2.innerHTML = node.innerHTML;
                if (node.className) inner2.className += ' ' + node.className;
                inner2.style.transitionDelay = (0.05 + wordIndex * 0.06) + 's';
                wrap.appendChild(inner2);
                frag.appendChild(wrap);
                wordIndex++;
            }
        });
        h1.innerHTML = '';
        h1.appendChild(frag);
    }

    function initHero() {
        var hero = document.querySelector('.hero');
        if (!hero) return;
        var bg = hero.querySelector('.hero-bg');
        var content = hero.querySelector('.hero-content');
        var h1 = hero.querySelector('.hero-content h1');

        if (!reduce) splitHeadline(h1);

        // Disparar la entrada (con red de seguridad: si rAF no corre, el
        // titular nunca debe quedarse invisible)
        var fired = false;
        function ready() { if (fired) return; fired = true; hero.classList.add('hero-ready'); }
        requestAnimationFrame(function () { requestAnimationFrame(ready); });
        setTimeout(ready, 1200);

        if (reduce) return;

        // Parallax suave del contenido y el fondo al hacer scroll
        var ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var y = window.scrollY || 0;
                var vh = window.innerHeight || 1;
                if (y < vh * 1.1) {
                    var p = y / vh;
                    if (content) {
                        content.style.transform = 'translate3d(0,' + (p * 46).toFixed(1) + 'px,0)';
                        content.style.opacity = String(Math.max(0, 1 - p * 1.15));
                    }
                    if (bg) bg.style.transform = 'translate3d(0,' + (p * 26).toFixed(1) + 'px,0) scale(' + (1.06 + p * 0.06).toFixed(3) + ')';
                }
                ticking = false;
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ============================================================
     * 4. Vapor del hero — canvas ligero, se pausa fuera de vista
     * ============================================================ */
    function initSteam() {
        var hero = document.querySelector('.hero');
        if (!hero || reduce) return;
        var canvas = document.createElement('canvas');
        canvas.className = 'hero-steam';
        canvas.setAttribute('aria-hidden', 'true');
        hero.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0, parts = [], running = false, raf = 0;
        var COUNT = window.innerWidth < 700 ? 9 : 14;

        function resize() {
            W = hero.clientWidth; H = hero.clientHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        function mk() {
            return {
                x: Math.random() * W,
                y: H + Math.random() * H * 0.5,
                r: 40 + Math.random() * 90,
                vy: 0.15 + Math.random() * 0.35,
                vx: -0.15 + Math.random() * 0.3,
                a: 0.015 + Math.random() * 0.03,
                life: 0, max: 600 + Math.random() * 500
            };
        }
        function tick() {
            if (!running) return;
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.life++; p.y -= p.vy; p.x += p.vx;
                var fade = Math.sin(Math.min(p.life / p.max, 1) * Math.PI);
                var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                g.addColorStop(0, 'rgba(255,248,235,' + (p.a * fade) + ')');
                g.addColorStop(1, 'rgba(255,248,235,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                if (p.life >= p.max || p.y < -p.r) parts[i] = mk();
            }
            raf = requestAnimationFrame(tick);
        }
        function start() { if (running) return; running = true; raf = requestAnimationFrame(tick); }
        function stop() { running = false; cancelAnimationFrame(raf); }

        resize();
        for (var i = 0; i < COUNT; i++) { parts.push(mk()); parts[i].life = Math.random() * parts[i].max; }
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop(); else if (isVisible()) start();
        });
        function isVisible() {
            var r = hero.getBoundingClientRect();
            return r.bottom > 0 && r.top < (window.innerHeight || 0);
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) {
                es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
            }, { threshold: 0.01 }).observe(hero);
        } else { start(); }
    }

    /* ============================================================
     * 5. Carrusel arrastrable con inercia
     * ============================================================ */
    function initDragCarousel() {
        var wrap = document.querySelector('.carousel-track-wrapper');
        var track = document.getElementById('carouselTrack');
        if (!wrap || !track) return;

        // Convertir de animación CSS a scroll real y arrastrable
        wrap.classList.add('carousel-draggable');
        var half = track.scrollWidth / 2;

        var down = false, moved = false, startX = 0, startScroll = 0;
        var vel = 0, lastX = 0, lastT = 0, momentum = 0;
        var auto = !reduce;

        function normalize() {
            if (wrap.scrollLeft >= half) wrap.scrollLeft -= half;
            else if (wrap.scrollLeft < 0) wrap.scrollLeft += half;
        }
        function autoTick() {
            if (auto && !down) { wrap.scrollLeft += 0.5; normalize(); }
            requestAnimationFrame(autoTick);
        }
        function inertia() {
            if (down) return;
            if (Math.abs(momentum) > 0.2) {
                wrap.scrollLeft -= momentum;
                momentum *= 0.94;
                normalize();
                requestAnimationFrame(inertia);
            }
        }
        function pointerDown(e) {
            down = true; moved = false;
            startX = lastX = (e.touches ? e.touches[0].pageX : e.pageX);
            startScroll = wrap.scrollLeft;
            lastT = performance.now(); momentum = 0;
            wrap.classList.add('is-grabbing');
        }
        function pointerMove(e) {
            if (!down) return;
            var x = (e.touches ? e.touches[0].pageX : e.pageX);
            var dx = x - startX;
            if (Math.abs(dx) > 4) moved = true;
            wrap.scrollLeft = startScroll - dx;
            normalize();
            var now = performance.now(), dt = now - lastT || 16;
            momentum = (x - lastX) / dt * 16;
            lastX = x; lastT = now;
            if (e.cancelable && e.touches) e.preventDefault();
        }
        function pointerUp() {
            if (!down) return;
            down = false;
            wrap.classList.remove('is-grabbing');
            inertia();
        }
        wrap.addEventListener('mousedown', pointerDown);
        window.addEventListener('mousemove', pointerMove);
        window.addEventListener('mouseup', pointerUp);
        wrap.addEventListener('touchstart', pointerDown, { passive: true });
        wrap.addEventListener('touchmove', pointerMove, { passive: false });
        wrap.addEventListener('touchend', pointerUp);
        wrap.addEventListener('mouseenter', function () { auto = false; });
        wrap.addEventListener('mouseleave', function () { auto = !reduce; });
        // Evitar que un arrastre dispare el click de "Agregar"
        track.addEventListener('click', function (e) {
            if (moved) { e.preventDefault(); e.stopPropagation(); }
        }, true);

        requestAnimationFrame(autoTick);
    }

    /* ============================================================
     * 6. "Agregar" → la foto vuela al carrito (FLIP)
     * ============================================================ */
    function flyToCart(btn) {
        if (reduce) return;
        var card = btn.closest('.producto-card');
        var img = card && card.querySelector('img');
        var badge = document.getElementById('cartBadge');
        if (!img || !badge) return;

        var from = img.getBoundingClientRect();
        var to = badge.getBoundingClientRect();
        var clone = img.cloneNode(true);
        clone.className = 'fly-clone';
        clone.style.left = from.left + 'px';
        clone.style.top = from.top + 'px';
        clone.style.width = from.width + 'px';
        clone.style.height = from.height + 'px';
        document.body.appendChild(clone);

        var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        var dy = (to.top + to.height / 2) - (from.top + from.height / 2);

        requestAnimationFrame(function () {
            clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0.08)';
            clone.style.opacity = '0.2';
            clone.style.borderRadius = '50%';
        });
        setTimeout(function () {
            clone.remove();
            badge.classList.remove('badge-pop');
            void badge.offsetWidth;
            badge.classList.add('badge-pop');
        }, 720);
    }

    function initFlyToCart() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.btn-agregar');
            if (btn) flyToCart(btn);
        });
    }

    /* ============================================================
     * 7. Transición entre páginas (View Transitions API)
     * ============================================================ */
    function initViewTransitions() {
        if (reduce || !('startViewTransition' in document)) return;
        var sameOrigin = location.origin;
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a');
            if (!a) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;
            if (a.origin !== sameOrigin) return;
            if (a.getAttribute('href').charAt(0) === '#') return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            document.startViewTransition(function () { window.location.href = a.href; });
        });
    }

    /* ============================================================
     * Init
     * ============================================================ */
    onReady(function () {
        document.documentElement.classList.add('anim-on');
        initReveal();
        initCountup();
        initHero();
        initSteam();
        initDragCarousel();
        initFlyToCart();
        initViewTransitions();
    });
})();
