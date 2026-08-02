const openingScreen = document.getElementById("openingScreen");
const filmScreen = document.getElementById("filmScreen");
const endingScreen = document.getElementById("endingScreen");

const openingBackground = document.getElementById("openingBackground");
const blurredBackground = document.getElementById("blurredBackground");

const photoLayerOne = document.getElementById("photoLayerOne");
const photoLayerTwo = document.getElementById("photoLayerTwo");
const videoLayer = document.getElementById("videoLayer");

const dedicationCard = document.getElementById("dedicationCard");
const sectionLabel = document.getElementById("sectionLabel");

const beginButton = document.getElementById("beginButton");
const replayButton = document.getElementById("replayButton");
const soundButton = document.getElementById("soundButton");
const fullscreenButton = document.getElementById("fullscreenButton");

const backgroundMusic = document.getElementById("backgroundMusic");

/*
    My Little Girl:
    3 minutes 39 seconds = 219 seconds
*/
const SONG_DURATION = 219;

const NORMAL_MUSIC_VOLUME = 0.78;
const VIDEO_MUSIC_VOLUME = 0.15;

const DEDICATION_DURATION = 4.8;
const SECTION_DURATION = 1.35;
const FINAL_PHOTO_DURATION = 9;
const ENDING_BUFFER = 2;

const MIN_PHOTO_DURATION = 1.35;
const MAX_PHOTO_DURATION = 3.2;

const MIN_VIDEO_DURATION = 2.5;
const MAX_VIDEO_DURATION = 7;
const CAKE_VIDEO_MAX_DURATION = 10;

let timeline = [];
let currentIndex = 0;
let currentTimeout = null;
let videoCutoffTimeout = null;
let filmIsRunning = false;

let activePhotoLayer = photoLayerOne;
let inactivePhotoLayer = photoLayerTwo;


/* --------------------------------------------------
   INITIALIZE
-------------------------------------------------- */

initialize();

function initialize() {
    buildTimeline();

    const firstPhoto =
        mediaLibrary.photos.birth?.[0] ||
        mediaLibrary.photos.comingHome?.[0] ||
        mediaLibrary.photos.newbornDays?.[0] ||
        mediaLibrary.photos.growingUp?.[0] ||
        mediaLibrary.photos.ending?.[0];

    if (firstPhoto) {
        openingBackground.style.backgroundImage =
            `url("${encodeURI(firstPhoto)}")`;
    }

    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    if (!document.documentElement.requestFullscreen) {
        document.body.classList.add("no-fullscreen");
    }

    console.log("Film timeline:", timeline);
}


/* --------------------------------------------------
   BUILD FILM
-------------------------------------------------- */

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

    const allGrowingVideos = [
        ...(mediaLibrary.videos.growingUp || [])
    ];

    /*
        The final Growing Up video is the cake video.
        Remove it from the regular Growing Up sequence.
    */
    const cakeVideo = allGrowingVideos.pop();

    const endingPhotos =
        mediaLibrary.photos.ending || [];

    const regularPhotoCount =
        birthPhotos.length +
        comingHomePhotos.length +
        newbornPhotos.length +
        growingPhotos.length;

    const regularVideoCount =
        birthVideos.length +
        comingHomeVideos.length +
        allGrowingVideos.length;

    /*
        Reserve time for:
        - dedication
        - four section labels
        - final photo
        - a small ending transition
    */
    const reservedTime =
        DEDICATION_DURATION +
        (SECTION_DURATION * 4) +
        FINAL_PHOTO_DURATION +
        ENDING_BUFFER;

    const usableTime = Math.max(
        1,
        SONG_DURATION - reservedTime
    );

    /*
        Give approximately 63% of the available time
        to photos and 37% to regular videos.

        The cake video receives its own finale time.
    */
    const cakeDuration = cakeVideo
        ? Math.min(CAKE_VIDEO_MAX_DURATION, 8)
        : 0;

    const regularUsableTime = Math.max(
        1,
        usableTime - cakeDuration
    );

    const photoBudget = regularUsableTime * 0.63;
    const videoBudget = regularUsableTime * 0.37;

    const calculatedPhotoDuration =
        regularPhotoCount > 0
            ? photoBudget / regularPhotoCount
            : MIN_PHOTO_DURATION;

    const photoDuration = clamp(
        calculatedPhotoDuration,
        MIN_PHOTO_DURATION,
        MAX_PHOTO_DURATION
    );

    const regularVideoDuration =
        regularVideoCount > 0
            ? clamp(
                videoBudget / regularVideoCount,
                MIN_VIDEO_DURATION,
                MAX_VIDEO_DURATION
            )
            : MIN_VIDEO_DURATION;

    addSection(
        "Birth",
        birthPhotos,
        birthVideos,
        photoDuration,
        regularVideoDuration
    );

    addSection(
        "Coming Home",
        comingHomePhotos,
        comingHomeVideos,
        photoDuration,
        regularVideoDuration
    );

    addSection(
        "Newborn Days",
        newbornPhotos,
        [],
        photoDuration,
        regularVideoDuration
    );

    addSection(
        "Growing Up",
        growingPhotos,
        allGrowingVideos,
        photoDuration,
        regularVideoDuration
    );

    /*
        Finale:
        cake video → final End photo
    */
    if (cakeVideo) {
        timeline.push({
            type: "video",
            src: cakeVideo,
            duration: cakeDuration,
            finale: true
        });
    }

    endingPhotos.forEach((src) => {
        timeline.push({
            type: "image",
            src,
            duration: FINAL_PHOTO_DURATION,
            finalImage: true
        });
    });

    console.log({
        photoDuration,
        regularVideoDuration,
        cakeDuration,
        regularPhotoCount,
        regularVideoCount,
        songDuration: SONG_DURATION
    });
}


function addSection(
    title,
    photos,
    videos,
    photoDuration,
    videoDuration
) {
    if (!photos.length && !videos.length) {
        return;
    }

    timeline.push({
        type: "section",
        title,
        duration: SECTION_DURATION
    });

    const videoPositions = calculateVideoPositions(
        photos.length,
        videos.length
    );

    let videoIndex = 0;

    photos.forEach((photoSrc, photoIndex) => {
        timeline.push({
            type: "image",
            src: photoSrc,
            duration: photoDuration
        });

        while (
            videoIndex < videos.length &&
            videoPositions[videoIndex] === photoIndex
        ) {
            timeline.push({
                type: "video",
                src: videos[videoIndex],
                duration: videoDuration
            });

            videoIndex += 1;
        }
    });

    while (videoIndex < videos.length) {
        timeline.push({
            type: "video",
            src: videos[videoIndex],
            duration: videoDuration
        });

        videoIndex += 1;
    }
}


function calculateVideoPositions(photoCount, videoCount) {
    if (videoCount === 0) {
        return [];
    }

    if (photoCount === 0) {
        return Array(videoCount).fill(0);
    }

    const positions = [];

    for (
        let videoNumber = 1;
        videoNumber <= videoCount;
        videoNumber += 1
    ) {
        const position = Math.min(
            photoCount - 1,
            Math.floor(
                (videoNumber * photoCount) /
                (videoCount + 1)
            )
        );

        positions.push(position);
    }

    return positions;
}


function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}


/* --------------------------------------------------
   EVENT LISTENERS
-------------------------------------------------- */

beginButton.addEventListener("click", beginFilm);
replayButton.addEventListener("click", replayFilm);
soundButton.addEventListener("click", toggleSound);
fullscreenButton.addEventListener("click", toggleFullscreen);

videoLayer.addEventListener("ended", finishVideo);
videoLayer.addEventListener("error", handleVideoError);

backgroundMusic.addEventListener("ended", handleSongEnded);

document.addEventListener(
    "fullscreenchange",
    updateFullscreenButton
);


/* --------------------------------------------------
   START / REPLAY
-------------------------------------------------- */

async function beginFilm() {
    if (filmIsRunning) {
        return;
    }

    resetFilmState();

    filmIsRunning = true;
    currentIndex = 0;

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;
    backgroundMusic.muted = false;

    updateSoundButton();

    try {
        await backgroundMusic.play();
    } catch (error) {
        console.warn(
            "The music could not begin:",
            error
        );
    }

    requestFullscreenSafely();
    switchScreen(openingScreen, filmScreen);

    window.setTimeout(showDedication, 900);
}


function replayFilm() {
    resetFilmState();

    filmIsRunning = true;
    currentIndex = 0;

    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = NORMAL_MUSIC_VOLUME;

    switchScreen(endingScreen, filmScreen);

    backgroundMusic.play().catch((error) => {
        console.warn(
            "The music could not restart:",
            error
        );
    });

    window.setTimeout(showDedication, 900);
}


function resetFilmState() {
    clearAllTimers();
    stopVideo();

    currentIndex = 0;

    dedicationCard.classList.remove("visible");
    sectionLabel.classList.remove("visible");

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


/* --------------------------------------------------
   DEDICATION
-------------------------------------------------- */

function showDedication() {
    dedicationCard.classList.add("visible");

    currentTimeout = window.setTimeout(() => {
        dedicationCard.classList.remove("visible");

        currentTimeout = window.setTimeout(() => {
            playCurrentTimelineItem();
        }, 500);
    }, DEDICATION_DURATION * 1000);
}


/* --------------------------------------------------
   TIMELINE PLAYER
-------------------------------------------------- */

function playCurrentTimelineItem() {
    clearTimeout(currentTimeout);

    const item = timeline[currentIndex];

    if (!item) {
        waitForSongEnding();
        return;
    }

    switch (item.type) {
        case "section":
            showSection(item);
            break;

        case "image":
            showImage(item);
            break;

        case "video":
            showVideo(item);
            break;

        default:
            moveToNextItem();
    }
}


function showSection(item) {
    sectionLabel.textContent = item.title;
    sectionLabel.classList.add("visible");

    currentTimeout = window.setTimeout(() => {
        sectionLabel.classList.remove("visible");
        moveToNextItem();
    }, item.duration * 1000);
}


function showImage(item) {
    stopVideo();
    restoreMusicVolume();

    inactivePhotoLayer.onload = null;
    inactivePhotoLayer.onerror = null;

    inactivePhotoLayer.className = "photo-layer";
    inactivePhotoLayer.src = item.src;

    inactivePhotoLayer.alt = item.finalImage
        ? "Final portrait of Emersyn"
        : "A memory from Emersyn's first year";

    inactivePhotoLayer.onload = () => {
        setBlurredBackground(item.src);
        applyRandomMotion(inactivePhotoLayer);

        inactivePhotoLayer.classList.add("visible");
        activePhotoLayer.classList.remove("visible");

        swapPhotoLayers();

        /*
            If this is the final photo, hold it until
            either its duration finishes or the song ends.
        */
        currentTimeout = window.setTimeout(() => {
            moveToNextItem();
        }, item.duration * 1000);
    };

    inactivePhotoLayer.onerror = () => {
        console.warn(
            "Image could not load:",
            item.src
        );

        moveToNextItem();
    };
}


function showVideo(item) {
    clearTimeout(currentTimeout);
    clearTimeout(videoCutoffTimeout);

    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");

    videoLayer.pause();
    videoLayer.classList.remove("visible");

    videoLayer.src = item.src;
    videoLayer.currentTime = 0;

    videoLayer.muted = backgroundMusic.muted;
    backgroundMusic.volume = VIDEO_MUSIC_VOLUME;

    videoLayer.classList.add("visible");

    videoLayer.play().then(() => {
        videoCutoffTimeout = window.setTimeout(() => {
            finishVideo();
        }, item.duration * 1000);
    }).catch((error) => {
        console.warn(
            "Video could not play:",
            item.src,
            error
        );

        handleVideoError();
    });
}


function finishVideo() {
    clearTimeout(videoCutoffTimeout);

    videoLayer.classList.remove("visible");

    window.setTimeout(() => {
        stopVideo();
        restoreMusicVolume();
        moveToNextItem();
    }, 350);
}


function handleVideoError() {
    clearTimeout(videoCutoffTimeout);

    stopVideo();
    restoreMusicVolume();
    moveToNextItem();
}


function moveToNextItem() {
    clearTimeout(currentTimeout);
    clearTimeout(videoCutoffTimeout);

    currentIndex += 1;
    playCurrentTimelineItem();
}


/* --------------------------------------------------
   ENDING
-------------------------------------------------- */

function waitForSongEnding() {
    /*
        If the visuals finish slightly early,
        keep the final image visible until the song ends.
    */
    if (!backgroundMusic.paused) {
        return;
    }

    finishFilm();
}


function handleSongEnded() {
    if (!filmIsRunning) {
        return;
    }

    finishFilm();
}


function finishFilm() {
    if (!filmIsRunning) {
        return;
    }

    filmIsRunning = false;

    clearAllTimers();
    stopVideo();

    activePhotoLayer.classList.remove("visible");
    inactivePhotoLayer.classList.remove("visible");
    blurredBackground.classList.remove("visible");

    window.setTimeout(() => {
        switchScreen(filmScreen, endingScreen);
    }, 1200);
}


/* --------------------------------------------------
   VIDEO / AUDIO
-------------------------------------------------- */

function stopVideo() {
    clearTimeout(videoCutoffTimeout);

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


function toggleSound() {
    const shouldMute = !backgroundMusic.muted;

    backgroundMusic.muted = shouldMute;
    videoLayer.muted = shouldMute;

    updateSoundButton();
}


function updateSoundButton() {
    soundButton.textContent =
        backgroundMusic.muted
            ? "Sound Off"
            : "Sound On";
}


/* --------------------------------------------------
   PHOTO EFFECTS
-------------------------------------------------- */

function setBlurredBackground(src) {
    blurredBackground.classList.remove("visible");

    window.setTimeout(() => {
        blurredBackground.style.backgroundImage =
            `url("${encodeURI(src)}")`;

        blurredBackground.classList.add("visible");
    }, 80);
}


function applyRandomMotion(photoElement) {
    const motions = [
        "motion-one",
        "motion-two",
        "motion-three",
        "motion-four"
    ];

    const selectedMotion =
        motions[
            Math.floor(
                Math.random() * motions.length
            )
        ];

    photoElement.classList.add(selectedMotion);
}


function swapPhotoLayers() {
    const oldActiveLayer = activePhotoLayer;

    activePhotoLayer = inactivePhotoLayer;
    inactivePhotoLayer = oldActiveLayer;
}


/* --------------------------------------------------
   FULLSCREEN
-------------------------------------------------- */

async function requestFullscreenSafely() {
    try {
        if (
            document.documentElement.requestFullscreen &&
            !document.fullscreenElement
        ) {
            await document.documentElement.requestFullscreen();
        }
    } catch (error) {
        console.info(
            "Fullscreen was unavailable. The film will still fill the browser."
        );
    }
}


async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        console.warn(
            "Fullscreen could not be changed:",
            error
        );
    }
}


function updateFullscreenButton() {
    fullscreenButton.textContent =
        document.fullscreenElement
            ? "Exit Full Screen"
            : "Full Screen";
}


/* --------------------------------------------------
   SCREEN TRANSITIONS
-------------------------------------------------- */

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


function clearAllTimers() {
    clearTimeout(currentTimeout);
    clearTimeout(videoCutoffTimeout);
}