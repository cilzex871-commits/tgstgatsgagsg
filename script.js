    document.addEventListener('DOMContentLoaded', () => {
      const splash = document.getElementById('splash');
      const gate = document.getElementById('gate');
      const gateBtn = document.getElementById('gate-btn');
      const app = document.getElementById('app');
      const dock = document.getElementById('dock');
      const dockPill = dock.querySelector('.dock-pill');
      const dockBtns = Array.from(dock.querySelectorAll('.dock-btn'));
      const panes = Array.from(document.querySelectorAll('.pane'));

      setTimeout(() => {
        splash.classList.add('hidden');
        gate.classList.add('show');
      }, 1750);

      gateBtn.addEventListener('click', () => {
        gate.classList.add('leaving');
        app.classList.add('reveal');
        setTimeout(() => {
          gate.classList.remove('show');
          gate.classList.remove('leaving');
        }, 450);
      });

      // ===== cached dock geometry =====
      // Dibaca dari layout HANYA saat init / resize / mulai drag — bukan di
      // setiap pointermove. Selama drag berlangsung, semua kalkulasi pakai
      // angka-angka ini dari memori, jadi nggak ada forced reflow sama sekali.
      let dockGeom = null;

      function computeDockGeometry() {
        const dockRect = dock.getBoundingClientRect();
        const btns = dockBtns.map(btn => {
          const r = btn.getBoundingClientRect();
          const left = r.left - dockRect.left;
          return { btn, left, width: r.width, center: left + r.width / 2 };
        });
        dockGeom = { left: dockRect.left, width: dockRect.width, btns, baseWidth: btns[0].width };
      }

      function geomFor(btn) {
        return dockGeom.btns.find(b => b.btn === btn);
      }

      
      function movePill(btn) {
        if (!dockGeom) computeDockGeometry();
        const g = geomFor(btn);
        if (!g) return;
        dockPill.style.transform = `translateX(${g.left}px) scaleX(1) scaleY(1)`;
      }

      function activate(target, btn) {
        panes.forEach(p => p.classList.toggle('active', p.dataset.pane === target));
        dockBtns.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
      }

      dockBtns.forEach(btn => {
        btn.addEventListener('click', () => { activate(btn.dataset.target, btn); movePill(btn); });
      });

      window.addEventListener('resize', () => {
        computeDockGeometry();
        const active = dock.querySelector('.dock-btn.active');
        if (active) movePill(active);
      });

      // initial pill position (after layout settles)
      requestAnimationFrame(() => {
        computeDockGeometry();
        const initialActive = dock.querySelector('.dock-btn.active') || dockBtns[0];
        movePill(initialActive);
      });

      // social link loading feedback (navigasi keluar seperti biasa)
      document.querySelectorAll('.social-item').forEach((link) => {
        link.addEventListener('click', function (e) {
          if (this.classList.contains('is-loading')) { e.preventDefault(); return; }
          const href = this.getAttribute('href');
          e.preventDefault();
          this.classList.add('is-loading');
          if (!href || href === '#') {
            setTimeout(() => this.classList.remove('is-loading'), 700);
          } else {
            setTimeout(() => { window.location.href = href; }, 550);
          }
        });
      });

      // task item -> buka preview modal, bukan langsung pindah halaman
      const previewModal = document.getElementById('preview-modal');
      const previewMedia = previewModal.querySelector('.preview-media');
      const previewTitle = previewModal.querySelector('.preview-title');
      const previewSub = previewModal.querySelector('.preview-sub');
      const previewLink = previewModal.querySelector('.preview-open-link');
      const previewClose = previewModal.querySelector('.preview-close');
      const previewBackdrop = previewModal.querySelector('.preview-backdrop');

      function openPreview(item) {
        const title = item.dataset.previewTitle || item.querySelector('.task-text')?.textContent || '';
        const sub = item.dataset.previewSub || '';
        const imgSrc = item.dataset.previewSrc || '';
        const videoSrc = item.dataset.previewVideo || '';
        const youtubeId = item.dataset.previewYoutube || '';
        const linkHref = item.getAttribute('href') || '';

        previewTitle.textContent = title;
        previewSub.textContent = sub;
        previewMedia.innerHTML = '';
        previewMedia.classList.remove('is-video');

        function showPlaceholder(message) {
          previewMedia.innerHTML = `
            <div class="preview-placeholder">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="9" cy="9" r="1.5"></circle><path d="M21 15l-5-5-9 9"></path></svg>
              <span>${message}</span>
            </div>`;
        }

        if (youtubeId) {
          previewMedia.classList.add('is-video');
          const iframe = document.createElement('iframe');
          iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`;
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = '0';
          iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
          iframe.allowFullscreen = true;
          previewMedia.appendChild(iframe);
        } else if (videoSrc) {
          previewMedia.classList.add('is-video');
          const video = document.createElement('video');
          video.src = videoSrc;
          if (imgSrc) video.poster = imgSrc;
          video.controls = true;
          video.playsInline = true;
          video.onerror = () => showPlaceholder('Video gagal dimuat. Cek lagi link videonya.');
          previewMedia.appendChild(video);

          // biar pas fullscreen di Android, layar ikut ke landscape otomatis
          // kayak YouTube (di iOS ini otomatis ditangani player native-nya)
          video.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement && screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(() => {});
            } else if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
              screen.orientation.unlock();
            }
          });
        } else if (imgSrc) {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = title;
          img.onerror = () => showPlaceholder('Gambar preview gagal dimuat. Cek lagi link gambarnya, atau buka file lewat tombol di bawah.');
          previewMedia.appendChild(img);
        } else {
          showPlaceholder('Belum ada preview — isi data-preview-src / data-preview-video di kode.');
        }

        if (linkHref && linkHref !== '#') {
          previewLink.href = linkHref;
          previewLink.style.display = '';
        } else {
          previewLink.style.display = 'none';
        }

        previewModal.classList.add('show');
      }

      function closePreview() {
        previewModal.classList.remove('show');
      }

      document.querySelectorAll('.task-item').forEach((item) => {
        item.addEventListener('click', function (e) {
          e.preventDefault();
          openPreview(this);
        });
      });

      previewClose.addEventListener('click', closePreview);
      previewBackdrop.addEventListener('click', closePreview);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePreview();
      });

      // ===== liquid dock: the pill chases your finger as you drag across the 5 tabs =====
      // FILOSOFI: native app (WhatsApp/Telegram/iOS) itu smooth bukan karena
      // pill-nya dikasih delay/lerp — justru sebaliknya, pill NEMPEL 1:1 ke
      // jari tiap frame, real-time, tanpa lag buatan sama sekali. "Smooth"-nya
      // datang dari update presisi tiap vsync (via requestAnimationFrame) +
      // transform murni (GPU compositing) — bukan dari gerakan yang "dikejar
      // pelan-pelan". Spring/bounce cuma dipakai SEKALI, pas jari dilepas,
      // buat efek "settle" ke slot terdekat — itu satu-satunya animasi
      // bertransisi di sini.
      let dockDragging = false;
      let rafId = null;
      let pendingClientX = null;

      // Bedain tap vs drag: cuma dianggap "drag beneran" (dan baru boleh
      // nge-hijack pill + magnify) kalau jari geser lebih dari sekian px.
      // Tap murni dibiarin lewat, biar animasi bounce dari klik biasa yang jalan.
      let dragStartX = null;
      let dragCommitted = false;
      const DRAG_THRESHOLD = 6; // px

      // Untuk squish/stretch: dihitung dari SEBERAPA JAUH pill berpindah
      // antar frame (velocity), langsung dari angka mentahnya — bukan lerp.
      // Jadi begitu jari melambat/berhenti, squish-nya ikut hilang SEKETIKA
      // di frame yang sama, nggak ada delay balik ke bentuk normal.
      let lastLeft = null;
      let lastFrameTime = null;
      const STRETCH_K = 0.05;   // makin besar, makin gampang "meleleh" pas gerak cepat
      const MAX_STRETCH = 0.22; // batas atas: pill maksimal 22% lebih lebar
      const SQUASH_RATIO = 0.5; // seberapa banyak tinggi ikut menyusut saat melebar (kesan volume cair)

      // ===== magnify (lensa kaca) — persis efek dock/tab bar Liquid Glass iOS 26:
      // tombol yang lagi "di bawah" kaca membesar kayak dilihat lewat lensa
      // pembesar, tombol di sekitarnya ikut membesar dikit (falloff), makin
      // jauh makin balik ke ukuran normal. Dihitung tiap frame langsung dari
      // jarak tombol ke posisi jari (pure math, pakai geometri cache — no DOM
      // read), jadi nempel 1:1 sama gerakan kaca, sama kayak posisi pill.
      const MAGNIFY_MAX = 0.34;   // tombol tepat di bawah kaca membesar sampai 34%
      const MAGNIFY_SIGMA_RATIO = 0.8; // makin besar, makin lebar sebaran efeknya ke tombol tetangga

      function applyMagnify(clientX) {
        const fingerX = Math.min(Math.max(clientX - dockGeom.left, 0), dockGeom.width);
        const sigma = dockGeom.baseWidth * MAGNIFY_SIGMA_RATIO;
        dockGeom.btns.forEach(g => {
          const d = g.center - fingerX;
          const scale = 1 + MAGNIFY_MAX * Math.exp(-(d * d) / (2 * sigma * sigma));
          g.btn.style.transform = `scale(${scale})`;
        });
      }

      function resetMagnify() {
        dockGeom.btns.forEach(g => { g.btn.style.transform = ''; });
      }

      function nearestBtnFromCache(clientX) {
        const x = Math.min(Math.max(clientX - dockGeom.left, 0), dockGeom.width);
        let closest = dockGeom.btns[0];
        let closestDist = Infinity;
        dockGeom.btns.forEach(g => {
          const dist = Math.abs(g.center - x);
          if (dist < closestDist) { closestDist = dist; closest = g; }
        });
        return closest;
      }

      // Posisi pill = tengah pill mengikuti posisi jari persis, di-clamp biar
      // nggak keluar dari track dock. Ini yang bikin gerakannya KONTINU
      // (nggak loncat dari satu slot tombol ke slot lain), sama seperti
      // indikator tab di iOS yang beneran ngikutin jari, bukan snap diskrit.
      function pillLeftForFinger(clientX) {
        const localX = clientX - dockGeom.left;
        const minLeft = dockGeom.btns[0].left;
        const maxLeft = dockGeom.btns[dockGeom.btns.length - 1].left;
        const raw = localX - dockGeom.baseWidth / 2;
        return Math.min(Math.max(raw, minLeft), maxLeft);
      }

      // Dipanggil max 1x per frame render (di-throttle via rAF), tapi nilai
      // yang di-apply SELALU posisi jari yang paling baru — jadi bukan lerp,
      // murni "gambar ulang di posisi terbaru pas browser siap gambar frame
      // berikutnya". Itu cara paling presisi buat 60/120fps yang mulus.
      function applyDockFrame() {
        rafId = null;
        if (pendingClientX === null) return;
        const left = pillLeftForFinger(pendingClientX);

        // squish: makin cepat pill berpindah tiap ms, makin dia meregang
        // melebar (scaleX) sambil dikit menipis (scaleY) — kayak liquid glass
        // yang punya "berat"/momentum, tapi dihitung instan tiap frame,
        // bukan diakumulasi/di-smooth, jadi nggak nambah lag sama sekali.
        const now = performance.now();
        let scaleX = 1;
        if (lastLeft !== null && lastFrameTime !== null) {
          const dt = Math.max(now - lastFrameTime, 1);
          const velocity = Math.abs(left - lastLeft) / dt; // px per ms
          scaleX = 1 + Math.min(velocity * STRETCH_K, MAX_STRETCH);
        }
        const scaleY = 1 - (scaleX - 1) * SQUASH_RATIO;
        lastLeft = left;
        lastFrameTime = now;

        dockPill.style.transform = `translateX(${left}px) scaleX(${scaleX}) scaleY(${scaleY})`;
        applyMagnify(pendingClientX);

        const g = nearestBtnFromCache(pendingClientX);
        if (!g.btn.classList.contains('active')) activate(g.btn.dataset.target, g.btn);
      }

      function scheduleDockFrame(clientX) {
        pendingClientX = clientX;
        if (rafId === null) rafId = requestAnimationFrame(applyDockFrame);
      }

      function onDockDown(e) {
        dockDragging = true;
        dragCommitted = false; // belum tentu ini drag — bisa aja cuma tap
        computeDockGeometry(); // murah, sekali per gesture, aman dipanggil di awal
        const p = e.touches ? e.touches[0] : e;
        dragStartX = p.clientX;
        // SENGAJA belum nge-apply apa-apa ke pill/tombol di sini. Kalau langsung
        // di-set di titik ini (kayak versi sebelumnya), pas ini ternyata cuma
        // TAP (bukan drag), pill udah "nyampe" duluan sebelum transition CSS-nya
        // sempat jalan — makanya kerasa instan/patah. Nunggu commit dulu di bawah.
      }

      function commitDrag() {
        dragCommitted = true;
        dockPill.classList.add('tracking'); // transition:none — semua gerakan selama drag full manual per-frame
        dock.classList.add('dragging'); // sama, tapi buat transform scale tombol (magnify)
        lastLeft = null;
        lastFrameTime = null;
      }

      function onDockMove(e) {
        if (!dockDragging) return;
        const p = e.touches ? e.touches[0] : e;
        if (!dragCommitted) {
          // baru dianggap "drag beneran" kalau jari udah geser lebih dari
          // DRAG_THRESHOLD px. Di bawah itu, biarin — supaya tap sederhana
          // nggak ke-hijack jadi snap instan, dan tetap lewat jalur klik biasa
          // yang punya animasi meluncur + bounce dari transisi CSS.
          if (Math.abs(p.clientX - dragStartX) < DRAG_THRESHOLD) return;
          commitDrag();
        }
        scheduleDockFrame(p.clientX);
      }

      function onDockUp() {
        if (!dockDragging) return;
        dockDragging = false;
        if (!dragCommitted) return; // cuma tap — biarin 'click' listener di tombol yang nanganin, dengan animasi normal
        pendingClientX = null;
        lastLeft = null;
        lastFrameTime = null;
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        // lepas 'tracking'/'dragging' -> transition bouncy bawaan .dock-pill dan
        // .dock-btn nyala lagi, jadi pill + tombol yang lagi membesar sama-sama
        // "settle" balik ke ukuran normal dengan spring — ini satu-satunya momen
        // animasi ber-transisi dipakai di seluruh interaksi dock.
        dockPill.classList.remove('tracking');
        dock.classList.remove('dragging');
        resetMagnify();
        const active = dock.querySelector('.dock-btn.active');
        if (active) movePill(active);
        dragCommitted = false;
      }

      dock.addEventListener('pointerdown', onDockDown, { passive: true });
      dock.addEventListener('pointermove', onDockMove, { passive: true });
      window.addEventListener('pointerup', onDockUp, { passive: true });
      window.addEventListener('pointercancel', onDockUp, { passive: true });
    });
