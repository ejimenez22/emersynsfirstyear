const openingScreen = document.getElementById("openingScreen");
const filmScreen = document.getElementById("filmScreen");
const endingScreen = document.getElementById("endingScreen");

const blurredBackground = document.getElementById("blurredBackground");

const photoLayerOne = document.getElementById("photoLayerOne");
const photoLayerTwo = document.getElementById("photoLayerTwo");
const videoLayer = document.getElementById("videoLayer");

const dedicationScene = document.getElementById("dedicationScene");
const dedicationLineOne = document.getElementById("dedicationLineOne");
const dedicationLineTwo = document.getElementById("dedicationLineTwo");

const endingText = document.getElementById("endingText");
const endingIntro = document.querySelector(".ending-intro");
const endingName = document.querySelector(".ending-text h2");
const endingMessage = document.querySelector(".ending-message");
const endingLove = document.querySelector(".ending-love");

const replayScene = document.getElementById("replayScene");
const replayBackground = document.getElementById("replayBackground");

const beginButton = document.getElementById("beginButton");
const replayButton = document.getElementById("replayButton");

const loadingArea = document.querySelector(".loading-area");
const loadingStatus = document.getElementById("loadingStatus");
const loadingBar = document.getElementById("loadingBar");

const backgroundMusic = document.getElementById("backgroundMusic");

/* --------------------------------------------------
   FILM SETTINGS
-------------------------------------------------- */

const FALLBACK_SONG_DURATION = 219;

const NORMAL_MUSIC_VOLUME = 0.78;
const VIDEO_MUSIC_VOLUME = 0.14;

const OPENING_BLACK_TIME = 2.6;
const DEDICATION_LINE_TIME = 2.5;
const DEDICATION_GAP = 0.8;

const REGULAR_VIDEO_DURATION = 6;
const CAKE_VIDEO_DURATION = 9;
const FINAL_PHOTO_DURATION = 14;

const PRELOAD_CONCURRENCY = 4;
const VIDEO_SYNC_TOLERANCE = 0.25;

/* --------------------------------------------------
   STATE
-------------------------------------------------- */

let assetsReady = false;
let loadingInProgress = false;

let filmRunning = false;
let endingStarted = false;
let firstPhotoShown = false;

let songDuration = FALLBACK_SONG_DURATION;

let schedule = [];
let activeScheduleIndex = -1;

let animationFrameId = null;
let currentTimeout = null;

let activePhotoLayer = photoLayerOne;
let inactivePhotoLayer = photoLayerTwo;

let finalPhotoSource = "";

const assetUrls = new Map();

/* --------------------------------------------------
   INITIALIZE
-------------------------------------------------- */

initialize();

function initialize() {
    beginButton.addEventListener("click", handleBeginButton);
    replayButton.addEventListener("click", replayFilm);

    backgroundMusic.addEventListener("ended", finishMainFilm);

    preloadAllAssets();
}

/* --------------------------------------------------
   MEDIA COLLECTION
-------------------------------------------------- */

function getAllPhotos() {
    return [
        ...(mediaLibrary.photos.birth || []),
        ...(mediaLibrary.photos.comingHome || []),
        ...(mediaLibrary.photos.newbornDays || []),
        ...(mediaLibrary.photos.growingUp || []),
        ...(mediaLibrary.photos.ending || [])
    ];
}

function getAllVideos() {
    return [
        ...(mediaLibrary.videos.birth || []),
        ...(mediaLibrary.videos.comingHome || []),
        ...(mediaLibrary.videos.growingUp || [])
    ];
}

/* --------------------------------------------------
   PRELOADING
-------------------------------------------------- */

async function preloadAllAssets() {
    if (loadingInProgress) {
        return;
    }

    loadingInProgress = true;
    assetsReady = false;

    beginButton.disabled = true;
    beginButton.textContent = "Loading...";

    loadingArea.classList.remove("hidden");
    loadingStatus.textContent = "Preparing your memories...";
    loadingBar.style.width = "0%";

    const songSource = backgroundMusic.dataset.src;

 const assets = [
    {
        src: songSource,
        kind: "audio"
    },

    ...getAllPhotos().map((src) => ({
        src,
        kind: "image"
    }))
];

    let completed = 0;

    const updateProgress = () => {
        completed += 1;

        const percent = Math.round(
            (completed / assets.length) * 100
        );

        loadingBar.style.width = `${percent}%`;
        loadingStatus.textContent =
            `Preparing your memories... ${percent}%`;
    };

    try {
        await runWithConcurrency(
            assets,
            PRELOAD_CONCURRENCY,
            async (asset) => {
                const response = await fetch(
                    encodeURI(asset.src),
                    {
                        cache: "force-cache"
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Could not load ${asset.src} (${response.status})`
                    );
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);

                assetUrls.set(asset.src, objectUrl);

                updateProgress();
            }
        );

        backgroundMusic.src = getAssetUrl(songSource);
        backgroundMusic.load();

        await waitForMetadata(backgroundMusic);

        if (
            Number.isFinite(backgroundMusic.duration) &&
            backgroundMusic.duration > 0
        ) {
            songDuration = backgroundMusic.duration;
        }

        buildSchedule();

        assetsReady = true;
        loadingInProgress = false;

        loadingStatus.textContent = "Ready";
        loadingBar.style.width = "100%";

        window.setTimeout(() => {
            loadingArea.classList.add("hidden");
        }, 500);

        beginButton.disabled = false;
        beginButton.textContent = "Begin";
    } catch (error) {
        console.error(error);

        loadingInProgress = false;
        assetsReady = false;

        loadingStatus.textContent =
            "Some memories could not be loaded.";

        beginButton.disabled = false;
        beginButton.textContent = "Retry";
    }
}

async function runWithConcurrency(
    items,
    concurrency,
    worker
) {
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const itemIndex = nextIndex;
            nextIndex += 1;

            await worker(items[itemIndex]);
        }
    }

    const workers = Array.from(
        {
            length: Math.min(concurrency, items.length)
        },
        runWorker
    );

    await Promise.all(workers);
}

function waitForMetadata(mediaElement) {
    return new Promise((resolve, reject) => {
        if (
            mediaElement.readyState >= 1 &&
            Number.isFinite(mediaElement.duration)
        ) {
            resolve();
            return;
        }

        const handleLoaded = () => {
            cleanup();
            resolve();
        };

        const handleError = () => {
            cleanup();
            reject(
                new Error("The song metadata could not be loaded.")
            );
        };

        const cleanup = () => {
            mediaElement.removeEventListener(
                "loadedmetadata",
                handleLoaded
            );

            mediaElement.removeEventListener(
                "error",
                handleError
            );
        };

        mediaElement.addEventListener(
            "loadedmetadata",
            handleLoaded,
            {
                once: true
            }
        );

        mediaElement.addEventListener(
            "error",
            handleError,
            {
                once: true
            }
        );
    });
}

function getAssetUrl(originalSource) {
    return assetUrls.get(originalSource) || originalSource;
}

/* --------------------------------------------------
   BUILD AUDIO-CLOCK SCHEDULE
-------------------------------------------------- */

function buildSchedule() {
    schedule = [];

    const birthPhotos = mediaLibrary.photos.birth || [];
    const birthVideos = mediaLibrary.videos.birth || [];

    const comingHomePhotos =
        mediaLibrary.photos.comingHome || [];

    const comingHomeVideos =
        mediaLibrary.videos.comingHome || [];

    const newbornPhotos =
        mediaLibrary.photos.newbornDays || [];

    const growingPhotos =
        mediaLibrary.photos.growingUp || [];

    const growingVideos = [
        ...(mediaLibrary.videos.growingUp || [])
    ];

    const endingPhotos =
        mediaLibrary.photos.ending || [];

    const cakeVideo = growingVideos.pop();

    finalPhotoSource =
        endingPhotos[endingPhotos.length - 1] || "";

    if (finalPhotoSource) {
        replayBackground.style.backgroundImage =
            `url("${getAssetUrl(finalPhotoSource)}")`;
    }

    const regularSequence = [];

    appendMediaGroup(
        regularSequence,
        birthPhotos,
        birthVideos
    );

    appendMediaGroup(
        regularSequence,
        comingHomePhotos,
        comingHomeVideos
    );

    appendMediaGroup(
        regularSequence,
        newbornPhotos,
        []
    );

    appendMediaGroup(
        regularSequence,
        growingPhotos,
        growingVideos
    );

    const openingDuration =
        OPENING_BLACK_TIME +
        DEDICATION_LINE_TIME +
        DEDICATION_GAP +
        DEDICATION_LINE_TIME +
        DEDICATION_GAP;

    const regularPhotoCount = regularSequence.filter(
        (item) => item.type === "image"
    ).length;

    const regularVideoCount = regularSequence.filter(
        (item) => item.type === "video"
    ).length;

    const regularVideoBudget =
        regularVideoCount * REGULAR_VIDEO_DURATION;

    const cakeBudget = cakeVideo
        ? CAKE_VIDEO_DURATION
        : 0;

    const availablePhotoTime =
        songDuration -
        openingDuration -
        regularVideoBudget -
        cakeBudget -
        FINAL_PHOTO_DURATION;

    const regularPhotoDuration =
        regularPhotoCount > 0
            ? Math.max(
                0.8,
                availablePhotoTime / regularPhotoCount
            )
            : 0;

    let cursor = openingDuration;

    regularSequence.forEach((item) => {
        const duration =
            item.type === "video"
                ? REGULAR_VIDEO_DURATION
                : regularPhotoDuration;

        schedule.push({
            ...item,
            start: cursor,
            end: cursor + duration,
            duration
        });

        cursor += duration;
    });

    if (cakeVideo) {
        schedule.push({
            type: "video",
            src: cakeVideo,
            cakeVideo: true,
            start: cursor,
            end: cursor + CAKE_VIDEO_DURATION,
            duration: CAKE_VIDEO_DURATION
        });

        cursor += CAKE_VIDEO_DURATION;
    }

    if (finalPhotoSource) {
        schedule.push({
            type: "image",
            src: finalPhotoSource,
            finalPhoto: true,
            start: cursor,
            end: songDuration,
            duration: Math.max(
                0,
                songDuration - cursor
            )
        });
    }

    console.log({
        songDuration,
        openingDuration,
        regularPhotoDuration,
        regularVideoCount,
        schedule
    });
}

function appendMediaGroup(target, photos, videos) {
    if (!photos.length && !videos.length) {
        return;
    }

    const videoPositions = calculateVideoPositions(
        photos.length,
        videos.length
    );

    let videoIndex = 0;

    photos.forEach((photoSource, photoIndex) => {
        target.push({
            type: "image",
            src: photoSource
        });

        while (
            videoIndex < videos.length &&
            videoPositions[videoIndex] === photoIndex
        ) {
            target.push({
                type: "video",
                src: videos[videoIndex]
            });

            videoIndex += 1;
        }
    });

    while (videoIndex < videos.length) {
        target.push({
            type: "video",
            src: videos[videoIndex]
        });

        videoIndex += 1;
    }
}

function calculateVideoPositions(photoCount, videoCount) {
    if (!videoCount) {
        return [];
    }

    if (!photoCount) {
        return Array(videoCount).fill(0);
    }

    const positions = [];

    for (
        let index = 1;
        index <= videoCount;
        index += 1
    ) {
        positions.push(
            Math.min(
                photoCount - 1,
                Math.floor(
                    (index * photoCount) /
                    (videoCount + 1)
                )
            )
        );
    }

    return positions;
}

/* --------------------------------------------------
   BEGIN
-------------------------------------------------- */

function handleBeginButton() {
    if (!assetsReady) {
        preloadAllAssets();
        return;
    }

    beginFilm();
}

async function beginFilm() {
    if (filmRunning) {
        return;
    }

    resetFilm();

    filmRunning = true;
    endingStarted = false;

    switchScreen(openingScreen, filmScreen);

    try {
        backgroundMusic.currentTime = 0;
        backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

        await backgroundMusic.play();
    } catch (error) {
        console.error("The song could not begin:", error);
        filmRunning = false;
        return;
    }

    requestFullscreenSafely();

    animationFrameId =
        requestAnimationFrame(updateFilmFromAudioClock);
}

/* --------------------------------------------------
   AUDIO-CLOCK PLAYER
-------------------------------------------------- */

function updateFilmFromAudioClock() {
    if (!filmRunning) {
        return;
    }

    const currentTime = backgroundMusic.currentTime;

    updateDedication(currentTime);

    const nextIndex = findScheduleIndex(currentTime);

    if (
        nextIndex !== activeScheduleIndex &&
        nextIndex >= 0
    ) {
        activeScheduleIndex = nextIndex;
        showScheduledItem(schedule[nextIndex], currentTime);
    }

    if (
        currentTime >= songDuration - 0.05 ||
        backgroundMusic.ended
    ) {
        finishMainFilm();
        return;
    }

    animationFrameId =
        requestAnimationFrame(updateFilmFromAudioClock);
}

function findScheduleIndex(currentTime) {
    for (
        let index = 0;
        index < schedule.length;
        index += 1
    ) {
        const item = schedule[index];

        if (
            currentTime >= item.start &&
            currentTime < item.end
        ) {
            return index;
        }
    }

    return -1;
}

/* --------------------------------------------------
   DEDICATION
-------------------------------------------------- */

function updateDedication(currentTime) {
    const lineOneStart = OPENING_BLACK_TIME;
    const lineOneEnd =
        lineOneStart + DEDICATION_LINE_TIME;

    const lineTwoStart =
        lineOneEnd + DEDICATION_GAP;

    const lineTwoEnd =
        lineTwoStart + DEDICATION_LINE_TIME;

    dedicationLineOne.classList.toggle(
        "visible",
        currentTime >= lineOneStart &&
        currentTime < lineOneEnd
    );

    dedicationLineTwo.classList.toggle(
        "visible",
        currentTime >= lineTwoStart &&
        currentTime < lineTwoEnd
    );

    if (currentTime >= lineTwoEnd + DEDICATION_GAP) {
        dedicationScene.classList.add("hidden");
    }
}

/* --------------------------------------------------
   DISPLAY ITEMS
-------------------------------------------------- */

function showScheduledItem(item, currentTime) {
    if (item.type === "image") {
        showImage(item);
        return;
    }

    if (item.type === "video") {
        showVideo(item, currentTime);
    }
}

function showImage(item) {
    stopVideo();
    restoreMusicVolume();

    inactivePhotoLayer.onload = null;
    inactivePhotoLayer.onerror = null;

    inactivePhotoLayer.className = "photo-layer";
    inactivePhotoLayer.src = getAssetUrl(item.src);

    if (!firstPhotoShown) {
        inactivePhotoLayer.classList.add("first-photo");
    } else if (item.finalPhoto) {
        inactivePhotoLayer.classList.add("final-photo");
    } else {
        applyRandomMotion(inactivePhotoLayer);
    }

    inactivePhotoLayer.onload = () => {
        setBlurredBackground(item.src);

        inactivePhotoLayer.classList.add("visible");
        activePhotoLayer.classList.remove("visible");

        swapPhotoLayers();
        firstPhotoShown = true;
    };

    inactivePhotoLayer.onerror = () => {
        console.error("Image could not display:", item.src);
    };
}

function showVideo(item, currentTime) {
    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");

    const expectedOffset = Math.max(
        0,
        currentTime - item.start
    );

    if (
        videoLayer.dataset.originalSource !==
        item.src
    ) {
        videoLayer.pause();

        videoLayer.src = encodeURI(item.src);
        videoLayer.dataset.originalSource = item.src;

        videoLayer.muted = true;
        videoLayer.defaultMuted = true;
        videoLayer.playsInline = true;

        videoLayer.addEventListener(
            "loadedmetadata",
            () => {
                const maximumOffset = Math.max(
                    0,
                    videoLayer.duration - 0.15
                );

                videoLayer.currentTime = Math.min(
                    expectedOffset,
                    maximumOffset
                );

                videoLayer.play().catch((error) => {
                    console.error(
                        "Video could not play:",
                        item.src,
                        error
                    );
                });
            },
            { once: true }
        );
    }

    videoLayer.classList.add("visible");
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    if (videoLayer.readyState >= 2) {
        videoLayer.play().catch((error) => {
            console.error(
                "Video could not play:",
                item.src,
                error
            );
        });
    }
}

/* --------------------------------------------------
   ENDING
-------------------------------------------------- */

function finishMainFilm() {
    if (!filmRunning || endingStarted) {
        return;
    }

    endingStarted = true;
    filmRunning = false;

    cancelAnimationFrame(animationFrameId);

    stopVideo();

    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");
    blurredBackground.classList.remove("visible");

    window.setTimeout(() => {
        switchScreen(filmScreen, endingScreen);

        window.setTimeout(
            playEndingMessage,
            900
        );
    }, 900);
}

function playEndingMessage() {
    endingIntro.classList.add("visible");

    window.setTimeout(() => {
        endingName.classList.add("visible");
    }, 1000);

    window.setTimeout(() => {
        endingMessage.classList.add("visible");
    }, 2500);

    window.setTimeout(() => {
        endingLove.classList.add("visible");
    }, 4200);

    window.setTimeout(() => {
        endingText.style.opacity = "0";

        window.setTimeout(() => {
            endingText.style.display = "none";
            replayScene.classList.add("visible");
        }, 1400);
    }, 8200);
}

/* --------------------------------------------------
   REPLAY
-------------------------------------------------- */

function replayFilm() {
    resetFilm();

    switchScreen(endingScreen, filmScreen);

    filmRunning = true;

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    backgroundMusic.play().then(() => {
        animationFrameId =
            requestAnimationFrame(
                updateFilmFromAudioClock
            );
    }).catch((error) => {
        console.error(
            "The song could not restart:",
            error
        );
    });
}

/* --------------------------------------------------
   RESET AND HELPERS
-------------------------------------------------- */

function resetFilm() {
    cancelAnimationFrame(animationFrameId);
    clearTimeout(currentTimeout);

    activeScheduleIndex = -1;
    firstPhotoShown = false;
    endingStarted = false;
    filmRunning = false;

    stopVideo();

    dedicationScene.classList.remove("hidden");
    dedicationLineOne.classList.remove("visible");
    dedicationLineTwo.classList.remove("visible");

    endingIntro.classList.remove("visible");
    endingName.classList.remove("visible");
    endingMessage.classList.remove("visible");
    endingLove.classList.remove("visible");

    endingText.style.display = "block";
    endingText.style.opacity = "1";

    replayScene.classList.remove("visible");

    photoLayerOne.className = "photo-layer";
    photoLayerTwo.className = "photo-layer";

    photoLayerOne.removeAttribute("src");
    photoLayerTwo.removeAttribute("src");

    activePhotoLayer = photoLayerOne;
    inactivePhotoLayer = photoLayerTwo;

    blurredBackground.classList.remove("visible");

    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;
}

function stopVideo() {
    videoLayer.pause();
    videoLayer.classList.remove("visible");

    videoLayer.removeAttribute("src");
    videoLayer.removeAttribute("data-original-source");
    videoLayer.load();
}

function restoreMusicVolume() {
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;
}

function setBlurredBackground(originalSource) {
    blurredBackground.style.backgroundImage =
        `url("${getAssetUrl(originalSource)}")`;

    blurredBackground.classList.add("visible");
}

function applyRandomMotion(element) {
    const motions = [
        "motion-one",
        "motion-two",
        "motion-three",
        "motion-four"
    ];

    element.classList.add(
        motions[
            Math.floor(
                Math.random() * motions.length
            )
        ]
    );
}

function swapPhotoLayers() {
    const previousActive = activePhotoLayer;

    activePhotoLayer = inactivePhotoLayer;
    inactivePhotoLayer = previousActive;
}

async function requestFullscreenSafely() {
    try {
        if (
            document.documentElement.requestFullscreen &&
            !document.fullscreenElement
        ) {
            await document.documentElement.requestFullscreen();
        }
    } catch {
        console.info(
            "Fullscreen was unavailable. The film will still fill the browser."
        );
    }
}

function switchScreen(currentScreen, nextScreen) {
    currentScreen.classList.remove("active-screen");

    window.setTimeout(() => {
        currentScreen.style.display = "none";
        nextScreen.style.display = "flex";

        requestAnimationFrame(() => {
            nextScreen.classList.add("active-screen");
        });
    }, 750);
}