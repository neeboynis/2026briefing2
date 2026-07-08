var lenis = null;

/* Lenis */
$(function () {
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (typeof Lenis === 'undefined' || reduceMotion) return;

	lenis = new Lenis({
		duration: 1.1,
		easing: function (t) {
			return Math.min(1, 1.001 - Math.pow(2, -10 * t));
		},
		smoothWheel: true,
		syncTouch: false
	});

	function raf(time) {
		lenis.raf(time);
		requestAnimationFrame(raf);
	}
	requestAnimationFrame(raf);
});

/* Mobile Menu */
$(function () {
	var $menuBtn = $('.mo_menu_btn');
	var $moNav = $('.mo_nav');
	var $moDim = $('.mo_dim');
	var $header = $('header');
	var pcMedia = window.matchMedia('(min-width: 769px)');

	if (!$menuBtn.length || !$moNav.length || !$moDim.length) return;

	function openMenu() {
		$menuBtn.addClass('active').attr('aria-expanded', 'true');
		$moNav.addClass('active');
		$moDim.addClass('active');
		$('html').addClass('mo_nav_open');
		if (lenis) lenis.stop();
	}

	function closeMenu() {
		$menuBtn.removeClass('active').attr('aria-expanded', 'false');
		$moNav.removeClass('active');
		$moDim.removeClass('active');
		$('html').removeClass('mo_nav_open');
		if (lenis) lenis.start();
	}

	$menuBtn.on('click', function () {
		$menuBtn.hasClass('active') ? closeMenu() : openMenu();
	});

	$moDim.on('click', closeMenu);
	$('.mo_nav_close').on('click', closeMenu);

	$('a[href^="#"]').on('click', function (e) {
		var targetId = $(this).attr('href');

		if (!targetId || targetId === '#') {
			e.preventDefault();
			closeMenu();
			return;
		}

		var $target = $(targetId);
		if (!$target.length) return;

		e.preventDefault();
		closeMenu();

		if (!targetId || targetId === '#') return;

		var $target = $(targetId);
		if (!$target.length) return;

		var headerH = $header.length ? $header.outerHeight() : 0;

		if (lenis) {
			lenis.scrollTo($target[0], {
				offset: -headerH + 40,
				duration: 1.2
			});
		} else {
			$('html, body').stop().animate({
				scrollTop: $target.offset().top - headerH + 40
			}, 600);
		}
	});

	function handleResizeMenu(e) {
		if (e.matches) closeMenu();
	}

	if (pcMedia.addEventListener) {
		pcMedia.addEventListener('change', handleResizeMenu);
	} else {
		pcMedia.addListener(handleResizeMenu);
	}

	/* Scroll Spy */
	var $spyLinks = $('.gnb a[href^="#"], .mo_gnb a[href^="#"]').filter(function () {
		var href = $(this).attr('href');
		return href && href.length > 1 && $(href).length;
	});
	var spySections = [];

	$spyLinks.each(function () {
		var id = $(this).attr('href');
		var exists = spySections.some(function (s) {
			return s.id === id;
		});

		if (!exists) {
			spySections.push({ id: id, $el: $(id) });
		}
	});

	function updateSpy() {
		if (!spySections.length) return;

		var headerH = $header.length ? $header.outerHeight() : 0;
		var scrollPos = $(window).scrollTop() + headerH + 60;
		var currentId = null;

		$.each(spySections, function (_, s) {
			if (scrollPos >= s.$el.offset().top) currentId = s.id;
		});

		if ($(window).height() + $(window).scrollTop() >= $(document).height() - 2) {
			currentId = spySections[spySections.length - 1].id;
		}

		$spyLinks.each(function () {
			$(this).toggleClass('active', $(this).attr('href') === currentId);
		});
	}

	var spyTicking = false;
	function onSpyScroll() {
		if (spyTicking) return;
		spyTicking = true;
		requestAnimationFrame(function () {
			updateSpy();
			spyTicking = false;
		});
	}

	$(window).on('scroll resize', onSpyScroll);
	updateSpy();
});

/* Video */
$(function () {
	var $videoSec = $('#video');
	var $videoList = $('.video_list');
	var $videoSwiper = $('.video_swiper');
	var $videoMainSwiper = $('.video_main_swiper');
	if (!$videoSec.length || !$videoSwiper.length || !$videoMainSwiper.length || typeof Swiper === 'undefined') return;

	var videoLoopTotal = $videoSwiper.find('.swiper-slide').length;
	var videoVisible = false;
	var videoHover = false;
	var videoLoopRunning = false;
	var videoRaf = null;
	var videoLastTime = 0;
	var videoOffset = 0;
	var videoLoopDistance = 0;
	var videoLoopSpeed = 48;
	var videoLoopDelay = 900;
	var videoStartTimer = null;
	var selectedVideoIndex = 0;
	var activeDotIndex = 0;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function videoSlideClone(swiper) {
		var swiperWrapper = swiper.el.querySelector('.swiper-wrapper');
		if (!swiperWrapper) return;

		var slides = Array.prototype.slice.call(swiperWrapper.querySelectorAll('.swiper-slide'));
		if (!slides.length) return;

		videoLoopTotal = slides.length;

		$.each(slides, function (index, slide) {
			slide.setAttribute('data-video-index', index);
		});

		var minSlides = Math.max(videoLoopTotal * 4, 16);
		var cloneIndex = 0;
		while (swiperWrapper.children.length < minSlides) {
			var clone = slides[cloneIndex % videoLoopTotal].cloneNode(true);
			clone.setAttribute('data-loop-clone', 'true');
			clone.setAttribute('aria-hidden', 'true');
			swiperWrapper.appendChild(clone);
			cloneIndex++;
		}
	}

	function paginationOverflow(index, className) {
		if (index >= videoLoopTotal) return '';
		return '<span class="' + className + '"></span>';
	}

	function setPaginationActive(index) {
		if (!thumbsSwiper || !thumbsSwiper.pagination) return;
		var bullets = thumbsSwiper.pagination.bullets ? thumbsSwiper.pagination.bullets : [];
		if (!bullets.length || !videoLoopTotal) return;

		index = index % videoLoopTotal;
		activeDotIndex = index;
		$(bullets).removeClass('swiper-pagination-bullet-active').removeAttr('aria-current');
		$(bullets[index]).addClass('swiper-pagination-bullet-active').attr('aria-current', 'true');
	}

	function setThumbActive(index) {
		if (!videoLoopTotal) return;
		index = index % videoLoopTotal;
		$videoSwiper.find('.swiper-slide').removeClass('is-active').filter('[data-video-index="' + index + '"]').addClass('is-active');
	}

	function getSlidePosition(slide) {
		if (!thumbsSwiper || !slide) return 0;
		return thumbsSwiper.isHorizontal() ? slide.offsetLeft : slide.offsetTop;
	}

	function updateVideoLoopDistance() {
		if (!thumbsSwiper || !thumbsSwiper.slides || thumbsSwiper.slides.length <= videoLoopTotal) return;

		thumbsSwiper.update();
		videoLoopDistance = getSlidePosition(thumbsSwiper.slides[videoLoopTotal]) - getSlidePosition(thumbsSwiper.slides[0]);

		if (videoLoopDistance <= 0) {
			var firstSlide = thumbsSwiper.slides[0];
			var size = thumbsSwiper.isHorizontal() ? firstSlide.offsetWidth : firstSlide.offsetHeight;
			videoLoopDistance = (size + thumbsSwiper.params.spaceBetween) * videoLoopTotal;
		}

		if (videoLoopDistance > 0) {
			videoOffset = videoOffset % videoLoopDistance;
			thumbsSwiper.setTransition(0);
			thumbsSwiper.setTranslate(-videoOffset);
		}
	}

	function getLoopIndex() {
		if (!videoLoopDistance || !thumbsSwiper.slides.length) return 0;

		var currentOffset = videoOffset % videoLoopDistance;
		var currentIndex = 0;

		for (var i = 0; i < videoLoopTotal; i++) {
			var start = getSlidePosition(thumbsSwiper.slides[i]);
			var end = i === videoLoopTotal - 1 ? videoLoopDistance : getSlidePosition(thumbsSwiper.slides[i + 1]);
			if (currentOffset >= start && currentOffset < end) {
				currentIndex = i;
				break;
			}
		}

		return currentIndex;
	}

	function moveThumbTo(index) {
		if (!thumbsSwiper || !videoLoopTotal) return;

		updateVideoLoopDistance();
		index = index % videoLoopTotal;
		if (index < 0) index = 0;

		videoOffset = getSlidePosition(thumbsSwiper.slides[index]);
		if (videoLoopDistance > 0) videoOffset = videoOffset % videoLoopDistance;

		thumbsSwiper.setTransition(300);
		thumbsSwiper.setTranslate(-videoOffset);
		setTimeout(function () {
			if (!thumbsSwiper) return;
			thumbsSwiper.setTransition(0);
			thumbsSwiper.setTranslate(-videoOffset);
		}, 320);
	}

	function moveThumbLoop(time) {
		if (!videoLoopRunning) return;

		if (!videoLastTime) videoLastTime = time;

		var delta = Math.min(time - videoLastTime, 80);
		videoLastTime = time;
		videoOffset += videoLoopSpeed * (delta / 1000);

		if (videoLoopDistance > 0 && videoOffset >= videoLoopDistance) {
			videoOffset = videoOffset % videoLoopDistance;
		}

		thumbsSwiper.setTransition(0);
		thumbsSwiper.setTranslate(-videoOffset);

		videoRaf = requestAnimationFrame(moveThumbLoop);
	}

	function startThumbLoop(delay) {
		if (reduceMotion || !videoVisible || videoHover || videoLoopRunning || videoStartTimer) return;

		delay = delay || 0;
		if (delay > 0) {
			videoStartTimer = setTimeout(function () {
				videoStartTimer = null;
				startThumbLoop();
			}, delay);
			return;
		}

		updateVideoLoopDistance();
		videoLoopRunning = true;
		videoLastTime = 0;
		videoRaf = requestAnimationFrame(moveThumbLoop);
	}

	function stopThumbLoop() {
		if (videoStartTimer) clearTimeout(videoStartTimer);
		videoStartTimer = null;
		videoLoopRunning = false;
		videoLastTime = 0;
		if (videoRaf) cancelAnimationFrame(videoRaf);
		videoRaf = null;
		if (thumbsSwiper) {
			thumbsSwiper.setTransition(0);
			thumbsSwiper.setTranslate(-videoOffset);
		}
	}

	function pausePrevVideo(swiper) {
		var prev = swiper.slides[swiper.previousIndex];
		if (!prev) return;

		$(prev).find('iframe').each(function () {
			if (this.contentWindow) {
				this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
			}
		});
	}

	var thumbsSwiper = new Swiper('.video_swiper', {
		direction: 'vertical',
		loop: false,
		slidesPerView: 4,
		spaceBetween: 16,
		speed: 0,
		allowTouchMove: false,
		watchOverflow: false,
		watchSlidesProgress: true,
		slideToClickedSlide: false,
		pagination: {
			el: '.video_pagination',
			clickable: false,
			renderBullet: paginationOverflow
		},
		breakpoints: {
			0: {
				direction: 'horizontal',
				slidesPerView: 2,
				spaceBetween: 12
			},
			901: {
				direction: 'vertical',
				slidesPerView: 2,
				spaceBetween: 16
			},
			1025: {
				direction: 'vertical',
				slidesPerView: 3,
				spaceBetween: 16
			},
			1201: {
				direction: 'vertical',
				slidesPerView: 4,
				spaceBetween: 16
			}
		},
		on: {
			beforeInit: videoSlideClone,
			afterInit: function () {
				updateVideoLoopDistance();
				setPaginationActive(0);
				setThumbActive(0);
			},
			resize: function () {
				updateVideoLoopDistance();
				setPaginationActive(activeDotIndex);
			},
			breakpoint: function () {
				setTimeout(function () {
					updateVideoLoopDistance();
					setPaginationActive(activeDotIndex);
				}, 50);
			}
		}
	});

	updateVideoLoopDistance();
	setPaginationActive(0);
	setThumbActive(0);

	var mainSwiper = new Swiper('.video_main_swiper', {
		effect: 'fade',
		fadeEffect: { crossFade: true },
		speed: 600,
		allowTouchMove: false,
		on: {
			slideChange: function () {
				selectedVideoIndex = this.activeIndex;
				pausePrevVideo(this);
				setThumbActive(selectedVideoIndex);
				setPaginationActive(selectedVideoIndex);
			}
		}
	});

	$videoSwiper.on('mouseenter focusin', function () {
		videoHover = true;
		stopThumbLoop();
	});

	$videoSwiper.on('mouseleave focusout', function () {
		videoHover = false;
		startThumbLoop();
	});

	$videoSwiper.on('click', '.thumb_btn', function () {
		var index = parseInt($(this).closest('.swiper-slide').attr('data-video-index'), 10) || 0;
		selectedVideoIndex = index;
		mainSwiper.slideTo(index);
		setThumbActive(index);
		setPaginationActive(index);
	});

	$('.video_pagination').on('click', '.swiper-pagination-bullet', function (e) {
		e.preventDefault();
		var dotIndex = $(this).index();

		videoHover = false;
		stopThumbLoop();
		moveThumbTo(dotIndex);
		setPaginationActive(dotIndex);
		setTimeout(startThumbLoop, 360);
	});

	$(document).on('visibilitychange', function () {
		document.hidden ? stopThumbLoop() : startThumbLoop();
	});

	if ('IntersectionObserver' in window) {
		var videoObserver = new IntersectionObserver(function (entries) {
			$.each(entries, function (_, entry) {
				videoVisible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
				videoVisible ? startThumbLoop(videoLoopDelay) : stopThumbLoop();
			});
		}, { threshold: [0, 0.25, 0.5] });

		videoObserver.observe($videoSec[0]);
	} else {
		videoVisible = true;
		startThumbLoop();
	}
});

/* News */
$(function () {
	if (!$('.news_swiper').length || typeof Swiper === 'undefined') return;

	new Swiper('.news_swiper', {
		loop: false,
		speed: 500,
		spaceBetween: 40,
		grabCursor: true,
		watchOverflow: true,
		navigation: {
			prevEl: '.news_prev',
			nextEl: '.news_next'
		},
		a11y: {
			prevSlideMessage: '이전 보도자료',
			nextSlideMessage: '다음 보도자료'
		}
	});
});

/* Reveal */
$(function () {
	var $targets = $('[data-reveal]');
	if (!$targets.length) return;

	function show(el) {
		var $el = $(el);
		var delay = parseInt($el.attr('data-reveal-delay'), 10) || 0;
		var done = false;

		if (delay > 0) $el.css('transition-delay', delay + 'ms');

		function finalize() {
			if (done) return;
			done = true;
			$el.css('transition-delay', '').removeAttr('data-reveal').off('transitionend', onEnd);
		}

		function onEnd(e) {
			if (e.target === el) finalize();
		}

		$el.on('transitionend', onEnd);
		setTimeout(finalize, delay + 1000);
		$el.addClass('is-visible');
	}

	if (!('IntersectionObserver' in window)) {
		$targets.each(function () {
			show(this);
		});
		return;
	}

	var observer = new IntersectionObserver(function (entries) {
		$.each(entries, function (_, entry) {
			if (entry.isIntersecting) {
				show(entry.target);
				observer.unobserve(entry.target);
			}
		});
	}, {
		rootMargin: '0px 0px -10% 0px',
		threshold: 0
	});

	$targets.each(function () {
		observer.observe(this);
	});
});
