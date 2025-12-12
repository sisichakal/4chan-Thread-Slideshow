// ==UserScript==
// @name         4chan Thread Slideshow
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add slideshow functionality to 4chan threads
// @author       You
// @match        https://boards.4chan.org/*/thread/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let currentIndex = 0;
    let aImages = [];
    let bIsOpen = false;
    let aPreloadedImages = [];

    // Create slideshow button
    function createSlideshowButton() {
        const navLinks = document.querySelector('.navLinks.desktop');
        if (!navLinks) return;

        const slideshowLink = document.createElement('a');
        slideshowLink.href = '#';
        slideshowLink.id = 'slideshow-btn';
        slideshowLink.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            margin-right: 8px;
        `;

        slideshowLink.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            Slideshow
        `;

        slideshowLink.addEventListener('mouseenter', () => {
            slideshowLink.style.transform = 'translateY(-2px)';
            slideshowLink.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });

        slideshowLink.addEventListener('mouseleave', () => {
            slideshowLink.style.transform = 'translateY(0)';
            slideshowLink.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        });

        slideshowLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSlideshow();
        });

        // Insert as first element in navLinks
        navLinks.insertBefore(slideshowLink, navLinks.firstChild);
    }

    // Get all images from posts
    function getPostImages() {
        const images = [];
        const posts = document.querySelectorAll('.post');

        posts.forEach(post => {
            const fileTextLink = post.querySelector('.fileText a');
            if (fileTextLink) {
                const imageUrl = fileTextLink.href;
                // Only add image files
                if (/\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl)) {
                    images.push(imageUrl);
                }
            }
        });

        return images;
    }

    // Preload all images
    function preloadImages() {
        aPreloadedImages = [];
        let loadedCount = 0;

        aImages.forEach((url, index) => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === aImages.length) {
                    showToast('All images preloaded');
                }
            };
            img.src = url;
            aPreloadedImages[index] = img;
        });
    }

    // Show toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background-color: rgba(255, 255, 255, 0.9);
            color: #000;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 10002;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // Create slideshow overlay
    function createSlideshowOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'slideshow-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            z-index: 10000;
            display: none;
        `;

        // Counter
        const counter = document.createElement('div');
        counter.id = 'slideshow-counter';
        counter.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            color: #fff;
            font-size: 18px;
            font-family: Arial, sans-serif;
            z-index: 10001;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 4px;
        `;
        overlay.appendChild(counter);

        // Toolbar container
        const toolbar = document.createElement('div');
        toolbar.id = 'slideshow-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            gap: 10px;
        `;

        // Google Image Search button
        const googleBtn = document.createElement('div');
        googleBtn.id = 'slideshow-google';
        googleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><text x="11" y="14" font-size="8" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>`;
        googleBtn.title = 'Search on Google Images';
        googleBtn.style.cssText = `
            color: white;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        googleBtn.addEventListener('mouseenter', () => {
            googleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        googleBtn.addEventListener('mouseleave', () => {
            googleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        googleBtn.addEventListener('click', () => searchOnGoogle());
        toolbar.appendChild(googleBtn);

        // Bing Image Search button
        const bingBtn = document.createElement('div');
        bingBtn.id = 'slideshow-bing';
        bingBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><text x="11" y="14" font-size="8" fill="white" text-anchor="middle" font-weight="bold">B</text></svg>`;
        bingBtn.title = 'Search on Bing Images';
        bingBtn.style.cssText = `
            color: white;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        bingBtn.addEventListener('mouseenter', () => {
            bingBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        bingBtn.addEventListener('mouseleave', () => {
            bingBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        bingBtn.addEventListener('click', () => searchOnBing());
        toolbar.appendChild(bingBtn);

        // Yandex Image Search button
        const yandexBtn = document.createElement('div');
        yandexBtn.id = 'slideshow-yandex';
        yandexBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        yandexBtn.title = 'Search on Yandex Images';
        yandexBtn.style.cssText = `
            color: white;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        yandexBtn.addEventListener('mouseenter', () => {
            yandexBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        yandexBtn.addEventListener('mouseleave', () => {
            yandexBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        yandexBtn.addEventListener('click', () => searchOnYandex());
        toolbar.appendChild(yandexBtn);

        // Close button
        const closeBtn = document.createElement('div');
        closeBtn.id = 'slideshow-close';
        closeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        closeBtn.title = 'Close slideshow';
        closeBtn.style.cssText = `
            color: white;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        closeBtn.addEventListener('click', closeSlideshow);
        toolbar.appendChild(closeBtn);

        overlay.appendChild(toolbar);

        // Image container
        const imgContainer = document.createElement('div');
        imgContainer.id = 'slideshow-image-container';
        imgContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        `;

        const img = document.createElement('img');
        img.id = 'slideshow-image';
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
        `;
        imgContainer.appendChild(img);
        overlay.appendChild(imgContainer);

        document.body.appendChild(overlay);
    }

    // Update displayed image
    function updateImage() {
        const img = document.getElementById('slideshow-image');
        const counter = document.getElementById('slideshow-counter');

        if (aImages.length === 0) return;

        img.src = aImages[currentIndex];
        counter.textContent = `${currentIndex + 1} / ${aImages.length}`;
    }

    // Navigate to next image
    function nextImage() {
        currentIndex = (currentIndex + 1) % aImages.length;
        updateImage();
    }

    // Navigate to previous image
    function previousImage() {
        currentIndex = (currentIndex - 1 + aImages.length) % aImages.length;
        updateImage();
    }

    // Navigate to first image
    function firstImage() {
        currentIndex = 0;
        updateImage();
    }

    // Navigate to last image
    function lastImage() {
        currentIndex = aImages.length - 1;
        updateImage();
    }

    // Open slideshow
    function openSlideshow() {
        aImages = getPostImages();

        if (aImages.length === 0) {
            alert('No images found in this thread');
            return;
        }

        currentIndex = 0;
        bIsOpen = true;

        const overlay = document.getElementById('slideshow-overlay');
        overlay.style.display = 'block';

        updateImage();
        preloadImages();

        // Prevent scrolling
        document.body.style.overflow = 'hidden';
    }

    // Close slideshow
    function closeSlideshow() {
        bIsOpen = false;
        const overlay = document.getElementById('slideshow-overlay');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Search on Google Images
    function searchOnGoogle() {
        if (aImages.length === 0) return;
        const imageUrl = aImages[currentIndex];
        const searchUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
        window.open(searchUrl, '_blank');
    }

    // Search on Bing Images
    function searchOnBing() {
        if (aImages.length === 0) return;
        const imageUrl = aImages[currentIndex];
        const searchUrl = `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIDP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`;
        window.open(searchUrl, '_blank');
    }

    // Search on Yandex Images
    function searchOnYandex() {
        if (aImages.length === 0) return;
        const imageUrl = aImages[currentIndex];
        const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
        window.open(searchUrl, '_blank');
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!bIsOpen) return;

        switch(e.key) {
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                nextImage();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousImage();
                break;
            case 'Home':
                e.preventDefault();
                firstImage();
                break;
            case 'End':
                e.preventDefault();
                lastImage();
                break;
            case 'Escape':
                e.preventDefault();
                closeSlideshow();
                break;
        }
    });

    // Mouse wheel navigation
    document.addEventListener('wheel', (e) => {
        if (!bIsOpen) return;

        e.preventDefault();

        if (e.deltaY > 0) {
            nextImage();
        } else if (e.deltaY < 0) {
            previousImage();
        }
    }, { passive: false });

    // Initialise
    createSlideshowButton();
    createSlideshowOverlay();

})();