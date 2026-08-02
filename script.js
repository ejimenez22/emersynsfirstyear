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

const backgroundMusic = document.getElementById("backgroundMusic");


/* ---------------------------------------
   FILM SETTINGS
--------------------------------------- */

const SONG_DURATION = 219;

const NORMAL_MUSIC_VOLUME = 0.78;
const VIDEO_MUSIC_VOLUME = 0.16;

const OPENING_BLACK_TIME = 2.6;
const DEDICATION_LINE_TIME = 2.5;
const DEDICATION_FADE_GAP = 0.8;

const REGULAR_VIDEO_MAX = 6;
const CAKE_VIDEO_DURATION = 9;

const FINAL_PHOTO_MINIMUM = 9;

const MIN_PHOTO_DURATION = 1.15;
const MAX_PHOTO_DURATION = 2.75;


let timeline = [];
let currentIndex = 0;

let currentTimeout = null;
let videoTimeout = null;

let filmRunning = false;
let endingStarted = false;

let activePhotoLayer = photoLayerOne;
let inactivePhotoLayer = photoLayerTwo;

let firstPhotoShown = false;
let finalPhotoSource = "";


/* ---------------------------------------
   INITIALIZE
--------------------------------------- */

initialize();

function initialize() {
    buildTimeline();

    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    beginButton.addEventListener("click", beginFilm);
    replayButton.addEventListener("click", replayFilm);

    videoLayer.addEventListener("ended", finishVideo);
    videoLayer.addEventListener("error", handleVideoError);

    backgroundMusic.addEventListener("ended", finishMainFilm);
}


/* ---------------------------------------
   BUILD TIMELINE
--------------------------------------- */

function buildTimeline() {
    timeline = [];

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

    replayBackground.style.backgroundImage =
        finalPhotoSource
            ? `url("${encodeURI(finalPhotoSource)}")`
            : "none";

    const allRegularPhotos = [
        ...birthPhotos,
        ...comingHomePhotos,
        ...newbornPhotos,
        ...growingPhotos
    ];

    const regularVideoCount =
        birthVideos.length +
        comingHomeVideos.length +
        growingVideos.length;

    const openingDuration =
        OPENING_BLACK_TIME +
        (DEDICATION_LINE_TIME * 2) +
        (DEDICATION_FADE_GAP * 3);

    const regularVideoBudget =
        regularVideoCount * REGULAR_VIDEO_MAX;

    const finaleVideoBudget =
        cakeVideo ? CAKE_VIDEO_DURATION : 0;

    const reservedDuration =
        openingDuration +
        regularVideoBudget +
        finaleVideoBudget +
        FINAL_PHOTO_MINIMUM;

    const remainingPhotoTime = Math.max(
        allRegularPhotos.length * MIN_PHOTO_DURATION,
        SONG_DURATION - reservedDuration
    );

    const calculatedPhotoDuration =
        allRegularPhotos.length
            ? remainingPhotoTime / allRegularPhotos.length
            : MIN_PHOTO_DURATION;

    const photoDuration = clamp(
        calculatedPhotoDuration,
        MIN_PHOTO_DURATION,
        MAX_PHOTO_DURATION
    );

    appendMediaGroup(
        birthPhotos,
        birthVideos,
        photoDuration
    );

    appendMediaGroup(
        comingHomePhotos,
        comingHomeVideos,
        photoDuration
    );

    appendMediaGroup(
        newbornPhotos,
        [],
        photoDuration
    );

    appendMediaGroup(
        growingPhotos,
        growingVideos,
        photoDuration
    );

    if (cakeVideo) {
        timeline.push({
            type: "video",
            src: cakeVideo,
            duration: CAKE_VIDEO_DURATION,
            cakeVideo: true
        });
    }

    if (finalPhotoSource) {
        timeline.push({
            type: "image",
            src: finalPhotoSource,
            duration: FINAL_PHOTO_MINIMUM,
            finalPhoto: true
        });
    }

    console.log({
        photoDuration,
        timelineItems: timeline.length,
        regularVideoCount,
        finalPhotoSource
    });
}


function appendMediaGroup(
    photos,
    videos,
    photoDuration
) {
    if (!photos.length && !videos.length) {
        return;
    }

    const videoPositions = calculateVideoPositions(
        photos.length,
        videos.length
    );

    let videoIndex = 0;

    photos.forEach((photo, photoIndex) => {
        timeline.push({
            type: "image",
            src: photo,
            duration: photoDuration
        });

        while (
            videoIndex < videos.length &&
            videoPositions[videoIndex] === photoIndex
        ) {
            timeline.push({
                type: "video",
                src: videos[videoIndex],
                duration: REGULAR_VIDEO_MAX
            });

            videoIndex += 1;
        }
    });

    while (videoIndex < videos.length) {
        timeline.push({
            type: "video",
            src: videos[videoIndex],
            duration: REGULAR_VIDEO_MAX
        });

        videoIndex += 1;
    }
}


function calculateVideoPositions(
    photoCount,
    videoCount
) {
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


function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}


/* ---------------------------------------
   START
--------------------------------------- */

async function beginFilm() {
    if (filmRunning) {
        return;
    }

    resetFilm();

    filmRunning = true;

    switchScreen(openingScreen, filmScreen);

    try {
        backgroundMusic.currentTime = 0;
        backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

        await backgroundMusic.play();
    } catch (error) {
        console.warn("Music could not begin:", error);
    }

    requestFullscreenSafely();

    currentTimeout = window.setTimeout(
        playDedication,
        OPENING_BLACK_TIME * 1000
    );
}


function playDedication() {
    dedicationLineOne.classList.add("visible");

    currentTimeout = window.setTimeout(() => {
        dedicationLineOne.classList.remove("visible");

        currentTimeout = window.setTimeout(() => {
            dedicationLineTwo.classList.add("visible");

            currentTimeout = window.setTimeout(() => {
                dedicationLineTwo.classList.remove("visible");

                currentTimeout = window.setTimeout(() => {
                    dedicationScene.classList.add("hidden");
                    playCurrentItem();
                }, DEDICATION_FADE_GAP * 1000);

            }, DEDICATION_LINE_TIME * 1000);

        }, DEDICATION_FADE_GAP * 1000);

    }, DEDICATION_LINE_TIME * 1000);
}


/* ---------------------------------------
   PLAYER
--------------------------------------- */

function playCurrentItem() {
    clearTimeout(currentTimeout);

    const item = timeline[currentIndex];

    if (!item) {
        holdUntilSongEnds();
        return;
    }

    if (item.type === "image") {
        showImage(item);
        return;
    }

    if (item.type === "video") {
        showVideo(item);
        return;
    }

    moveNext();
}


function showImage(item) {
    stopVideo();
    restoreMusicVolume();

    inactivePhotoLayer.onload = null;
    inactivePhotoLayer.onerror = null;

    inactivePhotoLayer.className = "photo-layer";
    inactivePhotoLayer.src = item.src;

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

        if (item.finalPhoto) {
            holdFinalPhotoUntilSongEnds();
            return;
        }

        currentTimeout = window.setTimeout(
            moveNext,
            item.duration * 1000
        );
    };

    inactivePhotoLayer.onerror = () => {
        console.warn("Image could not load:", item.src);
        moveNext();
    };
}


function showVideo(item) {
    clearTimeout(currentTimeout);
    clearTimeout(videoTimeout);

    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");

    videoLayer.pause();
    videoLayer.src = item.src;
    videoLayer.currentTime = 0;
    videoLayer.muted = false;

    backgroundMusic.volume = VIDEO_MUSIC_VOLUME;

    videoLayer.classList.add("visible");

    videoLayer.play().then(() => {
        videoTimeout = window.setTimeout(
            finishVideo,
            item.duration * 1000
        );
    }).catch((error) => {
        console.warn("Video could not play:", error);
        handleVideoError();
    });
}


function finishVideo() {
    clearTimeout(videoTimeout);

    videoLayer.classList.remove("visible");

    window.setTimeout(() => {
        stopVideo();
        restoreMusicVolume();
        moveNext();
    }, 450);
}


function handleVideoError() {
    stopVideo();
    restoreMusicVolume();
    moveNext();
}


function moveNext() {
    clearTimeout(currentTimeout);
    clearTimeout(videoTimeout);

    currentIndex += 1;
    playCurrentItem();
}


/* ---------------------------------------
   FINAL PHOTO / SONG END
--------------------------------------- */

function holdFinalPhotoUntilSongEnds() {
    restoreMusicVolume();

    const remainingMusic =
        Math.max(
            0,
            backgroundMusic.duration -
            backgroundMusic.currentTime
        );

    if (
        Number.isFinite(remainingMusic) &&
        remainingMusic > 0
    ) {
        currentTimeout = window.setTimeout(
            finishMainFilm,
            remainingMusic * 1000
        );
    }
}


function holdUntilSongEnds() {
    if (backgroundMusic.ended || backgroundMusic.paused) {
        finishMainFilm();
    }
}


function finishMainFilm() {
    if (!filmRunning || endingStarted) {
        return;
    }

    endingStarted = true;
    filmRunning = false;

    clearAllTimers();
    stopVideo();

    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");
    blurredBackground.classList.remove("visible");

    window.setTimeout(() => {
        switchScreen(filmScreen, endingScreen);

        window.setTimeout(
            playEndingMessage,
            1000
        );
    }, 1100);
}


/* ---------------------------------------
   ENDING MESSAGE
--------------------------------------- */

function playEndingMessage() {
    endingIntro.classList.add("visible");

    window.setTimeout(() => {
        endingName.classList.add("visible");
    }, 1100);

    window.setTimeout(() => {
        endingMessage.classList.add("visible");
    }, 2600);

    window.setTimeout(() => {
        endingLove.classList.add("visible");
    }, 4300);

    window.setTimeout(() => {
        endingText.style.opacity = "0";

        window.setTimeout(() => {
            endingText.style.display = "none";
            replayScene.classList.add("visible");
        }, 1500);

    }, 8500);
}


/* ---------------------------------------
   REPLAY
--------------------------------------- */

function replayFilm() {
    resetFilm();

    replayScene.classList.remove("visible");
    endingText.style.display = "block";
    endingText.style.opacity = "1";

    switchScreen(endingScreen, filmScreen);

    filmRunning = true;

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    backgroundMusic.play().catch((error) => {
        console.warn("Music could not restart:", error);
    });

    currentTimeout = window.setTimeout(
        playDedication,
        OPENING_BLACK_TIME * 1000
    );
}


/* ---------------------------------------
   HELPERS
--------------------------------------- */

function resetFilm() {
    clearAllTimers();

    currentIndex = 0;
    filmRunning = false;
    endingStarted = false;
    firstPhotoShown = false;

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
    clearTimeout(videoTimeout);

    videoLayer.pause();
    videoLayer.classList.remove("visible");

    if (videoLayer.getAttribute("src")) {
        videoLayer.removeAttribute("src");
        videoLayer.load();
    }
}


function restoreMusicVolume() {
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;
}


function setBlurredBackground(src) {
    blurredBackground.classList.remove("visible");

    window.setTimeout(() => {
        blurredBackground.style.backgroundImage =
            `url("${encodeURI(src)}")`;

        blurredBackground.classList.add("visible");
    }, 80);
}


function applyRandomMotion(element) {
    const motions = [
        "motion-one",
        "motion-two",
        "motion-three",
        "motion-four"
    ];

    const selected =
        motions[
            Math.floor(
                Math.random() * motions.length
            )
        ];

    element.classList.add(selected);
}


function swapPhotoLayers() {
    const oldActive = activePhotoLayer;

    activePhotoLayer = inactivePhotoLayer;
    inactivePhotoLayer = oldActive;
}


function clearAllTimers() {
    clearTimeout(currentTimeout);
    clearTimeout(videoTimeout);
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
    }, 850);
}