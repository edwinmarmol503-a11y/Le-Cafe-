/*
 * data-render.js — El sitio se dibuja desde docs/data/*.json
 *
 * Estrategia SEGURA: el HTML mantiene su contenido "quemado" como respaldo.
 * Este script, si logra leer los JSON, reemplaza las secciones dinámicas con
 * los datos frescos. Si los JSON fallan (no subidos, sin conexión), no hace
 * nada y la página se ve con el contenido de respaldo.
 */
(function () {
  'use strict';

  var DATA = 'assets/data/'; // se ajusta abajo según profundidad
  // docs/*.html están todos en la raíz de docs/, así que la ruta es directa:
  DATA = 'data/';

  var HDR_V = '?v=20260830-11';
  var FILES = ['categorias', 'productos', 'destacados', 'sucursales', 'config'];

  function money(n) { return '$' + (Number(n) || 0).toFixed(2); }
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function imgPath(p) {
    if (!p) return '';
    if (/^https?:|^assets\//.test(p)) return p;
    return 'assets/img/' + String(p).replace(/^.*\//, '');
  }

  function load() {
    return Promise.all(FILES.map(function (f) {
      return fetch(DATA + f + '.json', { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error(f);
        return r.json();
      });
    })).then(function (arr) {
      var d = {};
      FILES.forEach(function (f, i) { d[f] = arr[i]; });
      return d;
    });
  }

  /* ---------- precio ---------- */
  function precioHtml(p) {
    if (p.precio_oferta) {
      return '<span class="precio-oferta">' + money(p.precio_oferta) +
        '</span><span class="precio-tachado">' + money(p.precio) + '</span>';
    }
    return '<span>' + money(p.precio) + '</span>';
  }
  function precioVal(p) { return p.precio_oferta ? p.precio_oferta : p.precio; }

  function btnAgregar(p) {
    return '<button class="btn-agregar" data-id="' + esc(p.slug) + '" data-nombre="' + esc(p.nombre) +
      '" data-precio="' + esc(precioVal(p)) + '" data-imagen="' + esc(imgPath(p.imagen)) +
      '">Agregar</button>';
  }

  /* ---------- INDEX: categorías ---------- */
  function renderCategorias(d) {
    var grid = document.querySelector('.categorias-grid');
    if (!grid || !d.categorias.length) return;
    grid.innerHTML = d.categorias.map(function (c) {
      var img = imgPath(c.imagen);
      return '<a href="categoria-' + esc(c.slug) + '.html" class="categoria-card reveal">' +
        (img ? '<div class="categoria-card-img"><img src="' + esc(img) + '" alt="' + esc(c.nombre) + '" loading="lazy"></div>' : '') +
        '<div class="categoria-card-body">' +
        '<span class="cat-icon">' + esc(c.icono) + '</span>' +
        '<h3>' + esc(c.nombre) + '</h3>' +
        '<p>' + esc(c.descripcion) + '</p>' +
        '<span class="cat-arrow">Ver productos →</span>' +
        '</div></a>';
    }).join('');
  }

  /* ---------- INDEX: carrusel "más vendidos" ---------- */
  function renderDestacados(d) {
    var track = document.getElementById('carouselTrack');
    if (!track) return;
    var bySlug = {};
    d.productos.forEach(function (p) { bySlug[p.slug] = p; });
    var list = (d.destacados || []).map(function (s) { return bySlug[s]; })
      .filter(function (p) { return p && p.disponible !== false; });
    if (!list.length) return;
    var one = list.map(function (p) {
      return '<div class="producto-card carousel-card">' +
        (p.badge ? '<span class="badge badge-vendido">' + esc(p.badge) + '</span>' : '') +
        '<img src="' + esc(imgPath(p.imagen)) + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
        '<div class="producto-info"><h4>' + esc(p.nombre) + '</h4>' +
        '<div class="producto-precio">' + precioHtml(p) + '</div>' +
        btnAgregar(p) + '</div></div>';
    }).join('');
    track.innerHTML = one + one; // doble para el bucle infinito
  }

  /* ---------- sucursal card ---------- */
  function sucursalCard(s, withMaps) {
    var maps = '';
    if (withMaps) {
      var q = encodeURIComponent('Le Café ' + s.nombre + ' ' + (s.direccion || ''));
      maps = '<a class="sucursal-maps" href="https://www.google.com/maps/search/' + q +
        '" target="_blank" rel="noopener">Cómo llegar →</a>';
    }
    return '<div class="sucursal-card reveal">' +
      '<h4>' + esc(s.nombre) + '</h4>' +
      '<p class="sucursal-dir">📍 ' + esc(s.direccion || '') + '</p>' +
      '<p class="sucursal-horario">🕒 ' + esc(s.horario || '') + '</p>' +
      (s.telefono ? '<p class="sucursal-tel">📞 ' + esc(s.telefono) + '</p>' : '') +
      maps + '</div>';
  }

  /* ---------- INDEX: preview de sucursales ---------- */
  function renderSucursalesPreview(d) {
    var sec = document.querySelector('.sucursales-preview');
    if (!sec || !d.sucursales.length) return;
    var grid = sec.querySelector('.sucursales-grid');
    if (grid) grid.innerHTML = d.sucursales.slice(0, 3).map(function (s) { return sucursalCard(s, false); }).join('');
    var sub = sec.querySelector('.section-sub');
    if (sub) sub.textContent = d.sucursales.length + ' sucursales listas para atenderte en todo El Salvador.';
  }

  /* ---------- PÁGINA sucursales.html ---------- */
  function renderSucursalesFull(d) {
    var grid = document.querySelector('.sucursales-grid-full');
    if (!grid || !d.sucursales.length) return;
    grid.innerHTML = d.sucursales.map(function (s) { return sucursalCard(s, true); }).join('');
  }

  /* ---------- PÁGINA categoria-*.html ---------- */
  function currentCategorySlug() {
    var m = location.pathname.match(/categoria-([a-z0-9-]+)\.html/i);
    return m ? m[1] : null;
  }
  function renderCategoria(d) {
    var slug = currentCategorySlug();
    if (!slug) return;
    var cont = document.querySelector('.categoria-body .container');
    if (!cont) return;
    var cat = d.categorias.find(function (c) { return c.slug === slug; });
    var prods = d.productos.filter(function (p) { return p.categoria === slug && p.disponible !== false; });
    if (!prods.length) return;

    // título accesible + imagen de cabecera propia de la categoría
    var h1 = document.querySelector('.page-header .sr-only');
    if (h1 && cat) h1.textContent = cat.nombre;
    if (cat) document.title = cat.nombre + ' | Le Café';
    var ph = document.querySelector('.page-header');
    if (ph && cat && cat.header_imagen) {
      ph.style.backgroundImage = "url('" + imgPath(cat.header_imagen) + HDR_V + "')";
    }

    // agrupar por subcategoría preservando orden de aparición
    var groups = [], byName = {};
    prods.forEach(function (p) {
      var k = p.subcategoria || 'Otros';
      if (!byName[k]) { byName[k] = []; groups.push(k); }
      byName[k].push(p);
    });

    var tabsNav = '';
    if (groups.length > 1) {
      tabsNav = '<div class="tabs-nav reveal" id="tabsNav">' + groups.map(function (g, i) {
        return '<button class="tab-btn ' + (i === 0 ? 'active' : '') + '" data-tab="tab-' + i + '">' + esc(g) + '</button>';
      }).join('') + '</div>';
    }

    var panels = groups.map(function (g, i) {
      var cards = byName[g].map(function (p) {
        var ofertaBadge = '';
        if (p.precio_oferta && Number(p.precio) > 0) {
          var pct = Math.round((1 - Number(p.precio_oferta) / Number(p.precio)) * 100);
          ofertaBadge = '<span class="badge badge-oferta">' + pct + '% OFF</span>';
        }
        return '<div class="producto-card reveal">' +
          (p.badge ? '<span class="badge badge-vendido">' + esc(p.badge) + '</span>' : '') + ofertaBadge +
          '<img src="' + esc(imgPath(p.imagen)) + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
          '<div class="producto-info"><h4>' + esc(p.nombre) + '</h4>' +
          (p.descripcion ? '<p class="producto-desc">' + esc(p.descripcion) + '</p>' : '') +
          '<div class="producto-precio">' + precioHtml(p) + '</div>' +
          btnAgregar(p) + '</div></div>';
      }).join('');
      return '<div class="tab-panel ' + (i === 0 ? 'active' : '') + '" id="tab-' + i + '">' +
        '<div class="productos-grid">' + cards + '</div></div>';
    }).join('');

    cont.innerHTML = tabsNav + panels;
  }

  /* ---------- INDEX: imagen del hero ---------- */
  function renderHeroImage(cfg) {
    if (!cfg || !cfg.hero_imagen) return;
    var bg = document.querySelector('.hero-bg');
    if (!bg) return;
    bg.style.backgroundImage =
      "linear-gradient(160deg, rgba(27,58,92,0.75) 0%, rgba(27,58,92,0.55) 55%, rgba(27,58,92,0.75) 100%), " +
      "url('" + imgPath(cfg.hero_imagen) + HDR_V + "')";
  }

  /* ---------- Google Analytics (solo si hay ID en config) ---------- */
  function loadAnalytics(cfg) {
    if (!cfg || !cfg.ga_id || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var id = cfg.ga_id;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
  }

  /* ---------- CONFIG: parchar enlaces en todas las páginas ---------- */
  function applyConfig(cfg) {
    if (!cfg) return;
    if (cfg.whatsapp_numero) {
      window.WHATSAPP_NUMERO = cfg.whatsapp_numero;
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + cfg.whatsapp_numero);
      });
    }
    function setAll(sel, url) {
      if (!url) return;
      document.querySelectorAll(sel).forEach(function (a) { a.href = url; });
    }
    setAll('a[href*="pedidosyasv.com.sv"], .btn-pedidosya, .fab-item--pedidos', cfg.pedidosya_url);
    setAll('.fab-item--facebook', cfg.messenger_url);
    setAll('.fab-item--instagram', cfg.instagram_dm_url);
    setAll('.footer-social a[title="Facebook"], .footer-col a[href*="facebook.com"]', cfg.facebook_url);
    setAll('.footer-social a[title="Instagram"]', cfg.instagram_url);
    // tagline en el footer
    if (cfg.site_tagline) {
      var t = document.querySelector('.footer-brand p');
      if (t) t.textContent = cfg.site_tagline;
    }
  }

  /* ---------- run ---------- */
  function run() {
    load().then(function (d) {
      try { renderCategorias(d); } catch (e) {}
      try { renderDestacados(d); } catch (e) {}
      try { renderSucursalesPreview(d); } catch (e) {}
      try { renderSucursalesFull(d); } catch (e) {}
      try { renderCategoria(d); } catch (e) {}
      try { renderHeroImage(d.config); } catch (e) {}
      try { applyConfig(d.config); } catch (e) {}
      try { loadAnalytics(d.config); } catch (e) {}

      // re-activar animaciones sobre el contenido nuevo
      if (window.leCafeAnim && window.leCafeAnim.rescan) window.leCafeAnim.rescan();
      // por si initDragCarousel ya midió con el track vacío
      window.dispatchEvent(new Event('resize'));
      document.documentElement.classList.add('data-ready');
    }).catch(function () {
      // Los JSON no cargaron: se queda el contenido de respaldo del HTML.
      document.documentElement.classList.add('data-fallback');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
