var lenis = null;

function isReducedMotion() {
	return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Lenis */
$(function () {
	if (typeof Lenis === 'undefined' || isReducedMotion()) return;

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

/* Mobile Menu & Anchor */
$(function () {
	var $win = $(window);
	var $html = $('html');
	var $header = $('header');
	var $menuBtn = $('.mo_menu_btn');
	var $moNav = $('.mo_nav');
	var $moDim = $('.mo_dim');
	var pcMedia = window.matchMedia('(min-width: 769px)');

	if (!$menuBtn.length || !$moNav.length || !$moDim.length) return;

	function openMenu() {
		$menuBtn.addClass('active').attr('aria-expanded', 'true');
		$moNav.addClass('active');
		$moDim.addClass('active');
		$html.addClass('mo_nav_open');
		if (lenis) lenis.stop();
	}

	function closeMenu() {
		$menuBtn.removeClass('active').attr('aria-expanded', 'false');
		$moNav.removeClass('active');
		$moDim.removeClass('active');
		$html.removeClass('mo_nav_open');
		if (lenis) lenis.start();
	}

	function getHeaderOffset() {
		return $header.length ? $header.outerHeight() : 0;
	}

	function scrollToTarget($target) {
		var scrollTop = $target.offset().top - getHeaderOffset() + 40;

		if (lenis) {
			lenis.scrollTo($target[0], {
				offset: -getHeaderOffset() + 40,
				duration: 1.2
			});
			return;
		}

		$('html, body').stop().animate({ scrollTop: scrollTop }, 600);
	}

	$menuBtn.on('click', function () {
		$menuBtn.hasClass('active') ? closeMenu() : openMenu();
	});

	$moDim.add('.mo_nav_close').on('click', closeMenu);

	$('a[href^="#"]').on('click', function (e) {
		var targetId = $(this).attr('href');
		var $target = targetId && targetId !== '#' ? $(targetId) : $();

		if (!$target.length) {
			if (targetId === '#') e.preventDefault();
			closeMenu();
			return;
		}

		e.preventDefault();
		closeMenu();
		scrollToTarget($target);
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
		var exists = spySections.some(function (section) {
			return section.id === id;
		});

		if (!exists) spySections.push({ id: id, $el: $(id) });
	});

	function updateSpy() {
		if (!spySections.length) return;

		var scrollPos = $win.scrollTop() + getHeaderOffset() + 60;
		var currentId = null;

		$.each(spySections, function (_, section) {
			if (scrollPos >= section.$el.offset().top) currentId = section.id;
		});

		if ($win.height() + $win.scrollTop() >= $(document).height() - 2) {
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

	$win.on('scroll resize', onSpyScroll);
	updateSpy();
});

/* Video */
$(function () {
	var $doc = $(document);
	var $videoSec = $('#video');
	var $videoSwiper = $('.video_swiper');
	var $videoMainSwiper = $('.video_main_swiper');
	var $videoPagination = $('.video_pagination');

	if (!$videoSec.length || !$videoSwiper.length || !$videoMainSwiper.length || typeof Swiper === 'undefined') return;

	var thumbsSwiper = null;
	var videoLoopTotal = $videoSwiper.find('.swiper-slide').length;
	var videoVisible = false;
	var videoHover = false;
	var videoLoopRunning = false;
	var videoRaf = null;
	var videoLastTime = 0;
	var videoOffset = 0;
	var videoLoopDistance = 0;
	var videoLoopSpeed = 38;
	var videoLoopDelay = 900;
	var videoStartTimer = null;
	var selectedVideoIndex = 0;
	var activeDotIndex = 0;
	var reduceMotion = isReducedMotion();

	function videoSlideClone(swiper) {
		var $wrapper = $(swiper.el).find('.swiper-wrapper');
		var $slides = $wrapper.children('.swiper-slide');
		var minSlides;
		var cloneIndex = 0;

		if (!$wrapper.length || !$slides.length) return;

		videoLoopTotal = $slides.length;
		minSlides = Math.max(videoLoopTotal * 4, 16);

		$slides.each(function (index) {
			$(this).attr('data-video-index', index);
		});

		while ($wrapper.children().length < minSlides) {
			$slides.eq(cloneIndex % videoLoopTotal).clone(false).attr({
				'data-loop-clone': 'true',
				'aria-hidden': 'true'
			}).appendTo($wrapper);
			cloneIndex++;
		}
	}

	function renderPagination(index, className) {
		return index >= videoLoopTotal ? '' : '<span class="' + className + '"></span>';
	}

	function setPaginationActive(index) {
		if (!thumbsSwiper || !thumbsSwiper.pagination) return;

		var bullets = thumbsSwiper.pagination.bullets || [];
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
		var $prevSlide = $(swiper.slides[swiper.previousIndex]);
		if (!$prevSlide.length) return;

		$prevSlide.find('iframe').each(function () {
			if (this.contentWindow) {
				this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
			}
		});
	}

	thumbsSwiper = new Swiper('.video_swiper', {
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
			renderBullet: renderPagination
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

	$videoPagination.on('click', '.swiper-pagination-bullet', function (e) {
		e.preventDefault();

		var dotIndex = $(this).index();
		videoHover = false;
		stopThumbLoop();
		moveThumbTo(dotIndex);
		setPaginationActive(dotIndex);
		setTimeout(startThumbLoop, 360);
	});

	$doc.on('visibilitychange', function () {
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

		$el.on('transitionend', onEnd).addClass('is-visible');
		setTimeout(finalize, delay + 1000);
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
