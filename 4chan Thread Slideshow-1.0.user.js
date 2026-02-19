// ==UserScript==
// @name         _4chan Thread Slideshow
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add slideshow functionality to 4chan threads and 4archive
// @author       You
// @match        https://boards.4chan.org/*/thread/*
// @match        https://4archive.org/board/*/thread/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let currentIndex = 0;
    let aImages = [];
    let bIsOpen = false;
    let aPreloadedImages = [];

    // Detect current site
    const bIs4archive = window.location.hostname === '4archive.org';

    // Create slideshow button
    function createSlideshowButton() {
        let oAnchor = null;

        if (bIs4archive) {
            const oWrapper = document.createElement('div');
            oWrapper.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            `;

            oAnchor = document.createElement('a');
            oAnchor.href = '#';
            oWrapper.appendChild(oAnchor);
            document.body.appendChild(oWrapper);
        } else {
            const oNavLinks = document.querySelector('.navLinks.desktop');
            if (!oNavLinks) return;

            oAnchor = document.createElement('a');
            oNavLinks.insertBefore(oAnchor, oNavLinks.firstChild);
        }

        oAnchor.id = 'slideshow-btn';
        oAnchor.href = '#';
        oAnchor.style.cssText = `
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

        oAnchor.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            Slideshow
        `;

        oAnchor.addEventListener('mouseenter', () => {
            oAnchor.style.transform = 'translateY(-2px)';
            oAnchor.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });

        oAnchor.addEventListener('mouseleave', () => {
            oAnchor.style.transform = 'translateY(0)';
            oAnchor.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        });

        oAnchor.addEventListener('click', (e) => {
            e.preventDefault();
            openSlideshow();
        });
    }

    // Get all images from posts
    function getPostImages() {
        const aResult = [];

        if (bIs4archive) {
            // Target only the direct first <a> child of .fileText — this is the raw image link.
            // All subsequent links (Google, Yandex, Bing, ArchivedMoe) are siblings, not direct > a children at position 1.
            document.querySelectorAll('.file .fileText > a:first-of-type').forEach(oLink => {
                const url = oLink.href;
                if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)) {
                    aResult.push(url);
                }
            });
        } else {
            // 4chan original logic
            document.querySelectorAll('.post').forEach(oPost => {
                const oFileTextLink = oPost.querySelector('.fileText a');
                if (oFileTextLink) {
                    const url = oFileTextLink.href;
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
                        aResult.push(url);
                    }
                }
            });
        }

        // Deduplicate
        return [...new Set(aResult)];
    }

    // Preload all images
    function preloadImages() {
        aPreloadedImages = [];
        let loadedCount = 0;

        aImages.forEach((url, index) => {
            const oImg = new Image();
            oImg.onload = () => {
                loadedCount++;
                if (loadedCount === aImages.length) {
                    showToast('All images preloaded');
                }
            };
            oImg.src = url;
            aPreloadedImages[index] = oImg;
        });
    }

    // Show toast notification
    function showToast(message) {
        const oToast = document.createElement('div');
        oToast.textContent = message;
        oToast.style.cssText = `
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
        document.body.appendChild(oToast);
        setTimeout(() => oToast.remove(), 2000);
    }

    /**
     * Update the image info overlay (bottom-right):
     * megapixels, resolution, file size fetched via HEAD request.
     */
    function updateImageInfo() {
        const oInfo = document.getElementById('slideshow-info');
        if (!oInfo) return;

        if (aImages.length === 0) {
            oInfo.textContent = '';
            return;
        }

        const url = aImages[currentIndex];
        const oDisplayedImg = document.getElementById('slideshow-image');

        oInfo.textContent = 'Loading…';

        fetch(url, { method: 'HEAD' })
            .then(response => {
                const contentLength = response.headers.get('Content-Length');
                const fileSize = contentLength ? formatFileSize(parseInt(contentLength, 10)) : null;

                function displayInfo() {
                    const width = oDisplayedImg.naturalWidth;
                    const height = oDisplayedImg.naturalHeight;
                    const mp = width && height ? ((width * height) / 1_000_000).toFixed(1) + ' MP' : '? MP';
                    const resolution = width && height ? `${width}×${height}px` : '?×?px';
                    const size = fileSize || '?';
                    oInfo.textContent = `${mp} — ${resolution} — ${size}`;
                }

                if (oDisplayedImg.complete && oDisplayedImg.naturalWidth > 0) {
                    displayInfo();
                } else {
                    oDisplayedImg.addEventListener('load', displayInfo, { once: true });
                }
            })
            .catch(() => {
                // Fallback: show only resolution from the loaded image
                function displayResolutionOnly() {
                    const width = oDisplayedImg.naturalWidth;
                    const height = oDisplayedImg.naturalHeight;
                    if (width && height) {
                        const mp = ((width * height) / 1_000_000).toFixed(1);
                        oInfo.textContent = `${mp} MP — ${width}×${height}px`;
                    } else {
                        oInfo.textContent = '';
                    }
                }
                if (oDisplayedImg.complete && oDisplayedImg.naturalWidth > 0) {
                    displayResolutionOnly();
                } else {
                    oDisplayedImg.addEventListener('load', displayResolutionOnly, { once: true });
                }
            });
    }

    /**
     * Format bytes to human-readable file size
     */
    function formatFileSize(bytes) {
        if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB';
        if (bytes >= 1_024) return Math.round(bytes / 1_024) + ' KB';
        return bytes + ' B';
    }

    /**
     * Save the current image to the default downloads folder.
     * Automatically advances to the next image after saving.
     */
    function saveCurrentImage() {
        if (aImages.length === 0) return;

        const url = aImages[currentIndex];
        const filename = url.split('/').pop().split('?')[0] || `image_${currentIndex + 1}.jpg`;

        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const oLink = document.createElement('a');
                oLink.href = objectUrl;
                oLink.download = filename;
                oLink.style.display = 'none';
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(objectUrl);
                showToast(`Saved: ${filename}`);
                nextImage();
            })
            .catch(() => {
                const oLink = document.createElement('a');
                oLink.href = url;
                oLink.download = filename;
                oLink.target = '_blank';
                oLink.style.display = 'none';
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                showToast(`Saved: ${filename}`);
                nextImage();
            });
    }

    // Create slideshow overlay
    function createSlideshowOverlay() {
        const oOverlay = document.createElement('div');
        oOverlay.id = 'slideshow-overlay';
        oOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            z-index: 10000;
            display: none;
        `;

        // Counter (top-left)
        const oCounter = document.createElement('div');
        oCounter.id = 'slideshow-counter';
        oCounter.style.cssText = `
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
        oOverlay.appendChild(oCounter);

        // Image info (bottom-right)
        const oInfo = document.createElement('div');
        oInfo.id = 'slideshow-info';
        oInfo.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: #fff;
            font-size: 14px;
            font-family: Arial, sans-serif;
            z-index: 10001;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 4px;
            pointer-events: none;
        `;
        oOverlay.appendChild(oInfo);

        // Toolbar (top-right)
        const oToolbar = document.createElement('div');
        oToolbar.id = 'slideshow-toolbar';
        oToolbar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            gap: 10px;
        `;

        const buttonCssBase = `
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

        function createToolbarButton(id, svgContent, title, onClick) {
            const oBtn = document.createElement('div');
            oBtn.id = id;
            oBtn.innerHTML = svgContent;
            oBtn.title = title;
            oBtn.style.cssText = buttonCssBase;
            oBtn.addEventListener('mouseenter', () => { oBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; });
            oBtn.addEventListener('mouseleave', () => { oBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; });
            oBtn.addEventListener('click', onClick);
            return oBtn;
        }

        oToolbar.appendChild(createToolbarButton(
            'slideshow-save',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
            'Save image (Ctrl+↓)',
            () => saveCurrentImage()
        ));

        oToolbar.appendChild(createToolbarButton(
            'slideshow-google',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><text x="11" y="14" font-size="8" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>`,
            'Search on Google Images',
            () => searchOnGoogle()
        ));

        oToolbar.appendChild(createToolbarButton(
            'slideshow-bing',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><text x="11" y="14" font-size="8" fill="white" text-anchor="middle" font-weight="bold">B</text></svg>`,
            'Search on Bing Images',
            () => searchOnBing()
        ));

        oToolbar.appendChild(createToolbarButton(
            'slideshow-yandex',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
            'Search on Yandex Images',
            () => searchOnYandex()
        ));

        oToolbar.appendChild(createToolbarButton(
            'slideshow-close',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
            'Close slideshow',
            closeSlideshow
        ));

        oOverlay.appendChild(oToolbar);

        // Image container
        const oImgContainer = document.createElement('div');
        oImgContainer.id = 'slideshow-image-container';
        oImgContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        `;

        const oImg = document.createElement('img');
        oImg.id = 'slideshow-image';
        oImg.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
        `;
        oImgContainer.appendChild(oImg);
        oOverlay.appendChild(oImgContainer);

        document.body.appendChild(oOverlay);
    }

    // Update displayed image
    function updateImage() {
        const oImg = document.getElementById('slideshow-image');
        const oCounter = document.getElementById('slideshow-counter');

        if (aImages.length === 0) return;

        oImg.src = aImages[currentIndex];
        oCounter.textContent = `${currentIndex + 1} / ${aImages.length}`;
        updateImageInfo();
    }

    function nextImage() {
        currentIndex = (currentIndex + 1) % aImages.length;
        updateImage();
    }

    function previousImage() {
        currentIndex = (currentIndex - 1 + aImages.length) % aImages.length;
        updateImage();
    }

    function firstImage() {
        currentIndex = 0;
        updateImage();
    }

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

        const oOverlay = document.getElementById('slideshow-overlay');
        oOverlay.style.display = 'block';

        updateImage();
        preloadImages();

        document.body.style.overflow = 'hidden';
    }

    // Close slideshow
    function closeSlideshow() {
        bIsOpen = false;
        const oOverlay = document.getElementById('slideshow-overlay');
        oOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function searchOnGoogle() {
        if (aImages.length === 0) return;
        window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(aImages[currentIndex])}`, '_blank');
    }

    function searchOnBing() {
        if (aImages.length === 0) return;
        window.open(`https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIDP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(aImages[currentIndex])}`, '_blank');
    }

    function searchOnYandex() {
        if (aImages.length === 0) return;
        window.open(`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(aImages[currentIndex])}`, '_blank');
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!bIsOpen) return;

        if (e.ctrlKey && e.key === 'ArrowDown') {
            e.preventDefault();
            saveCurrentImage();
            return;
        }

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
